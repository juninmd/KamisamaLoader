import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import { isGameBananaUrl, extractGameBananaModId } from '../../electron/window-security';
import fs from 'fs/promises';
import path from 'path';

vi.mock('child_process', () => {
    const execFileMock = vi.fn();
    return { execFile: execFileMock, default: { execFile: execFileMock } };
});

vi.mock('electron', () => ({
    app: {
        getPath: vi.fn((name) => name === 'exe' ? '/app/exe' : '/tmp'),
        isPackaged: false,
    },
    net: { request: vi.fn() },
    shell: { openPath: vi.fn() }
}));

vi.mock('fs/promises', () => ({
    default: {
        readFile: vi.fn(),
        writeFile: vi.fn(),
        mkdir: vi.fn(),
        stat: vi.fn(),
        unlink: vi.fn(),
        readdir: vi.fn(),
        access: vi.fn(),
        link: vi.fn(),
        copyFile: vi.fn(),
    }
}));

vi.mock('fs', () => {
    const createWriteStream = vi.fn();
    return { createWriteStream, default: { createWriteStream } };
});

vi.mock('../../electron/gamebanana', () => ({
    fetchModProfile: vi.fn(),
    searchOnlineMods: vi.fn(),
    getModChangelog: vi.fn(),
    fetchModDetails: vi.fn()
}));

vi.mock('../../electron/github', () => ({ fetchLatestRelease: vi.fn() }));

const GAME_PATH = '/game';
const CONTENT_DIR = path.join(GAME_PATH, 'SparkingZERO', 'Content');
const PAKS_DIR = path.join(CONTENT_DIR, 'Paks', '~mods');

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
            if (String(file).endsWith('settings.json')) return JSON.stringify({ gamePath: GAME_PATH });
            return JSON.stringify(mods);
        });
        (fs.writeFile as any).mockImplementation(async (_file: string, data: string) => {
            written = JSON.parse(data);
        });
    });

    it('assigns descending priorities with the first id winning', async () => {
        const result = await modManager.setModOrder(['c', 'a', 'b']);

        expect(result).toBe(true);
        expect(written?.map((m: any) => [m.id, m.priority])).toEqual(
            expect.arrayContaining([['c', 3], ['a', 2], ['b', 1]])
        );
    });

    it('does not rewrite anything when the order is unchanged', async () => {
        const result = await modManager.setModOrder(['a', 'b', 'c']);

        expect(result).toBe(true);
        expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('ignores unknown mod ids', async () => {
        await modManager.setModOrder(['ghost', 'c', 'b', 'a']);

        expect(written?.find((m: any) => m.id === 'c').priority).toBe(3);
        expect(written?.find((m: any) => m.id === 'a').priority).toBe(1);
    });

    it('redeploys enabled mods so the pak prefix matches the new order', async () => {
        (fs.readFile as any).mockImplementation(async (file: string) => {
            if (String(file).endsWith('settings.json')) return JSON.stringify({ gamePath: GAME_PATH });
            return JSON.stringify([
                { ...mods[0], isEnabled: true, deployedFiles: [path.join(PAKS_DIR, '003_a.pak')] },
                mods[1],
            ]);
        });
        (fs.readdir as any).mockImplementation(async (dir: string) => {
            if (String(dir) === '/mods/A') return ['a.pak'];
            return [];
        });
        (fs.stat as any).mockResolvedValue({ isDirectory: () => false, size: 1 });
        (fs.link as any).mockResolvedValue(undefined);

        await modManager.setModOrder(['b', 'a']);

        expect(fs.unlink).toHaveBeenCalledWith(path.join(PAKS_DIR, '003_a.pak'));
        expect(fs.link).toHaveBeenCalledWith('/mods/A/a.pak', path.join(PAKS_DIR, '001_a.pak'));
    });
});

describe('ModManager loose file deployment', () => {
    let modManager: ModManager;

    const deploy = async (files: string[], dirs: string[] = []) => {
        (fs.readFile as any).mockResolvedValue(JSON.stringify({ gamePath: GAME_PATH }));
        (fs.stat as any).mockImplementation(async (target: string) => {
            const value = String(target).replace(/\\/g, '/');
            if (dirs.some(dir => value.endsWith(dir))) return { isDirectory: () => true, size: 0 };
            if (files.some(file => value.endsWith(file))) return { isDirectory: () => false, size: 1 };
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

    it('mirrors a Content tree shipped inside the mod', async () => {
        const deployed = await deploy(
            ['/mods/M/Content/Chara/Goku/skin.uasset'],
            ['/mods/M/Content', '/mods/M/Content/Chara', '/mods/M/Content/Chara/Goku']
        );

        expect(deployed).toContain(path.join(CONTENT_DIR, 'Chara', 'Goku', 'skin.uasset'));
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

    it('reads the mod id out of page and 1-click urls', () => {
        expect(extractGameBananaModId('https://gamebanana.com/mods/512345')).toBe(512345);
        expect(extractGameBananaModId('https://gamebanana.com/dl/999?_idRow=777')).toBe(777);
        expect(extractGameBananaModId('https://gamebanana.com/games/21179')).toBe(21179);
        expect(extractGameBananaModId('https://gamebanana.com/mods')).toBeNull();
    });
});
