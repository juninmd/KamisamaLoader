import path from 'node:path';
import type { ModManager } from '../mod-manager.js';

export function assertManagedDirectory(manager: ModManager, directory: string) {
  const relative = path.relative(path.resolve(manager.modsDir), path.resolve(directory));
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error('A pasta do mod precisa estar dentro da biblioteca.');
  }
}

export async function assertDeploymentPath(manager: ModManager, file: string) {
  const settings = await manager.getSettings();
  if (!settings.gamePath) throw new Error('Configure a pasta do jogo antes de alterar os arquivos.');
  const { contentDir, binariesDir } = manager.resolveGamePaths(settings.gamePath);
  const inside = [contentDir, binariesDir].some(root => {
    const relative = path.relative(path.resolve(root), path.resolve(file));
    return !!relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
  });
  if (!inside) throw new Error('O manifesto aponta para um arquivo fora da pasta do jogo.');
}
