import { shell } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { LocalMod,Settings } from '../../shared/types.js';
import { parseLocalMods,parseSettings } from '../data-validation.js';
import type { ModManager } from '../mod-manager.js';
export const catalogOperations = {
async openModsDirectory(this: ModManager): Promise<boolean> {
        try {
            await this.ensureModsDir();
            await shell.openPath(this.modsDir);
            return true;
        } catch (e) {
            console.error('Failed to open mods directory', e);
            return false;
        }
    },
async ensureModsDir(this: ModManager): Promise<string | null> {
        try {
            await fs.mkdir(this.modsDir, { recursive: true });
            return this.modsDir;
        } catch (error) {
            console.error('Failed to create Mods directory:', error);
            return null;
        }
    },
async getModsFilePath(this: ModManager): Promise<string> {
        await this.ensureModsDir();
        return path.join(this.modsDir, 'mods.json');
    },
async getSettings(this: ModManager): Promise<Settings> {
        try {
            await this.ensureModsDir();
            const data = await fs.readFile(this.settingsFile, 'utf-8');
            const settings = parseSettings(data);
            if (settings.modDownloadPath) {
                this.modsDir = settings.modDownloadPath;
                this.settingsFile = path.join(this.modsDir, 'settings.json');
            }
            return settings;
        } catch {
            return { gamePath: '' };
        }
    },
async saveSettings(this: ModManager, settings: Settings): Promise<boolean> {
        try {
            if (settings.modDownloadPath && settings.modDownloadPath !== this.modsDir) {
                // Changing mod directory
                const newDir = settings.modDownloadPath;
                await fs.mkdir(newDir, { recursive: true });

                // Copy settings file to new dir so it persists
                const newSettingsFile = path.join(newDir, 'settings.json');
                await fs.writeFile(newSettingsFile, JSON.stringify(settings, null, 2));

                this.modsDir = newDir;
                this.settingsFile = newSettingsFile;
            } else {
                await this.ensureModsDir();
                await fs.writeFile(this.settingsFile, JSON.stringify(settings, null, 2));
            }
            return true;
        } catch (error) {
            console.error('Failed to save settings:', error);
            return false;
        }
    },
isPosixLikePath(this: ModManager, value: string): boolean {
        return value.includes('/') && !value.includes('\\');
    },
joinPath(this: ModManager, base: string, ...segments: string[]): string {
        return this.isPosixLikePath(base)
            ? path.posix.join(base, ...segments)
            : path.join(base, ...segments);
    },
relativePath(this: ModManager, from: string, to: string): string {
        if (this.isPosixLikePath(from) || this.isPosixLikePath(to)) {
            return path.posix.relative(from.replace(/\\/g, '/'), to.replace(/\\/g, '/'));
        }
        return path.relative(from, to);
    },
isInsidePath(this: ModManager, target: string, container: string): boolean {
        const normalize = (value: string) => {
            const unified = value.replace(/\\/g, '/').replace(/\/+$/, '');
            return process.platform === 'win32' ? unified.toLowerCase() : unified;
        };

        const normalizedTarget = normalize(target);
        const normalizedContainer = normalize(container);

        return normalizedTarget === normalizedContainer || normalizedTarget.startsWith(`${normalizedContainer}/`);
    },
async getInstalledMods(this: ModManager): Promise<LocalMod[]> {
        try {
            const modsFile = await this.getModsFilePath();
            const data = await fs.readFile(modsFile, 'utf-8');
            const mods = parseLocalMods(data);

            // Check for 0 bytes size and fix aggressively
            let needsSave = false;
            for (const mod of mods) {
                if (!mod.fileSize || mod.fileSize === 0) {
                    if (mod.folderPath) {
                        mod.fileSize = await this.calculateFolderSize(mod.folderPath);
                        if (mod.fileSize > 0) needsSave = true;
                    }
                }
            }
            if (needsSave) {
                await fs.writeFile(modsFile, JSON.stringify(mods, null, 2));
            }

            // Sort by priority Descending (Highest Priority First)
            return mods.sort((a, b) => (b.priority || 0) - (a.priority || 0));
        } catch {
            return [];
        }
    },
};
