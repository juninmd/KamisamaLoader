import path from 'path';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import { execFile } from 'child_process';
import { app, net, shell } from 'electron';
import AdmZip from 'adm-zip';
import pLimit from 'p-limit';
import { fetchModProfile, searchOnlineMods, Mod as OnlineMod, getModChangelog, fetchModDetails } from './gamebanana.js';
import { fetchLatestRelease } from './github.js';

import { DownloadManager } from './download-manager.js';

export interface LocalMod {
    id: string;
    name: string;
    author: string;
    version: string;
    description: string;
    isEnabled: boolean;
    folderPath: string;
    priority: number;
    fileSize: number;
    gameBananaId?: number;
    latestVersion?: string;
    latestFileId?: number;
    latestFileUrl?: string;
    hasUpdate?: boolean;
    iconUrl?: string;
    deployedFiles?: string[];
    ue4ssModName?: string;
    category?: string;
}

export class ModManager {
    private modsDir: string;
    private settingsFile: string;
    private downloadManager: DownloadManager | null = null;
    private gameId = 21179; // Dragon Ball Sparking Zero


    constructor(downloadManager?: DownloadManager) {
        if (downloadManager) this.downloadManager = downloadManager;
        this.modsDir = path.join(path.dirname(app.getPath('exe')), 'Mods');
        this.settingsFile = path.join(this.modsDir, 'settings.json');
        if (!app.isPackaged) {
            this.modsDir = path.join(__dirname, '../../Mods');
            this.settingsFile = path.join(this.modsDir, 'settings.json');
        }
    }

    private async getProfilesFilePath() {
        await this.ensureModsDir();
        return path.join(this.modsDir, 'profiles.json');
    }

    private async getOnlineModsCachePath() {
        await this.ensureModsDir();
        return path.join(this.modsDir, 'online-mods-cache.json');
    }

    async getProfiles() {
        try {
            const file = await this.getProfilesFilePath();
            const data = await fs.readFile(file, 'utf-8');
            return JSON.parse(data);
        } catch {
            return [];
        }
    }

