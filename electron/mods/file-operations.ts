import fs from 'fs/promises';
import path from 'path';
import { LocalMod } from '../../shared/types.js';
import { extractArchive } from '../archive.js';
import { parseLocalMods } from '../data-validation.js';
import { FileTransaction, isTransactionArtifact } from '../file-transaction.js';
import type { ModManager } from '../mod-manager.js';
export const fileOperations = {
async calculateFolderSize(this: ModManager, dirPath: string): Promise<number> {
        let size = 0;
        try {
            const files = await fs.readdir(dirPath);
            for (const file of files) {
                if (isTransactionArtifact(file)) continue;
                const filePath = this.joinPath(dirPath, file);
                const stats = await fs.stat(filePath);
                if (stats.isDirectory()) {
                    size += await this.calculateFolderSize(filePath);
                } else {
                    size += stats.size;
                }
            }
        } catch {
            // Missing directories contribute zero bytes.
        }
        return size;
    },
async fixPriorities(this: ModManager): Promise<void> {
        try {
            const modsFile = await this.getModsFilePath();
            let mods: LocalMod[] = [];
            try { mods = parseLocalMods(await fs.readFile(modsFile, 'utf-8')); } catch { return; }

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
    },
resolveGamePaths(this: ModManager, gamePath: string): { paksDir: string; logicModsDir: string; binariesDir: string; contentDir: string; } {
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
        const contentDir = path.join(root, 'SparkingZERO', 'Content');

        return { paksDir, logicModsDir, binariesDir, contentDir };
    },
async deployFile(this: ModManager, src: string, dest: string, transaction?: FileTransaction): Promise<boolean> {
        const tx = transaction || new FileTransaction();
        try {
            await tx.replace(src, dest);
            if (!transaction) await tx.commit();
            return true;
        } catch (error) {
            if (!transaction) await tx.rollback();
            throw error;
        }
    },
async extractZip(this: ModManager, zipPath: string, dest: string): Promise<void> {
        await extractArchive(zipPath, dest);
    },
};
