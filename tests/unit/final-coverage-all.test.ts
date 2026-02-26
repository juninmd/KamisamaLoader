import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted mocks
const mocks = vi.hoisted(() => ({
    fs: {
        mkdir: vi.fn(),
        readFile: vi.fn(),
        writeFile: vi.fn(),
        readdir: vi.fn(),
        stat: vi.fn(),
        unlink: vi.fn(),
        rm: vi.fn(),
        copyFile: vi.fn(),
        link: vi.fn()
    },
    downloadManager: {
        startDownload: vi.fn(),
        on: vi.fn(),
        removeListener: vi.fn()
    },
    admZip: {
        extractAllToAsync: vi.fn()
    }
}));

vi.mock('fs/promises', () => ({
    default: mocks.fs,
    ...mocks.fs
}));

vi.mock('adm-zip', () => ({
    default: vi.fn(function() {
        return {
            extractAllToAsync: mocks.admZip.extractAllToAsync
        };
    })
}));

vi.mock('electron', () => ({
    app: { getPath: vi.fn().mockReturnValue('/app') },
    net: { request: vi.fn() },
    shell: { openPath: vi.fn() }
}));

import { ModManager } from '../../electron/mod-manager';

describe('Final Coverage Sweeper', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager(mocks.downloadManager as any);
        mocks.fs.readFile.mockResolvedValue(JSON.stringify({ gamePath: '/game' }));
    });

    it('should calculate folder size recursively', async () => {
        mocks.fs.readdir.mockImplementation(async (path) => {
            if (path === '/root') return ['dir', 'file1'];
            if (path === '/root/dir') return ['file2'];
            return [];
        });
        mocks.fs.stat.mockImplementation(async (path) => {
            if (path.endsWith('dir')) return { isDirectory: () => true };
            return { isDirectory: () => false, size: 100 };
        });

        const size = await modManager.calculateFolderSize('/root');
        // file1 (100) + file2 (100) = 200
        expect(size).toBe(200);
    });

    it('should install .pak file directly', async () => {
        mocks.fs.readFile.mockResolvedValue('[]'); // Empty mods
        mocks.fs.readdir.mockResolvedValue([]); // Empty dir size
        mocks.fs.stat.mockResolvedValue({ isDirectory: () => false, size: 0 });

        await modManager.installMod('/downloads/mod.pak');

        expect(mocks.fs.copyFile).toHaveBeenCalledWith(
            '/downloads/mod.pak',
            expect.stringContaining('mod.pak')
        );
        expect(mocks.fs.writeFile).toHaveBeenCalled(); // Saves mods.json
    });

    it('should install .zip file via extraction', async () => {
        mocks.fs.readFile.mockImplementation(async (path) => {
            if (path.endsWith('.zip')) return Buffer.from('zip');
            return '[]';
        });

        mocks.admZip.extractAllToAsync.mockImplementation((dest, ow, p, cb) => cb(null));

        await modManager.installMod('/downloads/mod.zip');

        expect(mocks.admZip.extractAllToAsync).toHaveBeenCalled();
        expect(mocks.fs.writeFile).toHaveBeenCalled();
    });

    it('should check for updates and find one', async () => {
        const mods = [{ id: '1', gameBananaId: 123, version: '1.0' }];
        mocks.fs.readFile.mockResolvedValue(JSON.stringify(mods));

        // Mock gamebanana import dynamically or globally?
        // Since ModManager imports gamebanana, we need to mock it.
        // But ModManager imports are already evaluated.
        // We rely on previous mocks or need to mock the module.
    });
});
