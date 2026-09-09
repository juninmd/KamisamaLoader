import fs from 'fs/promises';
import pLimit from 'p-limit';
import { LocalMod } from '../../shared/types.js';
import { parseLocalMods } from '../data-validation.js';
import { fetchModProfile } from '../gamebanana.js';
import type { ModManager } from '../mod-manager.js';
export const libraryActions = {
async uninstallMod(this: ModManager, modId: string): Promise<{ success: boolean; message: string; }> {
        try {
            const modsFile = await this.getModsFilePath();
            let mods: LocalMod[] = [];
            try { mods = parseLocalMods(await fs.readFile(modsFile, 'utf-8')); } catch { }

            const modIndex = mods.findIndex((m: LocalMod) => m.id === modId);
            if (modIndex === -1) {
                return { success: false, message: 'Mod not found.' };
            }

            const mod = mods[modIndex];

            // 1. Undeploy mod from game files
            await this.undeployMod(mod);

            // 2. Delete mod folder from Mods directory
            if (mod.folderPath) {
                await fs.rm(mod.folderPath, { recursive: true, force: true });
            }

            // 3. Remove mod from mods.json
            mods.splice(modIndex, 1);
            await fs.writeFile(modsFile, JSON.stringify(mods, null, 2));

            return { success: true, message: 'Mod uninstalled successfully.' };
        } catch (e) {
            console.error(e);
            return { success: false, message: `Uninstallation failed: ${(e as Error).message}` };
        }
    },
async toggleMod(this: ModManager, modId: string, isEnabled: boolean): Promise<{ success: boolean; conflict: string | null; } | { success: boolean; conflict?: undefined; }> {
        try {
            const modsFile = await this.getModsFilePath();
            const data = await fs.readFile(modsFile, 'utf-8');
            const mods = parseLocalMods(data);
            const modIndex = mods.findIndex((m: LocalMod) => m.id === modId);

            if (modIndex !== -1) {
                const targetMod = mods[modIndex];

                // Advanced Conflict Check (Only when enabling)
                let conflictMessage = null;
                if (isEnabled) {
                    const conflictingMods = mods.filter((m: LocalMod) =>
                        m.isEnabled &&
                        m.id !== modId &&
                        m.category && targetMod.category &&
                        m.category === targetMod.category &&
                        // Ignore generic categories that usually don't conflict
                        !['UI', 'Misc', 'Sounds', 'Music', 'Other'].includes(targetMod.category!)
                    );

                    if (conflictingMods.length > 0) {
                        const names = conflictingMods.map(m => m.name).join(', ');
                        conflictMessage = `Conflict Warning: "${targetMod.name}" shares the category "${targetMod.category}" with ${names}. The mod with the highest priority will take precedence in-game.`;
                    }
                }

                // Update state
                mods[modIndex].isEnabled = isEnabled;

                // Deploy or Undeploy
                if (isEnabled) {
                    await this.deployMod(mods[modIndex]);
                } else {
                    await this.undeployMod(mods[modIndex]);
                }

                await fs.writeFile(modsFile, JSON.stringify(mods, null, 2));

                // Sync with active profile
                await this.syncActiveProfile(modId, isEnabled);

                return { success: true, conflict: conflictMessage };
            }
        } catch (e) {
            console.error(e);
        }
        return { success: false };
    },
async checkForUpdates(this: ModManager): Promise<string[]> {
        const modsFile = await this.getModsFilePath();
        let mods: LocalMod[] = [];
        try { mods = parseLocalMods(await fs.readFile(modsFile, 'utf-8')); } catch { return []; }

        const updates: string[] = [];
        const limit = pLimit(5); // Concurrency limit

        const checkPromises = mods.map((mod) => limit(async () => {
            if (!mod.gameBananaId) return;

            try {
                // Fetch Profile
                const data = await fetchModProfile(mod.gameBananaId);
                if (data) {
                    const latestFile = data._aFiles?.[0]; // Usually the first one is main/latest
                    if (latestFile) {
                        // Check version or ID
                        const isNewer = ((mod.installedFileId || mod.latestFileId) && latestFile._idRow > (mod.installedFileId || mod.latestFileId!)) ||
                            (!mod.installedFileId && !mod.latestFileId && data._sVersion !== mod.version) ||
                            (mod.hasUpdate && mod.latestFileId === latestFile._idRow);

                        if (isNewer) {
                            mod.hasUpdate = true;
                            mod.latestVersion = data._sVersion;
                            mod.latestFileId = latestFile._idRow;
                            mod.latestFileUrl = latestFile._sDownloadUrl;
                            updates.push(mod.id);
                        } else {
                            mod.hasUpdate = false;
                        }
                    }
                }
            } catch (e) { console.error(e); }
        }));

        await Promise.all(checkPromises);

        await fs.writeFile(modsFile, JSON.stringify(mods, null, 2));
        return updates;
    },
};
