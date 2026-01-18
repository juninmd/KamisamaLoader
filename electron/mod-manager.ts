import path from 'path';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import { app, net } from 'electron';
import AdmZip from 'adm-zip';
import pLimit from 'p-limit';
import { fetchModProfile, searchOnlineMods, Mod } from './gamebanana.js';

export class ModManager {
    private modsDir: string;
    private settingsFile: string;

    constructor() {
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

        return { paksDir, logicModsDir };
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

        const { paksDir } = this.resolveGamePaths(settings.gamePath);
        const deployedFiles: string[] = [];

        try {
            // Ensure ~mods exists
            await fs.mkdir(paksDir, { recursive: true });

            const files = await this.getAllFiles(mod.folderPath);

            for (const src of files) {
                const ext = path.extname(src).toLowerCase();
                const filename = path.basename(src);

                // Deploy .pak, .sig, .utoc, .ucas
                if (['.pak', '.sig', '.utoc', '.ucas'].includes(ext)) {
                     const dest = path.join(paksDir, filename);
                     await fs.copyFile(src, dest);
                     deployedFiles.push(dest);
                }
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
            try { mods = JSON.parse(await fs.readFile(modsFile, 'utf-8')); } catch {}

            // Check if exists
            const existingIdx = mods.findIndex((m: any) => m.name === modName);
            const newMod = {
                id: existingIdx !== -1 ? mods[existingIdx].id : Date.now().toString(),
                name: modName,
                author: 'Local',
                version: '1.0',
                description: 'Locally installed mod',
                isEnabled: true,
                folderPath: modDestDir
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
                // Update state first
                mods[modIndex].isEnabled = isEnabled;

                // Deploy or Undeploy
                if (isEnabled) {
                    await this.deployMod(mods[modIndex]);
                } else {
                    await this.undeployMod(mods[modIndex]);
                }

                await fs.writeFile(modsFile, JSON.stringify(mods, null, 2));
                return true;
            }
        } catch (e) {
            console.error(e);
        }
        return false;
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
                response.on('error', (err) => {
                    fileStream.close();
                    fs.unlink(destPath).catch(() => {});
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
            const tempFile = path.join(tempDir, `update_${mod.id}.zip`);

            // Download
            await this.downloadFile(mod.latestFileUrl, tempFile);

            // Install (Overwrite)
            const modDestDir = mod.folderPath || path.join(this.modsDir, mod.name);

            // Ensure dir exists
            await fs.mkdir(modDestDir, { recursive: true });

            // Extract
            try {
                const zip = new AdmZip(tempFile);
                zip.extractAllTo(modDestDir, true);
            } catch (e) {
                 console.error('Extraction failed', e);
                 await fs.unlink(tempFile);
                 return false;
            }

            // Cleanup
            await fs.unlink(tempFile);

            // Update Info
            mod.version = mod.latestVersion;
            mod.hasUpdate = false;
            // mod.latestFileId = mod.latestFileId; // Keep this for next check

            await fs.writeFile(modsFile, JSON.stringify(mods, null, 2));
            return true;

        } catch (e) {
            console.error('Update failed', e);
            return false;
        }
    }

    async searchOnlineMods(page: number, search: string = '') {
        return await searchOnlineMods(page);
    }

    async installOnlineMod(mod: Mod) {
        try {
            // 1. Fetch Profile to get download URL
            const profile = await fetchModProfile(mod.gameBananaId);
            if (!profile || !profile._aFiles || profile._aFiles.length === 0) {
                return { success: false, message: 'No download files found for this mod.' };
            }

            const latestFile = profile._aFiles[0];
            const downloadUrl = latestFile._sDownloadUrl;

            // 2. Download
            const tempDir = app.getPath('temp');
            const tempFile = path.join(tempDir, `${mod.gameBananaId}.zip`);

            await this.downloadFile(downloadUrl, tempFile);

            // 3. Install
            const modDestDir = path.join(this.modsDir, mod.name.replace(/[^a-z0-9]/gi, '_')); // Sanitize
            await fs.mkdir(modDestDir, { recursive: true });

            try {
                const zip = new AdmZip(tempFile);
                zip.extractAllTo(modDestDir, true);
            } catch (e) {
                await fs.unlink(tempFile);
                return { success: false, message: 'Extraction failed.' };
            }

            await fs.unlink(tempFile);

            // 4. Update mods.json
            const modsFile = await this.getModsFilePath();
            let mods = [];
            try { mods = JSON.parse(await fs.readFile(modsFile, 'utf-8')); } catch {}

             // Check if exists
             const existingIdx = mods.findIndex((m: any) => m.gameBananaId === mod.gameBananaId);

             const newModEntry = {
                id: existingIdx !== -1 ? mods[existingIdx].id : Date.now().toString(),
                name: mod.name,
                author: mod.author,
                version: mod.latestVersion,
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

            return { success: true, message: 'Mod installed successfully.' };

        } catch (e) {
            console.error(e);
            return { success: false, message: `Installation failed: ${(e as Error).message}` };
        }
    }
}
