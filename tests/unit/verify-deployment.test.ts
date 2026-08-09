import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
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
const PAKS_DIR = path.join(GAME_PATH, 'SparkingZERO', 'Content', 'Paks', '~mods');
const DEPLOYED_PAK = path.join(PAKS_DIR, '001_goku.pak');
const MOD_FOLDER = '/mods/Goku Skin';

const enabledMod = {
    id: 'mod-1',
    name: 'Goku Skin',
    folderPath: MOD_FOLDER,
    isEnabled: true,
    priority: 1,
    deployedFiles: [DEPLOYED_PAK]
};

describe('ModManager.verifyDeployment', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
        (fs.readdir as any).mockResolvedValue([]);
        (fs.writeFile as any).mockResolvedValue(undefined);
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.unlink as any).mockResolvedValue(undefined);
    });

    const mockFiles = (mods: unknown[]) => {
        (fs.readFile as any).mockImplementation(async (file: string) => {
            if (String(file).endsWith('settings.json')) return JSON.stringify({ gamePath: GAME_PATH });
            return JSON.stringify(mods);
        });
    };

    it('returns an empty result when the game path is not configured', async () => {
        (fs.readFile as any).mockResolvedValue(JSON.stringify({}));

        const result = await modManager.verifyDeployment();

        expect(result).toEqual({ repaired: [], broken: [], removedOrphans: 0 });
        expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('leaves an enabled mod alone when every deployed file is still present', async () => {
        mockFiles([enabledMod]);
        (fs.access as any).mockResolvedValue(undefined);

        const result = await modManager.verifyDeployment();

        expect(result.repaired).toEqual([]);
        expect(fs.link).not.toHaveBeenCalled();
    });

    it('re-deploys an enabled mod whose files a game update removed', async () => {
        mockFiles([enabledMod]);
        // Source folder exists, deployed pak is gone
        (fs.access as any).mockImplementation(async (target: string) => {
            if (String(target).includes('~mods')) throw new Error('ENOENT');
        });
        (fs.readdir as any).mockImplementation(async (dir: string) => {
            if (String(dir) === MOD_FOLDER) return ['goku.pak'];
            return [];
        });
        (fs.stat as any).mockImplementation(async () => ({ isDirectory: () => false, size: 10 }));
        (fs.link as any).mockResolvedValue(undefined);

        const result = await modManager.verifyDeployment();

        expect(result.repaired).toEqual(['Goku Skin']);
        expect(result.broken).toEqual([]);
        expect(fs.link).toHaveBeenCalledWith(`${MOD_FOLDER}/goku.pak`, DEPLOYED_PAK);
        expect(fs.writeFile).toHaveBeenCalled();
    });

    it('reports an enabled mod as broken when its source folder is gone', async () => {
        mockFiles([enabledMod]);
        (fs.access as any).mockRejectedValue(new Error('ENOENT'));

        const result = await modManager.verifyDeployment();

        expect(result.broken).toEqual(['Goku Skin']);
        expect(result.repaired).toEqual([]);
        expect(fs.link).not.toHaveBeenCalled();
    });

    it('removes files a disabled mod still has inside the game folder', async () => {
        mockFiles([{ ...enabledMod, isEnabled: false }]);
        (fs.access as any).mockResolvedValue(undefined);

        const result = await modManager.verifyDeployment();

        expect(fs.unlink).toHaveBeenCalledWith(DEPLOYED_PAK);
        expect(result.repaired).toEqual([]);
    });

    it('deletes orphan paks left in ~mods but keeps hand-placed files', async () => {
        mockFiles([enabledMod]);
        (fs.access as any).mockResolvedValue(undefined);
        (fs.readdir as any).mockImplementation(async (dir: string) => {
            if (String(dir) === PAKS_DIR) return ['001_goku.pak', '004_stale.pak', 'manual.pak'];
            return [];
        });

        const result = await modManager.verifyDeployment();

        expect(result.removedOrphans).toBe(1);
        expect(fs.unlink).toHaveBeenCalledWith(path.join(PAKS_DIR, '004_stale.pak'));
        expect(fs.unlink).not.toHaveBeenCalledWith(path.join(PAKS_DIR, 'manual.pak'));
        expect(fs.unlink).not.toHaveBeenCalledWith(DEPLOYED_PAK);
    });
});
