import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { LocalMod,OnlineMod } from '../../shared/types.js';
import { parseLocalMods,parseOnlineModsCache } from '../data-validation.js';
import { FileTransaction,reconcilePackage } from '../file-transaction.js';
import type { ModManager } from '../mod-manager.js';
import { assertManagedDirectory, assertDeploymentPath } from './path-safety.js';
export const updateCompletion = {
async finalizeUpdate(this: ModManager, mod: LocalMod, tempFile: string, _mods: LocalMod[], modsFile: string): Promise<boolean> {
        let staging = '';
        try {
            staging = await fs.mkdtemp(path.join(app.getPath('temp'), 'kamisama-update-'));
            await this.extractZip(tempFile, staging);
            return await this.withMutation(async () => {
                const mods = parseLocalMods(await fs.readFile(modsFile, 'utf-8'));
                const current = mods.find(item => item.id === mod.id);
                if (!current) return false;
                assertManagedDirectory(this, current.folderPath);
                const tx = new FileTransaction(new Set(mods.filter(item => item.id !== current.id)
                    .flatMap(item => item.deployedFiles || [])));
                const next = { ...current };
                try {
                    await reconcilePackage(staging, current.folderPath, tx);
                    next.lastInstall = { ...tx.counts };
                    if (next.isEnabled && !await this.deployMod(next, tx)) throw new Error('Deployment failed');
                    const keep = new Set(next.deployedFiles || []);
                    for (const file of current.deployedFiles || []) {
                        if (!keep.has(file) && !mods.some(other => other.id !== current.id && other.deployedFiles?.includes(file))) {
                            await assertDeploymentPath(this, file);
                            await tx.remove(file);
                        }
                    }
                    next.version = mod.latestVersion || mod.version;
                    next.installedFileId = mod.latestFileId;
                    next.hasUpdate = false;
                    next.fileSize = await this.calculateFolderSize(next.folderPath);
                    mods[mods.indexOf(current)] = next;
                    const catalog = path.join(staging, 'catalog.json');
                    const serialized = JSON.stringify(mods, null, 2);
                    parseLocalMods(serialized);
                    await fs.writeFile(catalog, serialized);
                    await tx.replace(catalog, modsFile);
                    await tx.commit();
                    return true;
                } catch (error) {
                    await tx.rollback();
                    this.updateErrors.set(mod.id, (error as Error).message);
                    console.error('Update rolled back', error);
                    return false;
                }
            });
        } catch (error) {
            this.updateErrors.set(mod.id, (error as Error).message);
            console.error('Update failed', error);
            return false;
        } finally {
            if (staging) await fs.rm(staging, { recursive: true, force: true }).catch(console.error);
            await fs.unlink(tempFile).catch(() => undefined);
        }
    },
async searchOnlineMods(this: ModManager, page: number, search: string = ''): Promise<OnlineMod[]> {
        const { searchBySection } = await import('../gamebanana.js');
        return await searchBySection({ page, search });
    },
async searchBySection(this: ModManager, options: any): Promise<OnlineMod[]> {
        // Options usually come from frontend and are typed there, but here we can't easily enforce strict interface
        // without importing SearchOptions from gamebanana which might be circular or complex.
        // We will leave it as any for flexible IPC but documented.
        const { searchBySection } = await import('../gamebanana.js');
        return await searchBySection(options);
    },
async fetchCategories(this: ModManager, gameId: number = 21179): Promise<any[]> {
        const { fetchCategories } = await import('../gamebanana.js');
        return await fetchCategories(gameId);
    },
async fetchNewMods(this: ModManager, page: number = 1): Promise<OnlineMod[]> {
        const { fetchNewMods } = await import('../gamebanana.js');
        return await fetchNewMods(page);
    },
async fetchFeaturedMods(this: ModManager): Promise<OnlineMod[]> {
        const { fetchFeaturedMods } = await import('../gamebanana.js');
        return await fetchFeaturedMods();
    },
async getAllOnlineMods(this: ModManager, forceRefresh = false): Promise<OnlineMod[]> {
        const cacheFile = await this.getOnlineModsCachePath();
        const CACHE_DURATION = 60 * 60 * 1000; // 1 Hour

        // Try reading cache first
        if (!forceRefresh) {
            try {
                const data = await fs.readFile(cacheFile, 'utf-8');
                const cache = parseOnlineModsCache(data);
                if (Date.now() - cache.timestamp < CACHE_DURATION) {
                    console.log('[Cache] Returning cached online mods');
                    return cache.mods;
                }
            } catch {
                // Cache miss or invalid, ignore
            }
        }

        console.log('[API] Fetching all online mods from GameBanana...');
        const { fetchAllMods } = await import('../gamebanana.js');
        const mods = await fetchAllMods(this.gameId);

        if (mods && mods.length > 0) {
            try {
                await fs.writeFile(cacheFile, JSON.stringify({
                    timestamp: Date.now(),
                    mods
                }));
                console.log('[Cache] Saved online mods cache');
            } catch (e) {
                console.error('[Cache] Failed to save cache:', e);
            }
        }

        return mods;
    },
};