    async createProfile(name: string) {
        try {
            const mods = await this.getInstalledMods();
            const enabledModIds = mods.filter((m: LocalMod) => m.isEnabled).map((m: LocalMod) => m.id);

            const profiles = await this.getProfiles();
            const newProfile = {
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
    }

    async deleteProfile(id: string) {
        try {
            let profiles = await this.getProfiles();
            profiles = profiles.filter((p: any) => p.id !== id);
            const file = await this.getProfilesFilePath();
            await fs.writeFile(file, JSON.stringify(profiles, null, 2));
            return true;
        } catch { return false; }
    }

    async loadProfile(id: string) {
        try {
            const profiles = await this.getProfiles();
            const profile = profiles.find((p: any) => p.id === id);
            if (!profile) return { success: false, message: 'Profile not found' };

            const modsFile = await this.getModsFilePath();
            let mods: LocalMod[] = [];
            try { mods = JSON.parse(await fs.readFile(modsFile, 'utf-8')); } catch { }

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
    }

    private async syncActiveProfile(modId: string, isEnabled: boolean) {
        try {
            const settings = await this.getSettings();
            if (!settings.activeProfileId) return;

            const profiles = await this.getProfiles();
            const profileIndex = profiles.findIndex((p: any) => p.id === settings.activeProfileId);

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
    }



    async openModsDirectory() {
        try {
            await this.ensureModsDir();
            await shell.openPath(this.modsDir);
            return true;
        } catch (e) {
            console.error('Failed to open mods directory', e);
            return false;
        }
    }

    async ensureModsDir() {
        try {
            await fs.mkdir(this.modsDir, { recursive: true });
            return this.modsDir;
        } catch (error) {
            console.error('Failed to create Mods directory:', error);
            return null;
        }
    }

    async getModsFilePath() {
        await this.ensureModsDir();
        return path.join(this.modsDir, 'mods.json');
    }

    async getSettings(): Promise<{ gamePath: string; modDownloadPath?: string; backgroundImage?: string; activeProfileId?: string; launchArgs?: string; backgroundOpacity?: number }> {
        try {
            await this.ensureModsDir();
            const data = await fs.readFile(this.settingsFile, 'utf-8');
            const settings = JSON.parse(data);
            if (settings.modDownloadPath) {
                this.modsDir = settings.modDownloadPath;
                this.settingsFile = path.join(this.modsDir, 'settings.json');
            }
            return settings;
        } catch (error) {
            return { gamePath: '' };
        }
    }

    async saveSettings(settings: { gamePath: string; modDownloadPath?: string; backgroundImage?: string; activeProfileId?: string; launchArgs?: string; backgroundOpacity?: number }) {
        try {
            if (settings.modDownloadPath && settings.modDownloadPath !== this.modsDir) {
                // Changing mod directory
                const oldDir = this.modsDir;
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
    }

    async getInstalledMods(): Promise<LocalMod[]> {
        try {
            const modsFile = await this.getModsFilePath();
            const data = await fs.readFile(modsFile, 'utf-8');
            const mods: LocalMod[] = JSON.parse(data);

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
        } catch (error) {
            return [];
        }
    }

    async calculateFolderSize(dirPath: string): Promise<number> {
        let size = 0;
        try {
            const files = await fs.readdir(dirPath);
            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const stats = await fs.stat(filePath);
                if (stats.isDirectory()) {
                    size += await this.calculateFolderSize(filePath);
                } else {
                    size += stats.size;
                }
            }
        } catch (e) {
            // console.error('Error calculating size', e); 
        }
        return size;
    }

    /**
     * Ensures all installed mods have unique, sequential priorities.
     * Preserves existing order where possible.
     */
    async fixPriorities() {
        try {
            const modsFile = await this.getModsFilePath();
            let mods: LocalMod[] = [];
            try { mods = JSON.parse(await fs.readFile(modsFile, 'utf-8')); } catch { return; }

            // Sort by current priority desc (Highest first)
            // If priorities are equal, use name as tie-breaker for deterministic order
            mods.sort((a, b) => {
                const pDiff = (b.priority || 0) - (a.priority || 0);
                if (pDiff !== 0) return pDiff;
                return a.name.localeCompare(b.name);
            });

            let changed = false;
            // Re-assign priorities: Length -> 1
            const total = mods.length;
            for (let i = 0; i < total; i++) {
                const targetPriority = total - i;
                if (mods[i].priority !== targetPriority) {
                    mods[i].priority = targetPriority;
                    changed = true;
                }
            }

            if (changed) {
                console.log('[ModManager] Fixed/Normalized mod priorities.');

                // We must redeploy enabled mods because filenames depend on priority
                const enabledMods = mods.filter(m => m.isEnabled);
                if (enabledMods.length > 0) {
                     console.log(`[ModManager] Redeploying ${enabledMods.length} mods due to priority fix...`);
                     for (const mod of enabledMods) {
                         await this.undeployMod(mod);
                         await this.deployMod(mod);
                     }
                }

                // Save updated priorities and deployed paths
                await fs.writeFile(modsFile, JSON.stringify(mods, null, 2));
            }
        } catch (e) {
            console.error('Failed to fix priorities', e);
        }
    }

    private resolveGamePaths(gamePath: string) {
        let root = gamePath;
        // If file, get dir
        if (path.extname(root) === '.exe') {
            root = path.dirname(root);
        }

        // If Binaries/Win64, go up
        if (root.toLowerCase().endsWith(path.join('binaries', 'win64'))) {
            root = path.resolve(root, '../../../../');
            // SparkingZERO/Binaries/Win64 -> SparkingZERO/Binaries -> SparkingZERO -> Root?
            // Actually: GameRoot/SparkingZERO/Binaries/Win64/Exe
            // So ../../../ to get to GameRoot
            // Let's rely on finding "SparkingZERO" folder.
        }

        // Try to find the Content/Paks directory relative to root
        // Assumption: Root is where 'SparkingZERO' folder is, OR Root IS 'SparkingZERO' folder.
        // Standard Steam: steamapps/common/DRAGON BALL Sparking! ZERO/
        // Contains: SparkingZERO (folder), Engine (folder), etc.

        const paksDir = path.join(root, 'SparkingZERO', 'Content', 'Paks', '~mods');
        const logicModsDir = path.join(root, 'SparkingZERO', 'Content', 'Paks', 'LogicMods');
        const binariesDir = path.join(root, 'SparkingZERO', 'Binaries', 'Win64');

        return { paksDir, logicModsDir, binariesDir };
    }

    private async deployFile(src: string, dest: string): Promise<boolean> {
        try {
            await fs.mkdir(path.dirname(dest), { recursive: true });

            // Remove destination if it exists (to avoid error when relinking)
            // This ensures we don't error out, but we also don't wipe the parent directory.
            try { await fs.unlink(dest); } catch { }

            // NON-DESTRUCTIVE DEPLOYMENT STRATEGY:
            // 1. Try hardlink first (fast, saves space, changes mirror instantly if supported).
            // 2. Fallback to copy if cross-drive or restricted.
            // The original mod file in the 'Mods' directory is never moved or deleted by this process.
            try {
                await fs.link(src, dest);
                return true;
            } catch (linkError: any) {
                // If cross-device (EXDEV) or operation not permitted (EPERM), fall back to copy
                if (linkError.code === 'EXDEV' || linkError.code === 'EPERM') {
                    try {
                        console.log(`[Deploy] Linking failed, falling back to copy for: ${path.basename(src)}`);
                        await fs.copyFile(src, dest);
                        return true;
                    } catch (copyError) {
                        console.error(`Failed to copy file ${src} to ${dest}`, copyError);
                        return false;
                    }
                }
                throw linkError;
            }
        } catch (error: any) {
            console.error(`Failed to deploy file ${src} to ${dest}`, error);
            return false;
        }
    }

    private async updateUE4SSModsTxt(binariesDir: string, modName: string, enabled: boolean) {
        const modsTxtPath = path.join(binariesDir, 'Mods', 'mods.txt');
        try {
            await fs.mkdir(path.dirname(modsTxtPath), { recursive: true });
            let content = '';
            try {
                content = await fs.readFile(modsTxtPath, 'utf-8');
            } catch {
                // File might not exist yet
            }

            const lines = content.split(/\r?\n/);
            let found = false;
            const newLines = lines.map(line => {
                const cleanLine = line.trim();
                if (!cleanLine) return line;

                // Split by : or =
                const parts = cleanLine.split(/[:=]/);
                if (parts.length >= 2) {
                    const key = parts[0].trim();
                    if (key.toLowerCase() === modName.toLowerCase()) {
                        found = true;
                        return `${modName} : ${enabled ? '1' : '0'}`;
                    }
                }
                return line;
            });

            if (!found) {
                newLines.push(`${modName} : ${enabled ? '1' : '0'}`);
            }

            await fs.writeFile(modsTxtPath, newLines.join('\n'));
        } catch (e) {
            console.error('Failed to update mods.txt', e);
        }
    }

    private async getAllFiles(dir: string, fileList: string[] = []) {
        const files = await fs.readdir(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = await fs.stat(filePath);
            if (stat.isDirectory()) {
                await this.getAllFiles(filePath, fileList);
            } else {
                fileList.push(filePath);
            }
        }
        return fileList;
    }

    private async deployModFiles(mod: LocalMod, paksDir: string, logicModsDir: string, binariesDir: string): Promise<{ deployedFiles: string[], ue4ssModName: string | null }> {
        const deployedFiles: string[] = [];
        let ue4ssModName: string | null = null;

        try {
            const files = await this.getAllFiles(mod.folderPath);
            const ue4ssDir = path.join(mod.folderPath, 'ue4ss');
            let isUe4ss = false;
            try { isUe4ss = (await fs.stat(ue4ssDir)).isDirectory(); } catch { }

            const logicModsSrcDir = path.join(mod.folderPath, 'LogicMods');
            let isLogicMod = false;
            try { isLogicMod = (await fs.stat(logicModsSrcDir)).isDirectory(); } catch { }

            for (const src of files) {
                // If it is inside ue4ss dir
                if (isUe4ss && src.startsWith(ue4ssDir)) {
                    const relativePath = path.relative(ue4ssDir, src);
                    const dest = path.join(binariesDir, relativePath);

                    // Try to identify ModName from "Mods/ModName/..."
                    // relativePath matches "Mods\ModName\..." on Windows
                    const parts = relativePath.split(path.sep);
                    if (parts[0] === 'Mods' && parts.length >= 2) {
                        ue4ssModName = parts[1];
                    }

                    if (await this.deployFile(src, dest)) {
                        deployedFiles.push(dest);
                    }
                    continue;
                }

                // If it is inside LogicMods dir
                if (isLogicMod && src.startsWith(logicModsSrcDir)) {
                    const relativePath = path.relative(logicModsSrcDir, src);
                    const dest = path.join(logicModsDir, relativePath);
                    if (await this.deployFile(src, dest)) {
                        deployedFiles.push(dest);
                    }
                    continue;
                }

                const ext = path.extname(src).toLowerCase();
                const filename = path.basename(src);

                // Deploy .pak, .sig, .utoc, .ucas
                if (['.pak', '.sig', '.utoc', '.ucas'].includes(ext)) {
                    // Priority prefix: 001_ModName.pak
                    const priority = (mod.priority || 0).toString().padStart(3, '0');
                    const destFilename = `${priority}_${filename}`;
                    const dest = path.join(paksDir, destFilename);

                    if (await this.deployFile(src, dest)) {
                        deployedFiles.push(dest);
                    }
                }
            }
        } catch (e) {
            console.error('Error in deployModFiles internal loop', e);
        }

        return { deployedFiles, ue4ssModName };
    }

    async deployMod(mod: LocalMod) {
        console.log(`Deploying mod (Non-destructive): ${mod.name}`);
        const settings = await this.getSettings();
        if (!settings.gamePath) {
            console.error('Game path not set');
            return false;
        }

        const { paksDir, logicModsDir, binariesDir } = this.resolveGamePaths(settings.gamePath);

        try {
            // Ensure ~mods exists
            await fs.mkdir(paksDir, { recursive: true });

            const { deployedFiles, ue4ssModName } = await this.deployModFiles(mod, paksDir, logicModsDir, binariesDir);

            if (ue4ssModName) {
                await this.updateUE4SSModsTxt(binariesDir, ue4ssModName, true);
                mod.ue4ssModName = ue4ssModName; // Save for undeploy
            }

            mod.deployedFiles = deployedFiles;
            return true;
        } catch (e) {
            console.error('Deployment failed', e);
            // Cleanup partial deployment could go here
            return false;
        }
    }

    async undeployMod(mod: LocalMod) {
        console.log(`Undeploying mod: ${mod.name}`);

        // Handle UE4SS disable
        if (mod.ue4ssModName) {
            try {
                const settings = await this.getSettings();
                if (settings.gamePath) {
                    const { binariesDir } = this.resolveGamePaths(settings.gamePath);
                    await this.updateUE4SSModsTxt(binariesDir, mod.ue4ssModName, false);
                }
            } catch (e) { console.error('Failed to disable UE4SS mod in mods.txt', e); }
        }

        if (!mod.deployedFiles || !Array.isArray(mod.deployedFiles)) {
            return true;
        }

        try {
            for (const file of mod.deployedFiles) {
                try {
                    await fs.unlink(file);
                } catch (e) {
                    console.warn(`Failed to delete file: ${file}`, e);
                }
            }
            mod.deployedFiles = [];
            return true;
        } catch (e) {
            console.error('Undeployment failed', e);
            return false;
        }
    }

    async installMod(filePath: string) {
        try {
            await this.ensureModsDir();
            const fileName = path.basename(filePath);
            const modName = path.parse(fileName).name;
            const modDestDir = path.join(this.modsDir, modName);

            // Check if zip
            if (filePath.endsWith('.zip')) {
                const zip = new AdmZip(filePath);
                zip.extractAllTo(modDestDir, true);
            } else {
                // Copy file directly (e.g. .pak)
                await fs.mkdir(modDestDir, { recursive: true });
                await fs.copyFile(filePath, path.join(modDestDir, fileName));
            }

            // Update mods.json
            const modsFile = await this.getModsFilePath();
            let mods: LocalMod[] = [];
            try { mods = JSON.parse(await fs.readFile(modsFile, 'utf-8')); } catch { }

            // Calculate new priority (highest + 1)
            const maxPriority = mods.reduce((max: number, m: LocalMod) => Math.max(max, m.priority || 0), 0);
            const newPriority = maxPriority + 1;

            // Check if exists
            const existingIdx = mods.findIndex((m: LocalMod) => m.name === modName);
            const size = await this.calculateFolderSize(modDestDir);

            const newMod: LocalMod = {
                id: existingIdx !== -1 ? mods[existingIdx].id : Date.now().toString(),
                name: modName,
                author: 'Local',
                version: '1.0',
                description: 'Locally installed mod',
                isEnabled: true,
                folderPath: modDestDir,
                priority: newPriority,
                fileSize: size
            };

            if (existingIdx !== -1) mods[existingIdx] = { ...mods[existingIdx], ...newMod };
            else mods.push(newMod);

            await fs.writeFile(modsFile, JSON.stringify(mods, null, 2));

            await this.deployMod(newMod);

            return { success: true, message: 'Mod installed successfully' };
        } catch (e) {
            console.error(e);
            return { success: false, message: `Installation failed: ${(e as Error).message}` };
        }
    }

    async uninstallMod(modId: string) {
        try {
            const modsFile = await this.getModsFilePath();
            let mods: LocalMod[] = [];
            try { mods = JSON.parse(await fs.readFile(modsFile, 'utf-8')); } catch { }

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
    }

    async toggleMod(modId: string, isEnabled: boolean) {
        try {
            const modsFile = await this.getModsFilePath();
            const data = await fs.readFile(modsFile, 'utf-8');
            const mods: LocalMod[] = JSON.parse(data);
            const modIndex = mods.findIndex((m: LocalMod) => m.id === modId);

            if (modIndex !== -1) {
                const targetMod = mods[modIndex];

                // Conflict Check (Only when enabling)
                let conflictMessage = null;
                if (isEnabled) {
                    const conflictingMod = mods.find((m: LocalMod) =>
                        m.isEnabled &&
                        m.id !== modId &&
                        m.category && targetMod.category &&
                        m.category === targetMod.category &&
                        // Ignore generic categories
                        !['UI', 'Misc', 'Sounds', 'Music', 'Other'].includes(targetMod.category!)
                    );

                    if (conflictingMod) {
                        conflictMessage = `Warning: This mod conflicts with "${conflictingMod.name}" (Same Category: ${targetMod.category}). Higher priority mod will take precedence.`;
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
    }

    async checkForUpdates() {
        const modsFile = await this.getModsFilePath();
        let mods: LocalMod[] = [];
        try { mods = JSON.parse(await fs.readFile(modsFile, 'utf-8')); } catch { return []; }

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
                        const isNewer = (mod.latestFileId && latestFile._idRow > mod.latestFileId) ||
                            (!mod.latestFileId && data._sVersion !== mod.version);

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
    }

    private downloadFile(url: string, destPath: string): Promise<void> {
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
                    fileStream.end();
                    resolve();
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
    }

    async updateMod(modId: string) {
        try {
            const modsFile = await this.getModsFilePath();
            let mods: LocalMod[] = [];
            try { mods = JSON.parse(await fs.readFile(modsFile, 'utf-8')); } catch { return false; }

            const mod = mods.find((m: LocalMod) => m.id === modId);
            if (!mod || !mod.latestFileUrl) return false;

            const tempDir = app.getPath('temp');
            // Check if we have download manager
            if (this.downloadManager) {
                return new Promise((resolve) => {
                    const fileName = `update_${mod.id}.zip`;
                    const downloadUrl = mod.latestFileUrl!;
                    const id = this.downloadManager!.startDownload(downloadUrl, tempDir, fileName, { type: 'update', modId });

                    const onComplete = async (dlId: string) => {
                        if (dlId === id) {
                            // Proceed with install
                            const tempFile = path.join(tempDir, fileName);
                            const success = await this.finalizeUpdate(mod, tempFile, mods, modsFile);
                            this.downloadManager!.removeListener('download-completed', onComplete);
                            resolve(success);
                        }
                    };

                    this.downloadManager!.on('download-completed', onComplete);
                    // Handle error too... simplify for now or assume UI handles it
                });
            } else {
                // Fallback / Legacy (keep or remove? Let's remove to force usage)
                return false;
            }

        } catch (e) {
            console.error('Update failed', e);
            return false;
        }
    }

    // Helper to finalize update after download
    private async finalizeUpdate(mod: LocalMod, tempFile: string, mods: LocalMod[], modsFile: string) {
        try {
            // Install (Overwrite)
            const modDestDir = mod.folderPath || path.join(this.modsDir, mod.name);
            await fs.mkdir(modDestDir, { recursive: true });

            const zip = new AdmZip(tempFile);
            zip.extractAllTo(modDestDir, true);

            await fs.unlink(tempFile);

            mod.version = mod.latestVersion || mod.version;
            mod.hasUpdate = false;

            await fs.writeFile(modsFile, JSON.stringify(mods, null, 2));
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    async searchOnlineMods(page: number, search: string = '') {
        const { searchBySection } = await import('./gamebanana.js');
        return await searchBySection({ page, search });
    }

    async searchBySection(options: any) {
        const { searchBySection } = await import('./gamebanana.js');
        return await searchBySection(options);
    }

    async fetchCategories(gameId: number = 21179) {
        const { fetchCategories } = await import('./gamebanana.js');
        return await fetchCategories(gameId);
    }

    async fetchNewMods(page: number = 1) {
        const { fetchNewMods } = await import('./gamebanana.js');
        return await fetchNewMods(page);
    }

    async fetchFeaturedMods() {
        const { fetchFeaturedMods } = await import('./gamebanana.js');
        return await fetchFeaturedMods();
    }

    async getAllOnlineMods(forceRefresh = false) {
        const cacheFile = await this.getOnlineModsCachePath();
        const CACHE_DURATION = 60 * 60 * 1000; // 1 Hour

        // Try reading cache first
        if (!forceRefresh) {
            try {
                const data = await fs.readFile(cacheFile, 'utf-8');
                const cache = JSON.parse(data);
                if (Date.now() - cache.timestamp < CACHE_DURATION) {
                    console.log('[Cache] Returning cached online mods');
                    return cache.mods;
                }
            } catch (e) {
                // Cache miss or invalid, ignore
            }
        }

        console.log('[API] Fetching all online mods from GameBanana...');
        const { fetchAllMods } = await import('./gamebanana.js');
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
    }

    async installOnlineMod(mod: OnlineMod) {
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

            // 2. Start Download Manager Flow
            if (this.downloadManager) {
                const tempDir = app.getPath('temp');
                const fileName = `${mod.gameBananaId}.zip`;

                // Start tracking
                const downloadId = this.downloadManager.startDownload(downloadUrl, tempDir, fileName, {
                    type: 'install',
                    mod: { ...mod, latestFileId: latestFile._idRow } // Pass full mod context
                });

                // Listen for completion ONE-OFF for this specific download ID (to trigger install)
                // Note: Better design might be a global listener in ModManager ctor, but this works for now
                // IF we don't want to leak listeners, we should be careful. 
                // However, ModManager exists for the lifecycle of the app.

                const onComplete = async (dlId: string) => {
                    if (dlId === downloadId) {
                        try {
                            const tempFile = path.join(tempDir, fileName);
                            // 3. Install logic from temp file

                            const modDestDir = path.join(this.modsDir, mod.name.replace(/[^a-z0-9]/gi, '_'));
                            await fs.mkdir(modDestDir, { recursive: true });

                            try {
                                const zip = new AdmZip(tempFile);
                                zip.extractAllTo(modDestDir, true);
                            } catch (e) {
                                console.error('Zip extraction failed', e);
                                // could emit an error event to UI via DownloadManager?
                            }

                            await fs.unlink(tempFile);

                            // 4. Update mods.json
                            const modsFile = await this.getModsFilePath();
                            let mods: LocalMod[] = [];
                            try { mods = JSON.parse(await fs.readFile(modsFile, 'utf-8')); } catch { }

                            const existingIdx = mods.findIndex((m: LocalMod) => m.gameBananaId === mod.gameBananaId);
                            const size = await this.calculateFolderSize(modDestDir);

                            // Calculate new priority (highest + 1)
                            const maxPriority = mods.reduce((max: number, m: LocalMod) => Math.max(max, m.priority || 0), 0);
                            const newPriority = maxPriority + 1;

                            const newModEntry: LocalMod = {
                                id: existingIdx !== -1 ? mods[existingIdx].id : Date.now().toString(),
                                name: mod.name,
                                author: mod.author,
                                version: mod.version, // taken from profile
                                description: mod.description,
                                isEnabled: true,
                                folderPath: modDestDir,
                                priority: existingIdx !== -1 ? (mods[existingIdx].priority || newPriority) : newPriority,
                                gameBananaId: mod.gameBananaId,
                                iconUrl: mod.iconUrl,
                                latestFileId: latestFile._idRow,
                                fileSize: size
                            };

                            if (existingIdx !== -1) mods[existingIdx] = { ...mods[existingIdx], ...newModEntry };
                            else mods.push(newModEntry);

                            await fs.writeFile(modsFile, JSON.stringify(mods, null, 2));

                            await this.deployMod(newModEntry);

                            // Notify UI? The download manager emits 'completed', we can rely on that or send extra event.
                            this.downloadManager!.removeListener('download-completed', onComplete);

                        } catch (err) {
                            console.error("Install post-download failed", err);
                            this.downloadManager!.removeListener('download-completed', onComplete);
                        }
                    }
                };

                this.downloadManager.on('download-completed', onComplete);

                return { success: true, message: 'Download started.', downloadId };
            } else {
                return { success: false, message: 'Download Manager not initialized.' };
            }

        } catch (e) {
            console.error(e);
            return { success: false, message: `Installation failed: ${(e as Error).message}` };
        }
    }

    async getModChangelog(id: string) {
        try {
            const gameBananaId = Number(id);
            if (!isNaN(gameBananaId) && gameBananaId > 0) {
                console.log(`[ModManager] Getting changelog for gameBananaId: ${gameBananaId}`);
                return await import('./gamebanana.js').then(m => m.fetchModUpdates(gameBananaId));
            }

            console.log(`[ModManager] Getting changelog for modId: ${id}`);
            const modsFile = await this.getModsFilePath();
            let mods: LocalMod[] = [];
            try { mods = JSON.parse(await fs.readFile(modsFile, 'utf-8')); } catch { return null; }

            const mod = mods.find(m => m.id === id);
            if (!mod || !mod.gameBananaId) {
                console.error(`[ModManager] Mod not found or no gameBananaId for modId: ${id}`);
                return null;
            }

            console.log(`[ModManager] Found gameBananaId: ${mod.gameBananaId} for modId: ${id}`);
            return await import('./gamebanana.js').then(m => m.fetchModUpdates(mod.gameBananaId!));
        } catch (error) {
            console.error(`[ModManager] Error in getModChangelog for id: ${id}`, error);
            return null;
        }
    }

    async getModDetails(gameBananaId: number) {
        try {
            console.log(`[ModManager] Getting details for gameBananaId: ${gameBananaId}`);
            return await fetchModDetails(gameBananaId);
        } catch (error) {
            console.error(`[ModManager] Error in getModDetails for gameBananaId: ${gameBananaId}`, error);
            return null;
        }
    }

    async setModPriority(modId: string, direction: 'up' | 'down') {
        try {
            const modsFile = await this.getModsFilePath();
            const data = await fs.readFile(modsFile, 'utf-8');
            let mods: LocalMod[] = JSON.parse(data);

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
    }

    async installUE4SS() {
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

                    const onComplete = async (completedId: string) => {
                        if (completedId === dlId) {
                            this.downloadManager!.removeListener('download-completed', onComplete);
                            const result = await this.finalizeUE4SSInstall(tempFile, binariesDir);
                            resolve(result);
                        }
                    };
                    this.downloadManager!.on('download-completed', onComplete);
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
    }

    private async finalizeUE4SSInstall(zipPath: string, destDir: string) {
        try {
            const zip = new AdmZip(zipPath);
            // Extract to temp folder first to check structure
            const extractTemp = path.join(path.dirname(zipPath), 'ue4ss_extract');
            // Clean previous extract
            try { await fs.rm(extractTemp, { recursive: true, force: true }); } catch { }

            zip.extractAllTo(extractTemp, true);

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
    }

    async launchGame() {
        const settings = await this.getSettings();
        if (!settings.gamePath) {
            throw new Error('Game path not configured');
        }

        let exePath = settings.gamePath;
        // If directory, try to find exe.
        // Steam: .../DRAGON BALL Sparking! ZERO/SparkingZERO.exe
        // Or .../DRAGON BALL Sparking! ZERO/SparkingZERO/Binaries/Win64/SparkingZERO-Win64-Shipping.exe

        // Start simplistic: Assume root has the exe or they selected the exe.
        const stats = await fs.stat(exePath);
        if (stats.isDirectory()) {
            // Common steam path check
            const possibleExe = path.join(exePath, 'SparkingZERO.exe');
            try {
                await fs.access(possibleExe);
                exePath = possibleExe;
            } catch {
                // Try binaries
                const binExe = path.join(exePath, 'SparkingZERO', 'Binaries', 'Win64', 'SparkingZERO-Win64-Shipping.exe');
                try {
                    await fs.access(binExe);
                    exePath = binExe;
                } catch {
                    throw new Error('Could not find SparkingZERO.exe in the selected directory.');
                }
            }
        }

        // Get enabled mods to potentially pass as parameters
        const mods = await this.getInstalledMods();
        const enabledMods = Array.isArray(mods) ? mods.filter((m: LocalMod) => m.isEnabled) : [];
        console.log(`Launching game with ${enabledMods.length} mods enabled`);

        console.log(`Launching game at: ${exePath}`);

        // Launch parameters for Unreal Engine mod loading
        // -fileopenlog helps with mod loading diagnostics
        // The ~mods folder should be in the game's content directory
        const launchArgs = ['-fileopenlog'];

        if (settings.launchArgs) {
            const extraArgs = settings.launchArgs.split(' ').filter((a: string) => a.trim().length > 0);
            launchArgs.push(...extraArgs);
        }

        execFile(exePath, launchArgs, { cwd: path.dirname(exePath) }, (error) => {
            if (error) {
                console.error('Failed to launch game:', error);
            }
        });
        return true;
    }
}