import path from 'path';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import { execFile } from 'child_process';
import { app, net } from 'electron';
import AdmZip from 'adm-zip';
import pLimit from 'p-limit';
import { fetchModProfile, searchOnlineMods, Mod, getModChangelog, fetchModDetails } from './gamebanana.js';

import { DownloadManager } from './download-manager.js';



export class ModManager {
    private modsDir: string;
    private settingsFile: string;
    private downloadManager: DownloadManager | null = null;

    constructor(downloadManager?: DownloadManager) {
        if (downloadManager) this.downloadManager = downloadManager;
        this.modsDir = path.join(path.dirname(app.getPath('exe')), 'Mods');
        this.settingsFile = path.join(this.modsDir, 'settings.json');
        if (!app.isPackaged) {
            this.modsDir = path.join(__dirname, '../../Mods');
            this.settingsFile = path.join(this.modsDir, 'settings.json');
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

    async getSettings(): Promise<{ gamePath: string; backgroundImage?: string }> {
        try {
            await this.ensureModsDir();
            const data = await fs.readFile(this.settingsFile, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            return { gamePath: '' };
        }
    }

    async saveSettings(settings: { gamePath: string; backgroundImage?: string }) {
        try {
            await this.ensureModsDir();
            await fs.writeFile(this.settingsFile, JSON.stringify(settings, null, 2));
            return true;
        } catch (error) {
            console.error('Failed to save settings:', error);
            return false;
        }
    }

    async getInstalledMods() {
        try {
            const modsFile = await this.getModsFilePath();
            const data = await fs.readFile(modsFile, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            return [];
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

    async deployMod(mod: any) {
        console.log(`Deploying mod: ${mod.name}`);
        const settings = await this.getSettings();
        if (!settings.gamePath) {
            console.error('Game path not set');
            return false;
        }

        const { paksDir, binariesDir } = this.resolveGamePaths(settings.gamePath);
        const deployedFiles: string[] = [];
        let ue4ssModName: string | null = null;

        try {
            // Ensure ~mods exists
            await fs.mkdir(paksDir, { recursive: true });

            const files = await this.getAllFiles(mod.folderPath);
            const ue4ssDir = path.join(mod.folderPath, 'ue4ss');
            let isUe4ss = false;
            try { isUe4ss = (await fs.stat(ue4ssDir)).isDirectory(); } catch { }

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

                    await fs.mkdir(path.dirname(dest), { recursive: true });
                    await fs.copyFile(src, dest);
                    deployedFiles.push(dest);
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

                    await fs.copyFile(src, dest);
                    deployedFiles.push(dest);
                }
            }

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

    async undeployMod(mod: any) {
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
            let mods = [];
            try { mods = JSON.parse(await fs.readFile(modsFile, 'utf-8')); } catch { }

            // Calculate new priority (highest + 1)
            const maxPriority = mods.reduce((max: number, m: any) => Math.max(max, m.priority || 0), 0);
            const newPriority = maxPriority + 1;

            // Check if exists
            const existingIdx = mods.findIndex((m: any) => m.name === modName);
            const newMod = {
                id: existingIdx !== -1 ? mods[existingIdx].id : Date.now().toString(),
                name: modName,
                author: 'Local',
                version: '1.0',
                description: 'Locally installed mod',
                isEnabled: true,
                folderPath: modDestDir,
                priority: newPriority
            };

            if (existingIdx !== -1) mods[existingIdx] = { ...mods[existingIdx], ...newMod };
            else mods.push(newMod);

            await fs.writeFile(modsFile, JSON.stringify(mods, null, 2));
            return { success: true, message: 'Mod installed successfully' };
        } catch (e) {
            console.error(e);
            return { success: false, message: `Installation failed: ${(e as Error).message}` };
        }
    }

    async toggleMod(modId: string, isEnabled: boolean) {
        try {
            const modsFile = await this.getModsFilePath();
            const data = await fs.readFile(modsFile, 'utf-8');
            const mods = JSON.parse(data);
            const modIndex = mods.findIndex((m: any) => m.id === modId);

            if (modIndex !== -1) {
                const targetMod = mods[modIndex];

                // Conflict Check (Only when enabling)
                let conflictMessage = null;
                if (isEnabled) {
                    const conflictingMod = mods.find((m: any) =>
                        m.isEnabled &&
                        m.id !== modId &&
                        m.category && targetMod.category &&
                        m.category === targetMod.category &&
                        // Ignore generic categories
                        !['UI', 'Misc', 'Sounds', 'Music', 'Other'].includes(targetMod.category)
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
                return { success: true, conflict: conflictMessage };
            }
        } catch (e) {
            console.error(e);
        }
        return { success: false };
    }

    async checkForUpdates() {
        const modsFile = await this.getModsFilePath();
        let mods: any[] = [];
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
            let mods = [];
            try { mods = JSON.parse(await fs.readFile(modsFile, 'utf-8')); } catch { return false; }

            const mod = mods.find((m: any) => m.id === modId);
            if (!mod || !mod.latestFileUrl) return false;

            const tempDir = app.getPath('temp');
            // Check if we have download manager
            if (this.downloadManager) {
                return new Promise((resolve) => {
                    const fileName = `update_${mod.id}.zip`;
                    const id = this.downloadManager!.startDownload(mod.latestFileUrl, tempDir, fileName, { type: 'update', modId });

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
    private async finalizeUpdate(mod: any, tempFile: string, mods: any[], modsFile: string) {
        try {
            // Install (Overwrite)
            const modDestDir = mod.folderPath || path.join(this.modsDir, mod.name);
            await fs.mkdir(modDestDir, { recursive: true });

            const zip = new AdmZip(tempFile);
            zip.extractAllTo(modDestDir, true);

            await fs.unlink(tempFile);

            mod.version = mod.latestVersion;
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

    async installOnlineMod(mod: Mod) {
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
                            let mods = [];
                            try { mods = JSON.parse(await fs.readFile(modsFile, 'utf-8')); } catch { }

                            const existingIdx = mods.findIndex((m: any) => m.gameBananaId === mod.gameBananaId);

                            const newModEntry = {
                                id: existingIdx !== -1 ? mods[existingIdx].id : Date.now().toString(),
                                name: mod.name,
                                author: mod.author,
                                version: mod.version, // taken from profile
                                description: mod.description,
                                isEnabled: true,
                                folderPath: modDestDir,
                                gameBananaId: mod.gameBananaId,
                                iconUrl: mod.iconUrl,
                                latestFileId: latestFile._idRow
                            };

                            if (existingIdx !== -1) mods[existingIdx] = { ...mods[existingIdx], ...newModEntry };
                            else mods.push(newModEntry);

                            await fs.writeFile(modsFile, JSON.stringify(mods, null, 2));

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

    async getModChangelog(modId: string) {
        const modsFile = await this.getModsFilePath();
        let mods: any[] = [];
        try { mods = JSON.parse(await fs.readFile(modsFile, 'utf-8')); } catch { return null; }

        const mod = mods.find(m => m.id === modId);
        if (!mod || !mod.gameBananaId) return null;

        return await import('./gamebanana.js').then(m => m.fetchModUpdates(mod.gameBananaId));
    }

    async getModDetails(gameBananaId: number) {
        return await fetchModDetails(gameBananaId);
    }

    async setModPriority(modId: string, direction: 'up' | 'down') {
        try {
            const modsFile = await this.getModsFilePath();
            const data = await fs.readFile(modsFile, 'utf-8');
            let mods = JSON.parse(data);

            // Sort by priority first to ensure index matches logical order
            mods.sort((a: any, b: any) => (a.priority || 0) - (b.priority || 0));

            const index = mods.findIndex((m: any) => m.id === modId);
            if (index === -1) return false;

            const targetIndex = direction === 'up' ? index + 1 : index - 1; // Higher priority = executed later = "Up" visually? 
            // Usually "Top" of list = High Priority (Overwrites others).
            // But in file system, Z_Mod overwrites A_Mod.
            // If "Up" means "Higher in list" which means "Higher Priority" -> It should have a HIGHER alphanumeric name?
            // Wait. Alphabetical: A loads first, Z loads last (Z wins).
            // So Higher Priority = Higher Number (999).
            // Visual List: usually High Priority is at the TOP.
            // If I move a mod UP the list, I want it to WIN over the one below it.
            // So "Up" = Increase Priority Number.

            if (targetIndex < 0 || targetIndex >= mods.length) return false;

            const currentMod = mods[index];
            const targetMod = mods[targetIndex];

            // Swap priorities
            const temp = currentMod.priority || 0;
            currentMod.priority = targetMod.priority || 0;
            targetMod.priority = temp;

            // Redeploy both if enabled
            if (currentMod.isEnabled) {
                await this.undeployMod(currentMod);
                await this.deployMod(currentMod);
            }
            if (targetMod.isEnabled) {
                await this.undeployMod(targetMod);
                await this.deployMod(targetMod);
            }

            // Save
            await fs.writeFile(modsFile, JSON.stringify(mods, null, 2));
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    private async getProfilesPath() {
        await this.ensureModsDir();
        return path.join(this.modsDir, 'profiles.json');
    }

    async getProfiles() {
        try {
            const profilesFile = await this.getProfilesPath();
            const data = await fs.readFile(profilesFile, 'utf-8');
            try {
                return JSON.parse(data);
            } catch (jsonErr) {
                console.error('Profiles file corrupted:', jsonErr);
                return []; // Return empty if corrupted
            }
        } catch (error: any) {
            // File not found is fine, return empty
            if (error.code !== 'ENOENT') {
                console.error('Failed to read profiles:', error);
            }
            return [];
        }
    }

    async createProfile(name: string) {
        try {
            const mods = await this.getInstalledMods();
            const enabledModIds = mods.filter((m: any) => m.isEnabled).map((m: any) => m.id);

            const profiles = await this.getProfiles();
            const newProfile = {
                id: Date.now().toString(),
                name,
                modIds: enabledModIds
            };

            profiles.push(newProfile);

            const profilesFile = await this.getProfilesPath();
            await fs.writeFile(profilesFile, JSON.stringify(profiles, null, 2));
            console.log(`Profile created: ${name} (${newProfile.id})`);
            return { success: true, profile: newProfile };
        } catch (e: any) {
            console.error('Failed to create profile:', e);
            return { success: false, message: e.message || 'Unknown error' };
        }
    }

    async deleteProfile(profileId: string) {
        try {
            let profiles = await this.getProfiles();
            profiles = profiles.filter((p: any) => p.id !== profileId);

            const profilesFile = await this.getProfilesPath();
            await fs.writeFile(profilesFile, JSON.stringify(profiles, null, 2));
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    async loadProfile(profileId: string) {
        try {
            const profiles = await this.getProfiles();
            const profile = profiles.find((p: any) => p.id === profileId);
            if (!profile) return { success: false, message: 'Profile not found' };

            const modsFile = await this.getModsFilePath();
            const data = await fs.readFile(modsFile, 'utf-8');
            const mods = JSON.parse(data);

            const targetEnabledIds = new Set(profile.modIds);

            // Calculate diff
            const toDisable: any[] = [];
            const toEnable: any[] = [];

            for (const mod of mods) {
                const shouldBeEnabled = targetEnabledIds.has(mod.id);
                if (mod.isEnabled && !shouldBeEnabled) {
                    toDisable.push(mod);
                } else if (!mod.isEnabled && shouldBeEnabled) {
                    toEnable.push(mod);
                }
                // Update state in memory
                mod.isEnabled = shouldBeEnabled;
            }

            console.log(`Loading Profile: Disabling ${toDisable.length}, Enabling ${toEnable.length}`);

            // Apply Changes
            // 1. Disable first to clear conflicts/space
            for (const mod of toDisable) {
                await this.undeployMod(mod);
            }

            // 2. Enable new ones
            for (const mod of toEnable) {
                await this.deployMod(mod);
            }

            // Save mods.json
            await fs.writeFile(modsFile, JSON.stringify(mods, null, 2));

            return { success: true };

        } catch (e) {
            console.error('Failed to load profile', e);
            return { success: false, message: (e as Error).message };
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
        const enabledMods = Array.isArray(mods) ? mods.filter((m: any) => m.isEnabled) : [];
        console.log(`Launching game with ${enabledMods.length} mods enabled`);

        console.log(`Launching game at: ${exePath}`);

        // Launch parameters for Unreal Engine mod loading
        // -fileopenlog helps with mod loading diagnostics
        // The ~mods folder should be in the game's content directory
        const launchArgs = ['-fileopenlog'];

        execFile(exePath, launchArgs, { cwd: path.dirname(exePath) }, (error) => {
            if (error) {
                console.error('Failed to launch game:', error);
            }
        });
        return true;
    }
}
