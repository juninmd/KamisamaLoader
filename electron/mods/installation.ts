import { app } from 'electron';
import fs from 'fs/promises';
import crypto from 'node:crypto';
import path from 'path';
import { LocalMod } from '../../shared/types.js';
import { parseLocalMods } from '../data-validation.js';
import { FileTransaction,reconcilePackage } from '../file-transaction.js';
import type { ModManager } from '../mod-manager.js';
import { assertManagedDirectory, assertDeploymentPath } from './path-safety.js';
export const installationOperations = {
async verifyDeployment(this: ModManager): Promise<{ repaired: string[]; broken: string[]; removedOrphans: number; }> {
        const result = { repaired: [] as string[], broken: [] as string[], removedOrphans: 0 };
        const settings = await this.getSettings();
        if (!settings.gamePath) return result;

        const modsFile = await this.getModsFilePath();
        let mods: LocalMod[] = [];
        try { mods = parseLocalMods(await fs.readFile(modsFile, 'utf-8')); } catch { return result; }

        let changed = false;

        for (const mod of mods) {
            if (mod.isEnabled) {
                if (!await this.pathExists(mod.folderPath)) {
                    result.broken.push(mod.name);
                    continue;
                }

                const present = await this.existingDeployedFiles(mod);
                const isDeployed = (mod.deployedFiles?.length || 0) > 0 && present.length === mod.deployedFiles!.length;
                if (isDeployed) continue;

                if (await this.deployMod(mod)) {
                    changed = true;
                    if ((mod.deployedFiles?.length || 0) > 0) result.repaired.push(mod.name);
                }
                continue;
            }

            // Disabled mods must not keep any file inside the game folder.
            if ((await this.existingDeployedFiles(mod)).length > 0) {
                await this.undeployMod(mod);
                changed = true;
            }
        }

        // Files without catalog ownership may belong to another tool or a manual installation.

        if (changed || result.removedOrphans > 0) {
            await fs.writeFile(modsFile, JSON.stringify(mods, null, 2));
        }

        if (result.repaired.length || result.broken.length || result.removedOrphans) {
            console.log(`[ModManager] Deployment verified: ${result.repaired.length} repaired, ${result.broken.length} broken, ${result.removedOrphans} orphans removed`);
        }
        return result;
    },
async installMod(this: ModManager, filePath: string): Promise<{ success: boolean; message: string; }> {
        let staging = '';
        try {
            staging = await fs.mkdtemp(path.join(app.getPath('temp'), 'kamisama-install-'));
            const name = path.parse(filePath).name;
            if (path.extname(filePath).toLowerCase() === '.zip') await this.extractZip(filePath, staging);
            else await fs.copyFile(filePath, path.join(staging, path.basename(filePath)));
            await this.installPackage(staging, {
                name, author: 'Local', version: '1.0', description: 'Locally installed mod'
            }, path.join(this.modsDir, name));
            return { success: true, message: 'Mod instalado. Arquivos idênticos foram preservados.' };
        } catch (error) {
            return { success: false, message: `Installation failed: ${(error as Error).message}` };
        } finally { if (staging) await fs.rm(staging, { recursive: true, force: true }).catch(console.error); }
    },
async installPackage(this: ModManager, staging: string, metadata: Partial<LocalMod> & { name: string }, destination: string): Promise<void> {
        return this.withMutation(async () => {
            const modsFile = await this.getModsFilePath();
            let mods: LocalMod[] = [];
            try { mods = parseLocalMods(await fs.readFile(modsFile, 'utf-8')); }
            catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
            const existing = mods.find(item => metadata.gameBananaId
                ? item.gameBananaId === metadata.gameBananaId : item.name === metadata.name);
            const next: LocalMod = {
                id: existing?.id || crypto.randomUUID(), author: 'Unknown', version: '1.0', description: '',
                isEnabled: true, priority: Math.max(0, ...mods.map(item => item.priority || 0)) + 1,
                fileSize: 0, ...existing, ...metadata, folderPath: existing?.folderPath || destination,
                hasUpdate: false
            };
            assertManagedDirectory(this, next.folderPath);
            const tx = new FileTransaction(new Set(mods.filter(item => item.id !== next.id)
                .flatMap(item => item.deployedFiles || [])));
            try {
                await reconcilePackage(staging, next.folderPath, tx);
                next.lastInstall = { ...tx.counts };
                const settings = await this.getSettings();
                if (!settings.gamePath) next.isEnabled = false;
                if (next.isEnabled && !await this.deployMod(next, tx)) throw new Error('Deployment failed');
                for (const file of existing?.deployedFiles || []) {
                    if (!next.deployedFiles?.includes(file)) {
                        await assertDeploymentPath(this, file);
                        await tx.remove(file);
                    }
                }
                next.fileSize = await this.calculateFolderSize(next.folderPath);
                if (existing) mods[mods.indexOf(existing)] = next;
                else mods.push(next);
                const text = JSON.stringify(mods, null, 2);
                parseLocalMods(text);
                const catalog = path.join(staging, 'catalog.json');
                await fs.writeFile(catalog, text);
                await tx.replace(catalog, modsFile);
                await tx.commit();
            } catch (error) { await tx.rollback(); throw error; }
        });
    },
};
