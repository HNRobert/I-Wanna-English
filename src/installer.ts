import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { execCommand } from './utils';

const WIN_X64_URL = 'https://raw.githubusercontent.com/daipeihust/im-select/master/win/out/x64/im-select.exe';
const WIN_X86_URL = 'https://raw.githubusercontent.com/daipeihust/im-select/master/win/out/x86/im-select.exe';

export async function checkAndInstallImSelect(reinstall: boolean = false): Promise<boolean> {
    const platform = process.platform;
    const config = vscode.workspace.getConfiguration('i-wanna-english.autoSwitchInputMethod');

    if (platform === 'darwin') {
        return await handleMacInstallation(config, reinstall);
    } else if (platform === 'win32') {
        return await handleWindowsInstallation(config, reinstall);
    }

    return false;
}

async function handleMacInstallation(config: vscode.WorkspaceConfiguration, reinstall: boolean): Promise<boolean> {
    try {
        // Check if Homebrew is installed
        await execCommand('which brew');
    } catch (error) {
        const response = await vscode.window.showInformationMessage(
            'Homebrew is not installed. Would you like to install it?',
            'Yes', 'No'
        );

        if (response === 'Yes') {
            return await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Installing Homebrew",
                cancellable: false
            }, async (progress) => {
                try {
                    progress.report({ increment: 0, message: "Downloading Homebrew installer..." });
                    await execCommand('/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"');
                    progress.report({ increment: 50, message: "Configuring Homebrew..." });
                    await execCommand('echo \'eval "$(/opt/homebrew/bin/brew shellenv)"\' >> ~/.zprofile');
                    await execCommand('eval "$(/opt/homebrew/bin/brew shellenv)"');
                    progress.report({ increment: 100, message: "Homebrew installation complete." });
                    return true;
                } catch (error) {
                    const retry = await vscode.window.showErrorMessage('Failed to install Homebrew: ' + error + '. You may retry or install Homebrew manually.', 'Retry');
                    if (retry === 'Retry') {
                        return await handleMacInstallation(config, reinstall);
                    }
                    return false;
                }
            });
        } else {
            return false;
        }
    }

    try {
        // Check if im-select is installed
        if (!reinstall) {
            await execCommand('which im-select');
            return true;
        }
    } catch (error) {
        // Continue to install im-select
    }

    const response = await vscode.window.showInformationMessage(
        'im-select is not installed. Would you like to install it via Homebrew?',
        'Yes', 'No'
    );

    if (response === 'Yes') {
        return await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Installing im-select",
            cancellable: false
        }, async (progress) => {
            try {
                progress.report({ increment: 0, message: "Tapping Homebrew repository..." });
                await execCommand('brew tap daipeihust/tap');
                progress.report({ increment: 50, message: "Installing im-select..." });
                await execCommand('brew install im-select');
                await config.update('obtainIMCmd', '/opt/homebrew/bin/im-select', true);
                await config.update('switchIMCmd', '/opt/homebrew/bin/im-select {im}', true);
                progress.report({ increment: 100, message: "Installation complete." });
                return true;
            } catch (error) {
                const retry = await vscode.window.showErrorMessage('Failed to install im-select: ' + error, 'Retry');
                if (retry === 'Retry') {
                    return await handleMacInstallation(config, reinstall);
                }
                return false;
            }
        });
    }

    return false;
}

async function handleWindowsInstallation(config: vscode.WorkspaceConfiguration, reinstall: boolean): Promise<boolean> {
    const appDataPath = process.env.APPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming');
    const imSelectDir = path.join(appDataPath, 'im-select');
    const imSelectPath = path.join(imSelectDir, 'im-select.exe');

    // Check if already installed
    if (fs.existsSync(imSelectPath) && !reinstall) {
        return true;
    }

    const response = await vscode.window.showInformationMessage(
        'im-select is not detected. Would you like to install it?',
        'Yes', 'No'
    );

    if (response === 'Yes') {
        return await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Installing im-select",
            cancellable: false
        }, async (progress) => {
            try {
                // Create directory if it doesn't exist
                if (!fs.existsSync(imSelectDir)) {
                    fs.mkdirSync(imSelectDir, { recursive: true });
                }

                // Determine architecture and download URL
                const is64bit = process.arch === 'x64';
                const downloadUrl = is64bit ? WIN_X64_URL : WIN_X86_URL;

                // Download the file
                progress.report({ increment: 0, message: "Downloading im-select..." });
                await downloadFile(downloadUrl, imSelectPath);

                // Update configuration
                await config.update('obtainIMCmd', imSelectPath, true);
                await config.update('switchIMCmd', `${imSelectPath} {im}`, true);
                progress.report({ increment: 100, message: "Installation complete." });

                return true;
            } catch (error) {
                const retry = await vscode.window.showErrorMessage('Failed to install im-select: ' + error, 'Retry');
                if (retry === 'Retry') {
                    return await handleWindowsInstallation(config, reinstall);
                }
                return false;
            }
        });
    }

    return false;
}

async function downloadFile(url: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        
        const request = https.get(url, (response) => {
            if (response.statusCode === 302 && response.headers.location) {
                // Handle redirect
                return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
            }

            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download: ${response.statusCode} ${response.statusMessage}`));
                return;
            }

            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                resolve();
            });
        });

        request.on('error', (err) => {
            fs.unlink(destPath, () => {});
            reject(err);
        });

        file.on('error', (err) => {
            fs.unlink(destPath, () => {});
            reject(err);
        });
    });
}
