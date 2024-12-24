import * as vscode from 'vscode';
import { execCommand, validateImSelect } from './utils';
import { testImSelectConfiguration } from './test-utils';

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

export async function activate(context: vscode.ExtensionContext) {
    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -1);
    statusBarItem.command = 'i-wanna-english.toggle';
    context.subscriptions.push(statusBarItem);

    // Register toggle command
    let toggleCommand = vscode.commands.registerCommand('i-wanna-english.toggle', toggleExtension);
    context.subscriptions.push(toggleCommand);

    // Initialize status bar
    const config = vscode.workspace.getConfiguration('i-wanna-english.autoSwitchInputMethod');
    const enabled = config.get<boolean>('enable');
    await updateStatusBar(enabled ?? true);
    statusBarItem.show();

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
        
        vscode.window.showWarningMessage(message, openSettings).then(selection => {
            if (selection === openSettings) {
                vscode.commands.executeCommand('workbench.action.openSettings', 'i-wanna-english.autoSwitchInputMethod');
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
