import * as vscode from 'vscode';
import { execCommand, validateImSelect } from './utils';

export async function testImSelectConfiguration(): Promise<string> {
    const config = vscode.workspace.getConfiguration('i-wanna-english.autoSwitchInputMethod');
    const obtainIMCmd = config.get<string>('obtainIMCmd');
    const switchIMCmd = config.get<string>('switchIMCmd');
    const defaultIM = config.get<string>('defaultIM');

    if (!obtainIMCmd || !switchIMCmd || !defaultIM) {
        return '❌ Configuration incomplete: Please configure all required settings.';
    }

    try {
        // Test 1: Check if im-select is installed and executable
        if (!(await validateImSelect(obtainIMCmd))) {
            return '❌ im-select is not properly installed or not executable.';
        }

        // Test 2: Try to get current input method
        const currentIM = await execCommand(obtainIMCmd);
        if (!currentIM) {
            return '❌ Failed to get current input method.';
        }

        // Test 3: Try to switch input method
        await execCommand(switchIMCmd.replace('{im}', defaultIM));
        const newIM = await execCommand(obtainIMCmd);
        if (newIM !== defaultIM) {
            return '❌ Failed to switch input method.';
        }

        return '✅ All tests passed successfully!';
    } catch (error) {
        return `❌ Test failed: ${error instanceof Error ? error.message : String(error)}`;
    }
}
