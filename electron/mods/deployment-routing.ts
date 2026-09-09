import fs from 'fs/promises';
import path from 'path';
import { LocalMod } from '../../shared/types.js';
import { FileTransaction } from '../file-transaction.js';
import type { ModManager } from '../mod-manager.js';
import { LOOSE_FILE_TARGETS,PAK_EXTENSIONS } from './helpers.js';
export const deploymentRouting = {
async deployModFiles(this: ModManager, mod: LocalMod, paksDir: string, logicModsDir: string, binariesDir: string, contentDir: string, transaction?: FileTransaction): Promise<{ deployedFiles: string[], ue4ssModName: string | null }> {
        const deployedFiles: string[] = [];
        const targets = new Set<string>();
        const owned = new Set((mod.deployedFiles || []).map(file => path.resolve(file).toLowerCase()));
        const place = async (source: string, target: string) => {
            const key = path.resolve(target).toLowerCase();
            if (targets.has(key)) throw new Error(`Dois arquivos usam o mesmo destino: ${target}`);
            targets.add(key);
            if (transaction && !owned.has(key)) {
                try {
                    await fs.lstat(target);
                    throw new Error(`Arquivo existente sem vínculo com este mod: ${target}`);
                } catch (error) {
                    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
                }
            }
            if (await this.deployFile(source, target, transaction)) deployedFiles.push(target);
        };
        let ue4ssModName: string | null = null;

        try {
            const files = await this.getAllFiles(mod.folderPath);
            const ue4ssDir = this.joinPath(mod.folderPath, 'ue4ss');
            let isUe4ss = false;
            try { isUe4ss = (await fs.stat(ue4ssDir)).isDirectory(); } catch { }

            const logicModsSrcDir = this.joinPath(mod.folderPath, 'LogicMods');
            let isLogicMod = false;
            try { isLogicMod = (await fs.stat(logicModsSrcDir)).isDirectory(); } catch { }

            const moviesSrcDir = this.joinPath(mod.folderPath, 'Movies');
            let isMovies = false;
            try { isMovies = (await fs.stat(moviesSrcDir)).isDirectory(); } catch { }

            // Mods shipped as a mirror of the game tree keep their own layout
            let contentSrcDir: string | null = null;
            for (const candidate of [
                this.joinPath(mod.folderPath, 'Content'),
                this.joinPath(mod.folderPath, 'SparkingZERO', 'Content')
            ]) {
                try {
                    if ((await fs.stat(candidate)).isDirectory()) {
                        contentSrcDir = candidate;
                        break;
                    }
                } catch { }
            }

            for (const src of files) {
                // If it is inside ue4ss dir
                if (isUe4ss && this.isInsidePath(src, ue4ssDir)) {
                    const relativePath = this.relativePath(ue4ssDir, src);
                    const dest = path.join(binariesDir, relativePath);

                    // Try to identify ModName from "Mods/ModName/..."
                    // relativePath matches "Mods\ModName\..." on Windows
                    const parts = relativePath.split(/[\\/]/);
                    if (parts[0] === 'Mods' && parts.length >= 2) {
                        ue4ssModName = parts[1];
                    }

                    await place(src, dest);
                    continue;
                }

                // If it is inside LogicMods dir
                if (isLogicMod && this.isInsidePath(src, logicModsSrcDir)) {
                    const relativePath = this.relativePath(logicModsSrcDir, src);
                    const dest = path.join(logicModsDir, relativePath);
                    await place(src, dest);
                    continue;
                }

                // If it is inside Movies dir (Audio/Video loose files)
                if (isMovies && this.isInsidePath(src, moviesSrcDir)) {
                    const relativePath = this.relativePath(moviesSrcDir, src);
                    const dest = path.join(contentDir, 'Movies', relativePath);
                    await place(src, dest);
                    continue;
                }

                const ext = path.extname(src).toLowerCase();
                const filename = path.basename(src);

                // Deploy .pak, .sig, .utoc, .ucas
                if (PAK_EXTENSIONS.includes(ext)) {
                    // Priority prefix: 001_ModName.pak
                    const priority = (mod.priority || 0).toString().padStart(3, '0');
                    const destFilename = `${priority}_${filename}`;
                    const dest = path.join(paksDir, destFilename);

                    await place(src, dest);
                    continue;
                }

                // Loose files laid out as a copy of the game's Content tree
                if (contentSrcDir && this.isInsidePath(src, contentSrcDir)) {
                    const dest = path.join(contentDir, this.relativePath(contentSrcDir, src));
                    await place(src, dest);
                    continue;
                }

                // Bare music, movie and splash files the game reads outside a pak
                const looseTarget = LOOSE_FILE_TARGETS[ext];
                if (looseTarget) {
                    const dest = path.join(contentDir, looseTarget, filename);
                    await place(src, dest);
                }
            }
        } catch (e) {
            console.error('Error in deployModFiles internal loop', e);
            throw e;
        }

        return { deployedFiles, ue4ssModName };
    },
};
