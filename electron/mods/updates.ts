import { app,net } from 'electron';
import { createWriteStream } from 'fs';
import fs from 'fs/promises';
import pLimit from 'p-limit';
import path from 'path';
import { LocalMod } from '../../shared/types.js';
import { parseLocalMods } from '../data-validation.js';
import type { ModManager } from '../mod-manager.js';
export const updateOperations = {
downloadFile(this: ModManager, url: string, destPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = net.request(url);
            request.on('response', (response) => {
                if (response.statusCode !== 200 && response.statusCode !== 302) {
                    reject(new Error(`Download failed with status code: ${response.statusCode}`));
                    return;
                }

                // Handle redirect if needed (GameBanana often redirects)
                if (response.statusCode === 302 && response.headers['location']) {
                    const redirectUrl = Array.isArray(response.headers['location']) ? response.headers['location'][0] : response.headers['location'];
                    this.downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
                    return;
                }

                const fileStream = createWriteStream(destPath);
                response.on('data', (chunk) => fileStream.write(chunk));
                response.on('end', () => {
                    fileStream.end(resolve);
                });
                response.on('error', (err: any) => {
                    fileStream.close();
                    fs.unlink(destPath).catch(() => { });
                    reject(err);
                });
            });
            request.on('error', reject);
            request.end();
        });
    },
async withMutation<T>(this: ModManager, work: () => Promise<T>): Promise<T> {
        return this.operationLock.run(work);
    },
async updateMod(this: ModManager, modId: string): Promise<boolean> {
        const existing = this.activeUpdates.get(modId);
        if (existing) return existing;
        const pending = this.performUpdate(modId).finally(() => this.activeUpdates.delete(modId));
        this.activeUpdates.set(modId, pending);
        return pending;
    },
async performUpdate(this: ModManager, modId: string): Promise<boolean> {
        this.updateErrors.delete(modId);
        try {
            const modsFile = await this.getModsFilePath();
            let mods: LocalMod[] = [];
            try { mods = parseLocalMods(await fs.readFile(modsFile, 'utf-8')); } catch { return false; }

            const mod = mods.find((m: LocalMod) => m.id === modId);
            if (!mod) return false;
            if (mod.hasUpdate === false || (mod.installedFileId && mod.installedFileId === mod.latestFileId)) return true;
            if (!mod.latestFileUrl) return false;

            const tempDir = app.getPath('temp');
            // Check if we have download manager
            if (this.downloadManager) {
                return new Promise<boolean>((resolve) => {
                    const fileName = `update_${mod.id}.zip`;
                    const downloadUrl = mod.latestFileUrl!;
                    const id = this.downloadManager!.startDownload(downloadUrl, tempDir, fileName, { type: 'update', modId });

                    const cleanup = () => {
                        this.downloadManager!.removeListener('download-completed', onComplete);
                        this.downloadManager!.removeListener('download-failed', onFailed);
                        this.downloadManager!.removeListener('download-cancelled', onFailed);
                    };

                    const onComplete = async (dlId: string) => {
                        if (dlId === id) {
                            // Proceed with install
                            const tempFile = path.join(tempDir, fileName);
                            const success = await this.finalizeUpdate(mod, tempFile, mods, modsFile);
                            cleanup();
                            if (success) this.downloadManager!.completeInstallation(id);
                            else this.downloadManager!.failDownload(id, this.updateErrors.get(modId) || 'Não foi possível aplicar a atualização.');
                            resolve(success);
                        }
                    };

                    const onFailed = (dlId: string) => {
                        if (dlId !== id) return;
                        cleanup();
                        resolve(false);
                    };

                    this.downloadManager!.on('download-completed', onComplete);
                    this.downloadManager!.on('download-failed', onFailed);
                    this.downloadManager!.on('download-cancelled', onFailed);
                });
            } else {
                // Fallback / Legacy (keep or remove? Let's remove to force usage)
                return false;
            }

        } catch (e) {
            console.error('Update failed', e);
            return false;
        }
    },
async updateAllMods(this: ModManager, modIds: string[]): Promise<{ successCount: number; failCount: number; results: { id: string; success: boolean; }[]; }> {
        console.log(`[ModManager] Updating ${modIds.length} mods...`);
        const limit = pLimit(3); // Limit concurrency to 3 downloads at a time
        const results: { id: string, success: boolean }[] = [];
        let successCount = 0;
        let failCount = 0;

        const promises = [...new Set(modIds)].map(id => limit(async () => {
            try {
                // updateMod returns Promise<boolean> (mostly)
                const result = await this.updateMod(id);
                const success = !!result;
                results.push({ id, success });
                if (success) successCount++;
                else failCount++;
            } catch (e) {
                console.error(`Failed to update mod ${id}`, e);
                results.push({ id, success: false });
                failCount++;
            }
        }));

        await Promise.all(promises);

        return { successCount, failCount, results };
    },
};
