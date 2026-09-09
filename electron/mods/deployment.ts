import fs from 'fs/promises';
import { LocalMod } from '../../shared/types.js';
import { parseLocalMods } from '../data-validation.js';
import { FileTransaction } from '../file-transaction.js';
import type { ModManager } from '../mod-manager.js';
export const deploymentOperations = {
async deployMod(this: ModManager, mod: LocalMod, transaction?: FileTransaction): Promise<boolean> {
        console.log(`Deploying mod (Non-destructive): ${mod.name}`);
        const settings = await this.getSettings();
        if (!settings.gamePath) {
            console.error('Game path not set');
            return false;
        }

        const { paksDir, logicModsDir, binariesDir, contentDir } = this.resolveGamePaths(settings.gamePath);

        try {
            // Ensure ~mods exists
            await fs.mkdir(paksDir, { recursive: true });

            const { deployedFiles, ue4ssModName } = await this.deployModFiles(mod, paksDir, logicModsDir, binariesDir, contentDir, transaction);

            if (ue4ssModName) {
                await this.updateUE4SSModsTxt(binariesDir, ue4ssModName, true, transaction);
            }

            if (mod.ue4ssModName && mod.ue4ssModName !== ue4ssModName) {
                await this.updateUE4SSModsTxt(binariesDir, mod.ue4ssModName, false, transaction);
            }
            mod.ue4ssModName = ue4ssModName || undefined;

            mod.deployedFiles = deployedFiles;
            return true;
        } catch (e) {
            console.error('Deployment failed', e);
            if (transaction) throw e;
            return false;
        }
    },
async undeployMod(this: ModManager, mod: LocalMod): Promise<boolean> {
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
    },
async setModOrder(this: ModManager, orderedIds: string[]): Promise<boolean> {
        const modsFile = await this.getModsFilePath();
        let mods: LocalMod[] = [];
        try { mods = parseLocalMods(await fs.readFile(modsFile, 'utf-8')); } catch { return false; }

        const total = orderedIds.length;
        const touched: LocalMod[] = [];

        orderedIds.forEach((id, index) => {
            const mod = mods.find(m => m.id === id);
            if (!mod) return;
            const priority = total - index;
            if (mod.priority !== priority) {
                mod.priority = priority;
                touched.push(mod);
            }
        });

        if (touched.length === 0) return true;

        for (const mod of touched) {
            if (!mod.isEnabled) continue;
            await this.undeployMod(mod);
            await this.deployMod(mod);
        }

        await fs.writeFile(modsFile, JSON.stringify(mods, null, 2));
        return true;
    },
async pathExists(this: ModManager, target: string): Promise<boolean> {
        try {
            await fs.access(target);
            return true;
        } catch {
            return false;
        }
    },
async existingDeployedFiles(this: ModManager, mod: LocalMod): Promise<string[]> {
        if (!Array.isArray(mod.deployedFiles)) return [];
        const present: string[] = [];
        for (const file of mod.deployedFiles) {
            if (await this.pathExists(file)) present.push(file);
        }
        return present;
    },
};
