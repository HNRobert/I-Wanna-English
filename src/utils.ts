import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export async function execCommand(command: string): Promise<string> {
  try {
    const { stdout } = await execAsync(command);
    return stdout.trim();
  } catch (error) {
    throw new Error(`Command execution failed: ${error}`);
  }
}

async function checkCommandExists(command: string): Promise<boolean> {
  try {
    // First check if it's an absolute path
    if (path.isAbsolute(command)) {
      await fs.promises.access(command, fs.constants.X_OK);
      return true;
    }

    // If not an absolute path, check if command exists in PATH
    const platform = process.platform;
    const checkCmd =
      platform === 'win32' ? `where ${command}` : `which ${command}`;

    await execCommand(checkCmd);
    return true;
  } catch (error) {
    return false;
  }
}

export async function validateImSelect(command: string): Promise<boolean> {
  try {
    if (!command) {
      return false;
    }

    // Check if command exists (either as file path or in PATH)
    const commandExists = await checkCommandExists(command);
    if (!commandExists) {
      console.error(`Command not found: ${command}`);
      return false;
    }

    console.log(`Executing command: ${command}`);
    // Try to execute im-select
    const result = await execCommand(command);
    return result.length > 0;
  } catch (error) {
    console.error(`Failed to validate im-select: ${error}`);
    return false;
  }
}
