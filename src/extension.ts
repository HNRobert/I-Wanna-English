import * as vscode from 'vscode';
import { execCommand, validateImSelect } from './utils';
import { testImSelectConfiguration } from './test-utils';
import { checkAndInstallImSelect } from './installer';

let previousIM: string | null = null;
let statusBarItem: vscode.StatusBarItem;

async function updateStatusBar(enabled: boolean) {
  statusBarItem.text = enabled ? '$(check) IWE' : '$(x) IWE';
  statusBarItem.tooltip = `I Wanna English: ${
    enabled ? 'Enabled' : 'Disabled'
  }`;

  if (enabled) {
    const testResult = await testImSelectConfiguration();
    if (!testResult.includes('✅')) {
      vscode.window.showWarningMessage(
        `I Wanna English: Input method configuration test failed.\n${testResult}`
      );
    }
  }
}

async function toggleExtension() {
  const config = vscode.workspace.getConfiguration('i-wanna-english');
  const currentEnabled = config.get<boolean>('autoSwitch.enable');
  const newEnabled = !currentEnabled;

  // If disabling IWE and disableIM is configured, switch to that input method
  if (!newEnabled) {
    let disableIM = config.get<string>('disableIM');

    // Skip if disabled (no change when disabled)
    if (disableIM === 'disable' || !disableIM) {
      // Just update the config and status bar without switching IM
      await config.update('autoSwitch.enable', newEnabled, true);
      await updateStatusBar(newEnabled);
      return;
    }

    // If custom is selected, use the custom input method
    if (disableIM === 'custom') {
      disableIM = config.get<string>('disableIMCustom') || '';
    }

    if (disableIM) {
      try {
        const switchIMCmd = config.get<string>('switchIMCmd');
        if (switchIMCmd) {
          await execCommand(switchIMCmd.replace('{im}', disableIM));
        }
      } catch (error) {
        console.error('Failed to switch to disable input method:', error);
      }
    }
  }

  await config.update('autoSwitch.enable', newEnabled, true);
  await updateStatusBar(newEnabled);
}

async function manuallyInstallImSelect() {
  const installed = await checkAndInstallImSelect(true);
  if (installed) {
    vscode.window.showInformationMessage('im-select installed successfully.');
  } else {
    vscode.window.showErrorMessage('Failed to install im-select.');
  }
}

async function autoDetectAndConfigure() {
  const config = vscode.workspace.getConfiguration('i-wanna-english');
  const platform = process.platform;
  let detectedIM: string | null = null;

  if (platform === 'win32') {
    const possibleIMs = ['1033', '2057', '4105', '3081'];
    for (const im of possibleIMs) {
      try {
        await execCommand(`im-select ${im}`);
        detectedIM = im;
        break;
      } catch (error) {
        // Continue to the next possible input method
      }
    }
  } else if (platform === 'darwin') {
    const possibleIMs = [
      'com.apple.keylayout.ABC',
      'com.apple.keylayout.British',
      'com.apple.keylayout.US',
      'com.apple.keylayout.Canadian',
      'com.apple.keylayout.Australian',
      'com.apple.keylayout.Dvorak',
      'com.apple.keylayout.Colemak',
      'com.apple.keylayout.Irish',
      'com.apple.keylayout.USInternational-PC',
      'com.apple.keylayout.British-PC',
    ];
    for (const im of possibleIMs) {
      try {
        await execCommand(`im-select ${im}`);
        detectedIM = im;
        break;
      } catch (error) {
        // Continue to the next possible input method
      }
    }
  }

  if (detectedIM) {
    await config.update(
      'defaultIM',
      detectedIM,
      vscode.ConfigurationTarget.Global
    );
    vscode.window.showInformationMessage(
      `Detected and configured default input method: ${detectedIM}`
    );
  } else {
    vscode.window.showErrorMessage('Failed to detect a suitable input method.');
  }
}

