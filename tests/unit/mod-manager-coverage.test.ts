import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';

// Hoist mocks
const mocks = vi.hoisted(() => ({
    app: {
        getPath: vi.fn(),
        isPackaged: false
    },
    net: {
        request: vi.fn()
    },
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
    child_process: {
        execFile: vi.fn()
    }
}));

vi.mock('electron', () => ({
    app: mocks.app,
    net: mocks.net,
    shell: { openPath: vi.fn() }
}));

vi.mock('fs/promises', () => ({
    default: mocks.fs,
    ...mocks.fs
}));
vi.mock('child_process', () => mocks.child_process);

import { ModManager } from '../../electron/mod-manager';
import { DownloadManager } from '../../electron/download-manager';

describe('ModManager Coverage Gaps', () => {
    let modManager: ModManager;
    let downloadManager: DownloadManager;

    beforeEach(() => {
        vi.resetAllMocks();
        mocks.app.getPath.mockReturnValue('/app-data');
        downloadManager = new DownloadManager();
        modManager = new ModManager(downloadManager);

        // Default settings
        mocks.fs.readFile.mockResolvedValue(JSON.stringify({ gamePath: '/game' }));
        mocks.fs.mkdir.mockResolvedValue(undefined);
    });

    it('should redeploy enabled mods when priorities are fixed and changed', async () => {
        const mods = [
            { id: '1', name: 'Mod A', priority: 1, isEnabled: true, folderPath: '/mods/ModA' },
            { id: '2', name: 'Mod B', priority: 1, isEnabled: true, folderPath: '/mods/ModB' } // Same priority, should trigger fix
        ];

        mocks.fs.readFile.mockImplementation(async (file: string) => {
            if (file.endsWith('mods.json')) return JSON.stringify(mods);
            if (file.endsWith('settings.json')) return JSON.stringify({ gamePath: '/game' });
            return '';
        });

        mocks.fs.readdir.mockResolvedValue([]); // Empty folder for deployModFiles
        mocks.fs.stat.mockResolvedValue({ isDirectory: () => false, size: 100 });

        await modManager.fixPriorities();

        // Check if priorities were updated (Mod A and Mod B should have different priorities now)
        expect(mocks.fs.writeFile).toHaveBeenCalledWith(expect.stringContaining('mods.json'), expect.any(String));

        // Since both were enabled and priorities changed, deployMod should be called
        // deployMod calls fs.mkdir for paks dir
        expect(mocks.fs.mkdir).toHaveBeenCalledWith(expect.stringContaining('Paks'), expect.any(Object));
    });

    it('should deploy Movies files correctly', async () => {
        const mod = {
            id: '1',
            name: 'Movie Mod',
            priority: 1,
            isEnabled: true,
            folderPath: '/mods/MovieMod'
        };

        mocks.fs.readFile.mockImplementation(async (file: string) => {
             if (file.endsWith('settings.json')) return JSON.stringify({ gamePath: '/game' });
             return '';
        });

        // Mock readdir for recursive scan
        mocks.fs.readdir.mockImplementation(async (dir: string) => {
            if (dir === '/mods/MovieMod') return ['Movies'];
            if (dir === '/mods/MovieMod/Movies') return ['intro.mp4'];
            return [];
        });

        mocks.fs.stat.mockImplementation(async (p: string) => {
            if (p.endsWith('Movies')) return { isDirectory: () => true };
            return { isDirectory: () => false, size: 100 };
        });

        // Mock link success
        mocks.fs.link.mockResolvedValue(undefined);

        await modManager.deployMod(mod as any);

        // Expect link from /mods/MovieMod/Movies/intro.mp4 -> /game/SparkingZERO/Content/Movies/intro.mp4
        // Logic: relative path from Movies dir is 'intro.mp4'
        // Target is contentDir + 'Movies' + relativePath
        expect(mocks.fs.link).toHaveBeenCalledWith(
            expect.stringContaining('intro.mp4'),
            expect.stringContaining('Content/Movies/intro.mp4')
        );
    });

    it('should warn about conflicts when enabling a mod of same category', async () => {
        const mods = [
            { id: '1', name: 'Goku Base', category: 'Characters', isEnabled: true },
            { id: '2', name: 'Goku SSJ', category: 'Characters', isEnabled: false }
        ];

        mocks.fs.readFile.mockImplementation(async (file: string) => {
            if (file.endsWith('mods.json')) return JSON.stringify(mods);
            if (file.endsWith('settings.json')) return JSON.stringify({ gamePath: '/game' });
            return '';
        });

        // Assume deployMod works
        mocks.fs.readdir.mockResolvedValue([]);
        mocks.fs.stat.mockResolvedValue({ isDirectory: () => false });

        const result = await modManager.toggleMod('2', true);

        expect(result.success).toBe(true);
        expect(result.conflict).toContain('Warning: This mod conflicts with "Goku Base"');
    });

    it('should handle calculateFolderSize errors gracefully', async () => {
        mocks.fs.readdir.mockRejectedValue(new Error('Permission denied'));
        const size = await modManager.calculateFolderSize('/restricted/folder');
        expect(size).toBe(0);
    });

    it('should handle unlink errors in deployFile gracefully', async () => {
        const mod = {
            id: '1',
            name: 'Test',
            priority: 1,
            isEnabled: true,
            folderPath: '/mods/Test'
        };

        mocks.fs.readdir.mockImplementation(async (dir) => {
             if (dir === '/mods/Test') return ['file.pak'];
             return [];
        });
        mocks.fs.stat.mockResolvedValue({ isDirectory: () => false });

        // Mock unlink failure (e.g. file busy), then link success
        mocks.fs.unlink.mockRejectedValue(new Error('Busy'));
        mocks.fs.link.mockResolvedValue(undefined);

        await modManager.deployMod(mod as any);

        // Should proceed to link even if unlink failed (it catches internally)
        expect(mocks.fs.link).toHaveBeenCalled();
    });

    it('should handle copy fallback in deployFile', async () => {
         const mod = {
            id: '1',
            name: 'Test',
            priority: 1,
            isEnabled: true,
            folderPath: '/mods/Test'
        };

        mocks.fs.readdir.mockResolvedValue(['file.pak']);
        mocks.fs.stat.mockResolvedValue({ isDirectory: () => false });

        // Link fails with EXDEV (cross-device)
        const err: any = new Error('EXDEV');
        err.code = 'EXDEV';
        mocks.fs.link.mockRejectedValue(err);
        mocks.fs.copyFile.mockResolvedValue(undefined);

        await modManager.deployMod(mod as any);

        expect(mocks.fs.copyFile).toHaveBeenCalled();
    });
});
