import AdmZip from 'adm-zip';
import fs from 'fs/promises';
import path from 'path';
import type { ModManager } from '../mod-manager.js';
export const ue4ssAndSync = {
async finalizeUE4SSInstall(this: ModManager, zipPath: string, destDir: string): Promise<{ success: boolean; message: string; }> {
        try {
            // Extract to temp folder first to check structure
            const extractTemp = path.join(path.dirname(zipPath), 'ue4ss_extract');
            // Clean previous extract
            try { await fs.rm(extractTemp, { recursive: true, force: true }); } catch { }

            await this.extractZip(zipPath, extractTemp);

            // Check if it has a root folder
            const files = await fs.readdir(extractTemp);
            let rootDir = extractTemp;
            if (files.length === 1 && (await fs.stat(path.join(extractTemp, files[0]))).isDirectory()) {
                rootDir = path.join(extractTemp, files[0]);
            }

            // Move contents to binariesDir
            await fs.cp(rootDir, destDir, { recursive: true, force: true });

            // Clean up
            await fs.unlink(zipPath);
            await fs.rm(extractTemp, { recursive: true, force: true });

            return { success: true, message: 'UE4SS installed successfully.' };
        } catch (e) {
            console.error(e);
            return { success: false, message: 'Failed to extract/install UE4SS.' };
        }
    },
async exportCloudSync(this: ModManager, destZipPath: string): Promise<{ success: boolean; message: string; }> {
        try {
            const zip = new AdmZip();
            const profilesPath = await this.getProfilesFilePath();
            const modsPath = await this.getModsFilePath();
            const settingsPath = this.settingsFile;

            try { zip.addLocalFile(profilesPath); } catch (e) { console.warn('Could not add profiles.json to export, skipping. Error:', e); }
            try { zip.addLocalFile(modsPath); } catch (e) { console.warn('Could not add mods.json to export, skipping. Error:', e); }
            try { zip.addLocalFile(settingsPath); } catch (e) { console.warn('Could not add settings.json to export, skipping. Error:', e); }

            return new Promise<{ success: boolean; message: string }>((resolve) => {
                zip.writeZip(destZipPath, (error) => {
                    if (error) resolve({ success: false, message: error.message });
                    else resolve({ success: true, message: 'Exported successfully.' });
                });
            });
        } catch (error) {
            console.error('Export failed:', error);
            return { success: false, message: (error as Error).message };
        }
    },
async importCloudSync(this: ModManager, zipPath: string): Promise<{ success: boolean; message: string; }> {
        try {
            const zip = new AdmZip(zipPath);
            await this.ensureModsDir();

            const zipEntries = zip.getEntries();
            const allowedFiles = ['mods.json', 'profiles.json', 'settings.json'];

            // Extract specific files safely to their respective directories
            for (const entry of zipEntries) {
                if (allowedFiles.includes(entry.name) && !entry.isDirectory) {
                    const content = zip.readAsText(entry);
                    if (!content) continue;

                    let targetPath = '';
                    if (entry.name === 'mods.json') {
                        targetPath = await this.getModsFilePath();
                    } else if (entry.name === 'profiles.json') {
                        targetPath = await this.getProfilesFilePath();
                    } else if (entry.name === 'settings.json') {
                        targetPath = this.settingsFile;
                    }

                    if (targetPath) {
                         await fs.writeFile(targetPath, content, 'utf-8');
                    }
                }
            }

            // Sync priorities just in case
            await this.fixPriorities();

            return { success: true, message: 'Imported successfully. Please restart or refresh the app to see changes.' };
        } catch (error) {
            console.error('Import failed:', error);
            return { success: false, message: (error as Error).message };
        }
    },
};