export async function activate(context: vscode.ExtensionContext) {
  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    -1
  );
  statusBarItem.command = 'i-wanna-english.toggle';
  context.subscriptions.push(statusBarItem);

  // Register toggle command
  let toggleCommand = vscode.commands.registerCommand(
    'i-wanna-english.toggle',
    toggleExtension
  );
  context.subscriptions.push(toggleCommand);

  // Register manually install command
  let manuallyInstallCommand = vscode.commands.registerCommand(
    'i-wanna-english.manuallyInstall',
    manuallyInstallImSelect
  );
  context.subscriptions.push(manuallyInstallCommand);

  // Register auto detect and configure command
  let autoDetectCommand = vscode.commands.registerCommand(
    'i-wanna-english.autoDetect',
    autoDetectAndConfigure
  );
  context.subscriptions.push(autoDetectCommand);

  // Initialize status bar
  const config = vscode.workspace.getConfiguration('i-wanna-english');
  const enabled = config.get<boolean>('autoSwitch.enable');

  // Set defaultIM based on platform if not already set or if set to auto
  const defaultIM = config.get<string>('defaultIM');
  if (!defaultIM || defaultIM === 'auto') {
    await autoDetectAndConfigure();
  }

  await updateStatusBar(enabled ?? true);
  statusBarItem.show();

  // Show spinner while checking and installing im-select
  statusBarItem.text = '$(sync~spin) IWE';
  const installed = await checkAndInstallImSelect();
  if (installed) {
    await updateStatusBar(enabled ?? true);
  } else {
    statusBarItem.text = '$(x) IWE';
    statusBarItem.tooltip = 'I Wanna English: Installation failed';
  }

  // Watch configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (e.affectsConfiguration('i-wanna-english.autoSwitch.enable')) {
        const newEnabled = config.get<boolean>('autoSwitch.enable');
        await updateStatusBar(newEnabled ?? true);
      }
    })
  );

  const obtainIMCmd = config.get<string>('obtainIMCmd');

  // Validate im-select installation
  if (!(await validateImSelect(obtainIMCmd || ''))) {
    const message =
      'im-select is not properly installed or configured. The extension may not work correctly.';
    const openSettings = 'Open Settings';
    const manuallyInstall = 'Manually install';

    vscode.window
      .showWarningMessage(message, openSettings, manuallyInstall)
      .then(async (selection) => {
        if (selection === openSettings) {
          vscode.commands.executeCommand(
            'workbench.action.openSettings',
            'i-wanna-english'
          );
        } else if (selection === manuallyInstall) {
          await manuallyInstallImSelect();
        }
      });
  }

  let disposable = vscode.window.onDidChangeTextEditorSelection(async (e) => {
    const config = vscode.workspace.getConfiguration('i-wanna-english');
    if (!config.get<boolean>('autoSwitch.enable')) {
      return;
    }

    try {
      const obtainIMCmd = config.get<string>('obtainIMCmd');
      const switchIMCmd = config.get<string>('switchIMCmd');
      let defaultIM = config.get<string>('defaultIM');

      // If auto is selected, auto-detect the input method
      if (defaultIM === 'auto') {
        await autoDetectAndConfigure();
        defaultIM = config.get<string>('defaultIM');
        // If still auto after detection, skip
        if (defaultIM === 'auto') {
          return;
        }
      }

      // If custom is selected, use the custom input method
      if (defaultIM === 'custom') {
        defaultIM = config.get<string>('defaultIMCustom') || '';
      }

      if (!obtainIMCmd || !switchIMCmd || !defaultIM) {
        return;
      }

      const currentIM = await execCommand(obtainIMCmd);
      if (currentIM !== defaultIM) {
        previousIM = currentIM;
        await execCommand(switchIMCmd.replace('{im}', defaultIM));
      }
    } catch (error) {
      console.error('Failed to switch input method:', error);
    }
  });

  // Register test command
  let testCommand = vscode.commands.registerCommand(
    'i-wanna-english.testImSelect',
    async () => {
      const result = await testImSelectConfiguration();
      await vscode.window.showInformationMessage(result);
    }
  );

  context.subscriptions.push(disposable, testCommand);
}

export function deactivate() {}
