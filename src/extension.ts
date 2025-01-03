import * as vscode from 'vscode';
import { execCommand, validateImSelect } from './utils';
import { testImSelectConfiguration } from './test-utils';
import { checkAndInstallImSelect } from './installer';

let previousIM: string | null = null;
let statusBarItem: vscode.StatusBarItem;

async function updateStatusBar(enabled: boolean) {
    statusBarItem.text = enabled ? "$(check) IWE" : "$(x) IWE";
    statusBarItem.tooltip = `I Wanna English: ${enabled ? 'Enabled' : 'Disabled'}`;
    
    if (enabled) {
        const testResult = await testImSelectConfiguration();
        if (!testResult.includes('✅')) {
            vscode.window.showWarningMessage('I Wanna English: Input method configuration test failed.');
        }
    }
}

async function toggleExtension() {
    const config = vscode.workspace.getConfiguration('i-wanna-english.autoSwitchInputMethod');
    const currentEnabled = config.get<boolean>('enable');
    await config.update('enable', !currentEnabled, true);
    await updateStatusBar(!currentEnabled);
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
    const config = vscode.workspace.getConfiguration('i-wanna-english.autoSwitchInputMethod');
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
            'com.apple.keylayout.British-PC'
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
        await config.update('defaultIM', detectedIM, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`Detected and configured default input method: ${detectedIM}`);
    } else {
        vscode.window.showErrorMessage('Failed to detect a suitable input method.');
    }
}

export async function activate(context: vscode.ExtensionContext) {
    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -1);
    statusBarItem.command = 'i-wanna-english.toggle';
    context.subscriptions.push(statusBarItem);

    // Register toggle command
    let toggleCommand = vscode.commands.registerCommand('i-wanna-english.toggle', toggleExtension);
    context.subscriptions.push(toggleCommand);

    // Register manually install command
    let manuallyInstallCommand = vscode.commands.registerCommand('i-wanna-english.manuallyInstall', manuallyInstallImSelect);
    context.subscriptions.push(manuallyInstallCommand);

    // Register auto detect and configure command
    let autoDetectCommand = vscode.commands.registerCommand('i-wanna-english.autoDetect', autoDetectAndConfigure);
    context.subscriptions.push(autoDetectCommand);

    // Initialize status bar
    const config = vscode.workspace.getConfiguration('i-wanna-english.autoSwitchInputMethod');
    const enabled = config.get<boolean>('enable');

    // Set defaultIM based on platform if not already set
    const defaultIM = config.get<string>('defaultIM');
    if (!defaultIM) {
        await autoDetectAndConfigure();
    }

    await updateStatusBar(enabled ?? true);
    statusBarItem.show();

    // Show spinner while checking and installing im-select
    statusBarItem.text = "$(sync~spin) IWE";
    const installed = await checkAndInstallImSelect();
    if (installed) {
        await updateStatusBar(enabled ?? true);
    } else {
        statusBarItem.text = "$(x) IWE";
        statusBarItem.tooltip = "I Wanna English: Installation failed";
    }

    // Watch configuration changes
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(async e => {
        if (e.affectsConfiguration('i-wanna-english.autoSwitchInputMethod.enable')) {
            const newEnabled = config.get<boolean>('enable');
            await updateStatusBar(newEnabled ?? true);
        }
    }));

    const obtainIMCmd = config.get<string>('obtainIMCmd');
    
    // Validate im-select installation
    if (!(await validateImSelect(obtainIMCmd || ''))) {
        const message = 'im-select is not properly installed or configured. The extension may not work correctly.';
        const openSettings = 'Open Settings';
        const manuallyInstall = 'Manually install';
        
        vscode.window.showWarningMessage(message, openSettings, manuallyInstall).then(async selection => {
            if (selection === openSettings) {
                vscode.commands.executeCommand('workbench.action.openSettings', 'i-wanna-english.autoSwitchInputMethod');
            } else if (selection === manuallyInstall) {
                await manuallyInstallImSelect();
            }
        });
    }

    let disposable = vscode.window.onDidChangeTextEditorSelection(async (e) => {
        const config = vscode.workspace.getConfiguration('i-wanna-english.autoSwitchInputMethod');
        if (!config.get<boolean>('enable')) {
            return;
        }

        try {
            const obtainIMCmd = config.get<string>('obtainIMCmd');
            const switchIMCmd = config.get<string>('switchIMCmd');
            const defaultIM = config.get<string>('defaultIM');

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
    let testCommand = vscode.commands.registerCommand('i-wanna-english.testImSelect', async () => {
        const result = await testImSelectConfiguration();
        await vscode.window.showInformationMessage(result);
    });

    context.subscriptions.push(disposable, testCommand);
}

export function deactivate() {}
