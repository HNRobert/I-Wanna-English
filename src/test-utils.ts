import * as vscode from 'vscode';
import { execCommand, validateImSelect } from './utils';

export async function testImSelectConfiguration(): Promise<string> {
  const config = vscode.workspace.getConfiguration('i-wanna-english');
  const obtainIMCmd = config.get<string>('obtainIMCmd');
  const switchIMCmd = config.get<string>('switchIMCmd');
  let defaultIM = config.get<string>('defaultIM');

  // If auto is selected, we can't test without auto-detection
  if (defaultIM === 'auto') {
    return '⚠️ Default IM is set to auto-detect. Please run auto-detect first or select a specific input method for testing.';
  }

  // If custom is selected, use the custom input method
  if (defaultIM === 'custom') {
    defaultIM = config.get<string>('defaultIMCustom') || '';
  }

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
    return `❌ Test failed: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
}
