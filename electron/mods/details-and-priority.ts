import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { LocalMod } from '../../shared/types.js';
import { parseLocalMods } from '../data-validation.js';
import { fetchModDetails } from '../gamebanana.js';
import { fetchLatestRelease } from '../github.js';
import type { ModManager } from '../mod-manager.js';
export const detailsAndPriority = {
async getModDetails(this: ModManager, gameBananaId: number): Promise<any> {
        try {
            console.log(`[ModManager] Getting details for gameBananaId: ${gameBananaId}`);
            return await fetchModDetails(gameBananaId);
        } catch (error) {
            console.error(`[ModManager] Error in getModDetails for gameBananaId: ${gameBananaId}`, error);
            return null;
        }
    },
async setModPriority(this: ModManager, modId: string, direction: 'up' | 'down'): Promise<boolean> {
        try {
            const modsFile = await this.getModsFilePath();
            const data = await fs.readFile(modsFile, 'utf-8');
            const mods = parseLocalMods(data);

            // Sort Descending (High Priority First) to match UI
            mods.sort((a, b) => (b.priority || 0) - (a.priority || 0));

            const index = mods.findIndex((m: LocalMod) => m.id === modId);
            if (index === -1) return false;

            // Up = Move towards index 0 (Highest Priority)
            // Down = Move towards index N (Lowest Priority)
            const targetIndex = direction === 'up' ? index - 1 : index + 1;

            if (targetIndex < 0 || targetIndex >= mods.length) return false;

            const currentMod = mods[index];

            // Snapshot old priorities to determine who needs redeploy
            const oldPriorities = new Map(mods.map(m => [m.id, m.priority]));

            // Move in Array
            mods.splice(index, 1);
            mods.splice(targetIndex, 0, currentMod);

            // Reassign priorities based on new array order (Normalization)
            const total = mods.length;
            mods.forEach((m, i) => m.priority = total - i);

            // Redeploy any mod whose priority changed and is enabled
            for (const mod of mods) {
                if (mod.isEnabled && oldPriorities.get(mod.id) !== mod.priority) {
                    await this.undeployMod(mod);
                    await this.deployMod(mod);
                }
            }

            // Save
            await fs.writeFile(modsFile, JSON.stringify(mods, null, 2));
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    },
async installUE4SS(this: ModManager): Promise<unknown> {
        try {
            console.log('Installing UE4SS...');
            const settings = await this.getSettings();
            if (!settings.gamePath) return { success: false, message: 'Game path not set.' };

            const { binariesDir } = this.resolveGamePaths(settings.gamePath);
            await fs.mkdir(binariesDir, { recursive: true });

            const downloadUrl = await fetchLatestRelease('UE4SS-RE', 'RE-UE4SS');
            if (!downloadUrl) return { success: false, message: 'Failed to fetch UE4SS release.' };

            const tempDir = app.getPath('temp');
            const fileName = 'ue4ss_latest.zip';
            const tempFile = path.join(tempDir, fileName);

            // Use Download Manager if available
            if (this.downloadManager) {
                return new Promise((resolve) => {
                    const dlId = this.downloadManager!.startDownload(downloadUrl, tempDir, fileName, {
                        type: 'tool',
                        name: 'UE4SS'
                    });

                    const cleanup = () => {
                        this.downloadManager!.removeListener('download-completed', onComplete);
                        this.downloadManager!.removeListener('download-failed', onFailed);
                        this.downloadManager!.removeListener('download-cancelled', onFailed);
                    };

                    const onComplete = async (completedId: string) => {
                        if (completedId === dlId) {
                            cleanup();
                            const result = await this.finalizeUE4SSInstall(tempFile, binariesDir);
                            resolve(result);
                        }
                    };
                    const onFailed = (failedId: string, message: string) => {
                        if (failedId !== dlId) return;
                        cleanup();
                        resolve({ success: false, message });
                    };
                    this.downloadManager!.on('download-completed', onComplete);
                    this.downloadManager!.on('download-failed', onFailed);
                    this.downloadManager!.on('download-cancelled', onFailed);
                });
            } else {
                // Fallback
                await this.downloadFile(downloadUrl, tempFile);
                return await this.finalizeUE4SSInstall(tempFile, binariesDir);
            }

        } catch (e) {
            console.error('UE4SS Install failed', e);
            return { success: false, message: (e as Error).message };
        }
    },
};
