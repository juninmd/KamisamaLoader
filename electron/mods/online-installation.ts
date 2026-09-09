import type { ModChangelog } from '../../shared/types.js';
import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { LocalMod,OnlineMod } from '../../shared/types.js';
import { parseLocalMods } from '../data-validation.js';
import { fetchModProfile } from '../gamebanana.js';
import type { ModManager } from '../mod-manager.js';
export const onlineInstallation = {
async startOnlineInstall(this: ModManager, mod: OnlineMod): Promise<{ success: boolean; message: string; downloadId?: undefined; } | { success: boolean; message: string; downloadId: string; }> {
        try {
            console.log(`Installing mod: ${mod.gameBananaId}`);

            // 1. Fetch Profile to get download URL and missing details
            const profile = await fetchModProfile(mod.gameBananaId);
            if (!profile || !profile._aFiles || profile._aFiles.length === 0) {
                return { success: false, message: 'No download files found for this mod.' };
            }

            // Fallback for missing details
            if (!mod.name || mod.name === 'Unknown') mod.name = profile._sName;
            if (!mod.author || mod.author === 'Unknown') mod.author = profile._aSubmitter?._sName || 'Unknown';
            if (!mod.version || mod.version === '1.0') mod.version = profile._sVersion || '1.0';
            if (!mod.description) mod.description = profile._sText || '';
            if (!mod.iconUrl && profile._aPreviewMedia?._aImages?.[0]) {
                const img = profile._aPreviewMedia._aImages[0];
                mod.iconUrl = `${img._sBaseUrl}/${img._sFile220}`;
            }

            const latestFile = profile._aFiles[0];
            const downloadUrl = latestFile._sDownloadUrl;
            const installed = (await this.getInstalledMods()).find(item => item.gameBananaId === mod.gameBananaId);
            const installedId = installed?.installedFileId || (!installed?.hasUpdate ? installed?.latestFileId : undefined);
            if (installed && installedId !== undefined && installedId === latestFile._idRow) return { success: true, message: 'Este mod já está atualizado.' };

            // 2. Start Download Manager Flow
            if (this.downloadManager) {
                const tempDir = app.getPath('temp');
                const fileName = `${mod.gameBananaId}.zip`;

                // Start tracking
                const downloadId = this.downloadManager.startDownload(downloadUrl, tempDir, fileName, {
                    type: 'install',
                    mod: { ...mod, latestFileId: latestFile._idRow } // Pass full mod context
                });

                const cleanup = () => {
                    this.onlineRequests.delete(mod.gameBananaId);
                    this.downloadManager!.removeListener('download-completed', onComplete);
                    this.downloadManager!.removeListener('download-failed', onFailed);
                        this.downloadManager!.removeListener('download-cancelled', onFailed);
                };

                // Listen for completion ONE-OFF for this specific download ID (to trigger install)
                // Note: Better design might be a global listener in ModManager ctor, but this works for now
                // IF we don't want to leak listeners, we should be careful.
                // However, ModManager exists for the lifecycle of the app.

                const onComplete = async (dlId: string) => {
                    if (dlId === downloadId) {
                        const tempFile = path.join(tempDir, fileName);
                        const modDestDir = path.join(this.modsDir, `${mod.name.replace(/[^a-z0-9]/gi, '_')}_${mod.gameBananaId}`);
                        let stagingDir = '';
                        try {
                            stagingDir = await fs.mkdtemp(path.join(tempDir, 'kamisama-install-'));
                            await this.extractZip(tempFile, stagingDir);
                            await this.installPackage(stagingDir, {
                                name: mod.name, author: mod.author, version: mod.version,
                                description: mod.description, gameBananaId: mod.gameBananaId,
                                iconUrl: mod.iconUrl, installedFileId: latestFile._idRow,
                                latestFileId: latestFile._idRow
                            }, modDestDir);
                            this.downloadManager!.completeInstallation(downloadId);
                        } catch (err) {
                            console.error("Install post-download failed", err);
                            this.downloadManager!.failDownload(downloadId, `Installation failed: ${(err as Error).message}`);
                        } finally {
                            if (stagingDir) await fs.rm(stagingDir, { recursive: true, force: true }).catch(console.error);
                            await fs.unlink(tempFile).catch(() => undefined);
                            cleanup();
                        }
                    }
                };

                const onFailed = (dlId: string) => {
                    if (dlId === downloadId) cleanup();
                };

                this.downloadManager.on('download-completed', onComplete);
                this.downloadManager.on('download-failed', onFailed);
                this.downloadManager.on('download-cancelled', onFailed);

                return { success: true, message: 'Download started.', downloadId };
            } else {
                return { success: false, message: 'Download Manager not initialized.' };
            }

        } catch (e) {
            console.error(e);
            return { success: false, message: `Installation failed: ${(e as Error).message}` };
        }
    },
async getModChangelog(this: ModManager, id: string): Promise<ModChangelog | null> {
        try {
            const gameBananaId = Number(id);
            if (!isNaN(gameBananaId) && gameBananaId > 0) {
                console.log(`[ModManager] Getting changelog for gameBananaId: ${gameBananaId}`);
                return await import('../gamebanana.js').then(m => m.fetchModUpdates(gameBananaId));
            }

            console.log(`[ModManager] Getting changelog for modId: ${id}`);
            const modsFile = await this.getModsFilePath();
            let mods: LocalMod[] = [];
            try { mods = parseLocalMods(await fs.readFile(modsFile, 'utf-8')); } catch { return null; }

            const mod = mods.find(m => m.id === id);
            if (!mod || !mod.gameBananaId) {
                console.error(`[ModManager] Mod not found or no gameBananaId for modId: ${id}`);
                return null;
            }

            console.log(`[ModManager] Found gameBananaId: ${mod.gameBananaId} for modId: ${id}`);
            return await import('../gamebanana.js').then(m => m.fetchModUpdates(mod.gameBananaId!));
        } catch (error) {
            console.error(`[ModManager] Error in getModChangelog for id: ${id}`, error);
            return null;
        }
    },
};
