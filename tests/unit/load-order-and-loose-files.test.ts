import { GAME_PATH, PAKS_DIR } from './load-order-and-loose-files.fixture';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';
import path from 'path';
describe('ModManager.setModOrder', () => {
    let modManager: ModManager;
    let written: any[] | null;
    const mods = [
        { id: 'a', name: 'A', folderPath: '/mods/A', isEnabled: false, priority: 3, deployedFiles: [] },
        { id: 'b', name: 'B', folderPath: '/mods/B', isEnabled: false, priority: 2, deployedFiles: [] },
        { id: 'c', name: 'C', folderPath: '/mods/C', isEnabled: false, priority: 1, deployedFiles: [] },
    ];
    beforeEach(() => {
        vi.clearAllMocks();
        written = null;
        modManager = new ModManager();
        (fs.readFile as any).mockImplementation(async (file: string) => {
            if (String(file).endsWith('settings.json'))
                return JSON.stringify({ gamePath: GAME_PATH });
            return JSON.stringify(mods);
        });
        (fs.writeFile as any).mockImplementation(async (_file: string, data: string) => {
            written = JSON.parse(data);
        });
    });
    it('assigns descending priorities with the first id winning', async () => {
        const result = await modManager.setModOrder(['c', 'a', 'b']);
        expect(result).toBe(true);
        expect(written?.map((m: any) => [m.id, m.priority])).toEqual(expect.arrayContaining([['c', 3], ['a', 2], ['b', 1]]));
    });
});
describe('ModManager.setModOrder', () => {
    let modManager: ModManager;
    let written: any[] | null;
    const mods = [
        { id: 'a', name: 'A', folderPath: '/mods/A', isEnabled: false, priority: 3, deployedFiles: [] },
        { id: 'b', name: 'B', folderPath: '/mods/B', isEnabled: false, priority: 2, deployedFiles: [] },
        { id: 'c', name: 'C', folderPath: '/mods/C', isEnabled: false, priority: 1, deployedFiles: [] },
    ];
    beforeEach(() => {
        vi.clearAllMocks();
        written = null;
        modManager = new ModManager();
        (fs.readFile as any).mockImplementation(async (file: string) => {
            if (String(file).endsWith('settings.json'))
                return JSON.stringify({ gamePath: GAME_PATH });
            return JSON.stringify(mods);
        });
        (fs.writeFile as any).mockImplementation(async (_file: string, data: string) => {
            written = JSON.parse(data);
        });
    });
    it('does not rewrite anything when the order is unchanged', async () => {
        const result = await modManager.setModOrder(['a', 'b', 'c']);
        expect(result).toBe(true);
        expect(fs.writeFile).not.toHaveBeenCalled();
    });
});
describe('ModManager.setModOrder', () => {
    let modManager: ModManager;
    let written: any[] | null;
    const mods = [
        { id: 'a', name: 'A', folderPath: '/mods/A', isEnabled: false, priority: 3, deployedFiles: [] },
        { id: 'b', name: 'B', folderPath: '/mods/B', isEnabled: false, priority: 2, deployedFiles: [] },
        { id: 'c', name: 'C', folderPath: '/mods/C', isEnabled: false, priority: 1, deployedFiles: [] },
    ];
    beforeEach(() => {
        vi.clearAllMocks();
        written = null;
        modManager = new ModManager();
        (fs.readFile as any).mockImplementation(async (file: string) => {
            if (String(file).endsWith('settings.json'))
                return JSON.stringify({ gamePath: GAME_PATH });
            return JSON.stringify(mods);
        });
        (fs.writeFile as any).mockImplementation(async (_file: string, data: string) => {
            written = JSON.parse(data);
        });
    });
    it('ignores unknown mod ids', async () => {
        await modManager.setModOrder(['ghost', 'c', 'b', 'a']);
        expect(written?.find((m: any) => m.id === 'c').priority).toBe(3);
        expect(written?.find((m: any) => m.id === 'a').priority).toBe(1);
    });
});
describe('ModManager.setModOrder', () => {
    let modManager: ModManager;
    let written: any[] | null;
    const mods = [
        { id: 'a', name: 'A', folderPath: '/mods/A', isEnabled: false, priority: 3, deployedFiles: [] },
        { id: 'b', name: 'B', folderPath: '/mods/B', isEnabled: false, priority: 2, deployedFiles: [] },
        { id: 'c', name: 'C', folderPath: '/mods/C', isEnabled: false, priority: 1, deployedFiles: [] },
    ];
    beforeEach(() => {
        vi.clearAllMocks();
        written = null;
        modManager = new ModManager();
        (fs.readFile as any).mockImplementation(async (file: string) => {
            if (String(file).endsWith('settings.json'))
                return JSON.stringify({ gamePath: GAME_PATH });
            return JSON.stringify(mods);
        });
        (fs.writeFile as any).mockImplementation(async (_file: string, data: string) => {
            written = JSON.parse(data);
        });
    });
    it('redeploys enabled mods so the pak prefix matches the new order', async () => {
        (fs.readFile as any).mockImplementation(async (file: string) => {
            if (String(file).endsWith('settings.json'))
                return JSON.stringify({ gamePath: GAME_PATH });
            return JSON.stringify([
                { ...mods[0], isEnabled: true, deployedFiles: [path.join(PAKS_DIR, '003_a.pak')] },
                mods[1],
            ]);
        });
        (fs.readdir as any).mockImplementation(async (dir: string) => {
            if (String(dir) === '/mods/A')
                return ['a.pak'];
            return [];
        });
        (fs.stat as any).mockResolvedValue({ isDirectory: () => false, size: 1 });
        (fs.link as any).mockResolvedValue(undefined);
        await modManager.setModOrder(['b', 'a']);
        expect(fs.unlink).toHaveBeenCalledWith(path.join(PAKS_DIR, '003_a.pak'));
        expect(fs.link).toHaveBeenCalledWith('/mods/A/a.pak', expect.stringContaining(path.join(PAKS_DIR, '001_a.pak') + '.kamisama-'));
        expect(fs.rename).toHaveBeenCalledWith(expect.stringContaining('.kamisama-'), path.join(PAKS_DIR, '001_a.pak'));
    });
});
