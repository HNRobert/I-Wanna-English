import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';

const execAsync = promisify(exec);

export async function execCommand(command: string): Promise<string> {
    try {
        const { stdout } = await execAsync(command);
        return stdout.trim();
    } catch (error) {
        throw new Error(`Command execution failed: ${error}`);
    }
}

export async function validateImSelect(path: string): Promise<boolean> {
    try {
        if (!path) {
            return false;
        }
        // Check if file exists and is executable
        await fs.promises.access(path, fs.constants.X_OK);
        // Try to execute im-select
        const result = await execCommand(path);
        return result.length > 0;
    } catch (error) {
        return false;
    }
}
