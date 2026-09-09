import { GAME_PATH, CONTENT_DIR, PAKS_DIR } from './load-order-and-loose-files.fixture';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import { isGameBananaUrl, extractGameBananaModId } from '../../electron/window-security';
import fs from 'fs/promises';
import path from 'path';
describe('ModManager loose file deployment', () => {
    let modManager: ModManager;
    const deploy = async (files: string[], dirs: string[] = []) => {
        (fs.readFile as any).mockResolvedValue(JSON.stringify({ gamePath: GAME_PATH }));
        (fs.stat as any).mockImplementation(async (target: string) => {
            const value = String(target).replace(/\\/g, '/');
            if (dirs.some(dir => value.endsWith(dir)))
                return { isDirectory: () => true, size: 0 };
            if (files.some(file => value.endsWith(file)))
                return { isDirectory: () => false, size: 1 };
            throw new Error('ENOENT');
        });
        (fs.readdir as any).mockImplementation(async (dir: string) => {
            const value = String(dir).replace(/\\/g, '/');
            return files
                .filter(file => file.startsWith(`${value}/`))
                .map(file => file.slice(value.length + 1).split('/')[0])
                .filter((entry, index, all) => all.indexOf(entry) === index);
        });
        (fs.link as any).mockResolvedValue(undefined);
        const mod: any = { id: 'm', name: 'M', folderPath: '/mods/M', isEnabled: true, priority: 2 };
        await modManager.deployMod(mod);
        return mod.deployedFiles as string[];
    };
    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.unlink as any).mockResolvedValue(undefined);
    });
    it('sends bare movie, splash and audio files to their Content folders', async () => {
        const deployed = await deploy([
            '/mods/M/intro.usm',
            '/mods/M/Splash.bmp',
            '/mods/M/voice.awb',
        ]);
        expect(deployed).toContain(path.join(CONTENT_DIR, 'Movies', 'intro.usm'));
        expect(deployed).toContain(path.join(CONTENT_DIR, 'Splash', 'Splash.bmp'));
        expect(deployed).toContain(path.join(CONTENT_DIR, 'Sound', 'voice.awb'));
    });
});
describe('ModManager loose file deployment', () => {
    let modManager: ModManager;
    const deploy = async (files: string[], dirs: string[] = []) => {
        (fs.readFile as any).mockResolvedValue(JSON.stringify({ gamePath: GAME_PATH }));
        (fs.stat as any).mockImplementation(async (target: string) => {
            const value = String(target).replace(/\\/g, '/');
            if (dirs.some(dir => value.endsWith(dir)))
                return { isDirectory: () => true, size: 0 };
            if (files.some(file => value.endsWith(file)))
                return { isDirectory: () => false, size: 1 };
            throw new Error('ENOENT');
        });
        (fs.readdir as any).mockImplementation(async (dir: string) => {
            const value = String(dir).replace(/\\/g, '/');
            return files
                .filter(file => file.startsWith(`${value}/`))
                .map(file => file.slice(value.length + 1).split('/')[0])
                .filter((entry, index, all) => all.indexOf(entry) === index);
        });
        (fs.link as any).mockResolvedValue(undefined);
        const mod: any = { id: 'm', name: 'M', folderPath: '/mods/M', isEnabled: true, priority: 2 };
        await modManager.deployMod(mod);
        return mod.deployedFiles as string[];
    };
    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.unlink as any).mockResolvedValue(undefined);
    });
    it('mirrors a Content tree shipped inside the mod', async () => {
        const deployed = await deploy(['/mods/M/Content/Chara/Goku/skin.uasset'], ['/mods/M/Content', '/mods/M/Content/Chara', '/mods/M/Content/Chara/Goku']);
        expect(deployed).toContain(path.join(CONTENT_DIR, 'Chara', 'Goku', 'skin.uasset'));
    });
});
describe('ModManager loose file deployment', () => {
    let modManager: ModManager;
    const deploy = async (files: string[], dirs: string[] = []) => {
        (fs.readFile as any).mockResolvedValue(JSON.stringify({ gamePath: GAME_PATH }));
        (fs.stat as any).mockImplementation(async (target: string) => {
            const value = String(target).replace(/\\/g, '/');
            if (dirs.some(dir => value.endsWith(dir)))
                return { isDirectory: () => true, size: 0 };
            if (files.some(file => value.endsWith(file)))
                return { isDirectory: () => false, size: 1 };
            throw new Error('ENOENT');
        });
        (fs.readdir as any).mockImplementation(async (dir: string) => {
            const value = String(dir).replace(/\\/g, '/');
            return files
                .filter(file => file.startsWith(`${value}/`))
                .map(file => file.slice(value.length + 1).split('/')[0])
                .filter((entry, index, all) => all.indexOf(entry) === index);
        });
        (fs.link as any).mockResolvedValue(undefined);
        const mod: any = { id: 'm', name: 'M', folderPath: '/mods/M', isEnabled: true, priority: 2 };
        await modManager.deployMod(mod);
        return mod.deployedFiles as string[];
    };
    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.unlink as any).mockResolvedValue(undefined);
    });
    it('still routes paks through the priority-prefixed ~mods path', async () => {
        const deployed = await deploy(['/mods/M/skin.pak']);
        expect(deployed).toEqual([path.join(PAKS_DIR, '002_skin.pak')]);
    });
});
describe('GameBanana browser guards', () => {
    it('accepts only https GameBanana hosts', () => {
        expect(isGameBananaUrl('https://gamebanana.com/mods/12345')).toBe(true);
        expect(isGameBananaUrl('https://files.gamebanana.com/mods/x.zip')).toBe(true);
        expect(isGameBananaUrl('http://gamebanana.com/mods/1')).toBe(false);
        expect(isGameBananaUrl('https://gamebanana.com.evil.tld/mods/1')).toBe(false);
        expect(isGameBananaUrl('not a url')).toBe(false);
    });
});
describe('GameBanana browser guards', () => {
    it('reads the mod id out of page and 1-click urls', () => {
        expect(extractGameBananaModId('https://gamebanana.com/mods/512345')).toBe(512345);
        expect(extractGameBananaModId('https://gamebanana.com/dl/999?_idRow=777')).toBe(777);
        expect(extractGameBananaModId('https://gamebanana.com/games/21179')).toBe(21179);
        expect(extractGameBananaModId('https://gamebanana.com/mods')).toBeNull();
    });
});
