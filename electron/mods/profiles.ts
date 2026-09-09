import fs from 'fs/promises';
import path from 'path';
import { LocalMod,Profile } from '../../shared/types.js';
import { parseLocalMods,parseProfiles } from '../data-validation.js';
import type { ModManager } from '../mod-manager.js';
export const profileOperations = {
async getProfilesFilePath(this: ModManager): Promise<string> {
        await this.ensureModsDir();
        return path.join(this.modsDir, 'profiles.json');
    },
async getOnlineModsCachePath(this: ModManager): Promise<string> {
        await this.ensureModsDir();
        return path.join(this.modsDir, 'online-mods-cache.json');
    },
async getProfiles(this: ModManager): Promise<Profile[]> {
        try {
            const file = await this.getProfilesFilePath();
            const data = await fs.readFile(file, 'utf-8');
            return parseProfiles(data);
        } catch {
            return [];
        }
    },
async createProfile(this: ModManager, name: string): Promise<{ success: boolean; profile: Profile; message?: undefined; } | { success: boolean; message: any; profile?: undefined; }> {
        try {
            const mods = await this.getInstalledMods();
            const enabledModIds = mods.filter((m: LocalMod) => m.isEnabled).map((m: LocalMod) => m.id);

            const profiles: Profile[] = await this.getProfiles();
            const newProfile: Profile = {
                id: Date.now().toString(),
                name,
                modIds: enabledModIds
            };

            profiles.push(newProfile);

            const file = await this.getProfilesFilePath();
            await fs.writeFile(file, JSON.stringify(profiles, null, 2));
            return { success: true, profile: newProfile };
        } catch (e: any) {
            console.error('Failed to create profile:', e);
            return { success: false, message: e.message || 'Unknown error' };
        }
    },
async deleteProfile(this: ModManager, id: string): Promise<boolean> {
        try {
            let profiles: Profile[] = await this.getProfiles();
            profiles = profiles.filter((p: Profile) => p.id !== id);
            const file = await this.getProfilesFilePath();
            await fs.writeFile(file, JSON.stringify(profiles, null, 2));
            return true;
        } catch (e) {
            console.error('Failed to delete profile', e);
            return false;
        }
    },
async loadProfile(this: ModManager, id: string): Promise<{ success: boolean; message: string; } | { success: boolean; message?: undefined; }> {
        try {
            const profiles: Profile[] = await this.getProfiles();
            const profile = profiles.find((p: Profile) => p.id === id);
            if (!profile) return { success: false, message: 'Profile not found' };

            const modsFile = await this.getModsFilePath();
            let mods: LocalMod[] = [];
            try { mods = parseLocalMods(await fs.readFile(modsFile, 'utf-8')); } catch { }

            const targetEnabledIds = new Set(profile.modIds);
            const toDisable: LocalMod[] = [];
            const toEnable: LocalMod[] = [];

            for (const mod of mods) {
                const shouldBeEnabled = targetEnabledIds.has(mod.id);
                if (mod.isEnabled && !shouldBeEnabled) {
                    toDisable.push(mod);
                } else if (!mod.isEnabled && shouldBeEnabled) {
                    toEnable.push(mod);
                }
                mod.isEnabled = shouldBeEnabled;
            }

            console.log(`Loading Profile: Disabling ${toDisable.length}, Enabling ${toEnable.length}`);

            for (const mod of toDisable) await this.undeployMod(mod);
            for (const mod of toEnable) await this.deployMod(mod);

            await fs.writeFile(modsFile, JSON.stringify(mods, null, 2));

            const settings = await this.getSettings();
            await this.saveSettings({ ...settings, activeProfileId: id });

            return { success: true };

        } catch (e) {
            console.error('Failed to load profile', e);
            return { success: false, message: (e as Error).message };
        }
    },
async syncActiveProfile(this: ModManager, modId: string, isEnabled: boolean): Promise<void> {
        try {
            const settings = await this.getSettings();
            if (!settings.activeProfileId) return;

            const profiles: Profile[] = await this.getProfiles();
            const profileIndex = profiles.findIndex((p: Profile) => p.id === settings.activeProfileId);

            if (profileIndex !== -1) {
                const profile = profiles[profileIndex];
                if (isEnabled) {
                    if (!profile.modIds.includes(modId)) profile.modIds.push(modId);
                } else {
                    profile.modIds = profile.modIds.filter((id: string) => id !== modId);
                }

                const file = await this.getProfilesFilePath();
                await fs.writeFile(file, JSON.stringify(profiles, null, 2));
            }
        } catch (e) {
            console.error('Failed to sync active profile', e);
        }
    },
};
