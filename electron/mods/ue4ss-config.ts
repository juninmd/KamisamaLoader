import fs from 'fs/promises';
import path from 'path';
import type { ModManager } from '../mod-manager.js';
import { FileTransaction, isTransactionArtifact } from '../file-transaction.js';
export const ue4ssConfig = {
async updateUE4SSModsTxt(this: ModManager, binariesDir: string, modName: string, enabled: boolean, transaction?: FileTransaction): Promise<void> {
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

            if (newLines.join('\n') === content) return;
            if (transaction) await transaction.write(modsTxtPath, newLines.join('\n'));
            else await fs.writeFile(modsTxtPath, newLines.join('\n'));
        } catch (e) {
            if (transaction) throw e;
            console.error('Failed to update mods.txt', e);
        }
    },
async getAllFiles(this: ModManager, dir: string, fileList: string[] = []): Promise<string[]> {
        const files = await fs.readdir(dir);
        for (const file of files) {
            if (isTransactionArtifact(file)) continue;
            const filePath = this.joinPath(dir, file);
            const stat = await fs.stat(filePath);
            if (stat.isDirectory()) {
                await this.getAllFiles(filePath, fileList);
            } else {
                fileList.push(filePath);
            }
        }
        return fileList;
    },
};
