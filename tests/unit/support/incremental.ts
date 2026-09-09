import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import AdmZip from 'adm-zip';
import { ModManager } from '../../../electron/mod-manager';
import { parseLocalMods } from '../../../electron/data-validation';
export async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kamisama-incremental-test-'));
  const manager = new ModManager();
  manager.modsDir = path.join(root, 'library');
  manager.settingsFile = path.join(manager.modsDir, 'settings.json');
  await fs.mkdir(manager.modsDir);
  await fs.writeFile(manager.settingsFile, JSON.stringify({ gamePath: path.join(root, 'game') }));
  const catalog = path.join(manager.modsDir, 'mods.json');
  const zip = async (name: string, files: Record<string, string>) => {
    const archive = new AdmZip();
    for (const [file, body] of Object.entries(files)) archive.addFile(file, Buffer.from(body));
    const target = path.join(root, `${name}.zip`);
    await fs.writeFile(target, archive.toBuffer());
    return target;
  };
  const readMods = async () => parseLocalMods(await fs.readFile(catalog, 'utf8'));
  const deployRoot = manager.resolveGamePaths(path.join(root, 'game')).paksDir;
  return { root, manager, catalog, zip, readMods, deployRoot,
    close: () => fs.rm(root, { recursive: true, force: true, maxRetries: 3 }) };
}
