import { mocks } from './mod-manager-coverage.fixture';
import { completeFileSystemDouble } from '../mock-fs-defaults';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import { ModManager } from '../../electron/mod-manager';
import { DownloadManager } from '../../electron/download-manager';
describe('ModManager Coverage Gaps', () => {
    let modManager: ModManager;
    let downloadManager: DownloadManager;
    beforeEach(async () => {
        vi.resetAllMocks();
        await completeFileSystemDouble();
        mocks.app.getPath.mockReturnValue('/app-data');
        downloadManager = new DownloadManager();
        modManager = new ModManager(downloadManager);
        mocks.fs.readFile.mockResolvedValue(JSON.stringify({ gamePath: '/game' }));
        mocks.fs.mkdir.mockResolvedValue(undefined);
    });
    it('should redeploy enabled mods when priorities are fixed and changed', async () => {
        const mods = [
            { id: '1', name: 'Mod A', priority: 1, isEnabled: true, folderPath: '/mods/ModA' },
            { id: '2', name: 'Mod B', priority: 1, isEnabled: true, folderPath: '/mods/ModB' }
        ];
        mocks.fs.readFile.mockImplementation(async (file: string) => {
            if (file.endsWith('mods.json'))
                return JSON.stringify(mods);
            if (file.endsWith('settings.json'))
                return JSON.stringify({ gamePath: '/game' });
            return '';
        });
        mocks.fs.readdir.mockResolvedValue([]);
        mocks.fs.stat.mockResolvedValue({ isDirectory: () => false, size: 100 });
        await modManager.fixPriorities();
        expect(mocks.fs.writeFile).toHaveBeenCalledWith(expect.stringContaining('mods.json'), expect.any(String));
        expect(mocks.fs.mkdir).toHaveBeenCalledWith(expect.stringContaining('Paks'), expect.any(Object));
    });
});
describe('ModManager Coverage Gaps', () => {
    let modManager: ModManager;
    let downloadManager: DownloadManager;
    beforeEach(async () => {
        vi.resetAllMocks();
        await completeFileSystemDouble();
        mocks.app.getPath.mockReturnValue('/app-data');
        downloadManager = new DownloadManager();
        modManager = new ModManager(downloadManager);
        mocks.fs.readFile.mockResolvedValue(JSON.stringify({ gamePath: '/game' }));
        mocks.fs.mkdir.mockResolvedValue(undefined);
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
            if (file.endsWith('settings.json'))
                return JSON.stringify({ gamePath: '/game' });
            return '';
        });
        mocks.fs.readdir.mockImplementation(async (dir: string) => {
            if (dir === '/mods/MovieMod')
                return ['Movies'];
            if (dir === '/mods/MovieMod/Movies')
                return ['intro.mp4'];
            return [];
        });
        mocks.fs.stat.mockImplementation(async (p: string) => {
            if (p.endsWith('Movies'))
                return { isDirectory: () => true };
            return { isDirectory: () => false, size: 100 };
        });
        mocks.fs.link.mockResolvedValue(undefined);
        await modManager.deployMod(mod as any);
        expect(mocks.fs.link).toHaveBeenCalledWith(expect.stringContaining('intro.mp4'), expect.stringContaining(path.join('Content', 'Movies', 'intro.mp4')));
    });
});
describe('ModManager Coverage Gaps', () => {
    let modManager: ModManager;
    let downloadManager: DownloadManager;
    beforeEach(async () => {
        vi.resetAllMocks();
        await completeFileSystemDouble();
        mocks.app.getPath.mockReturnValue('/app-data');
        downloadManager = new DownloadManager();
        modManager = new ModManager(downloadManager);
        mocks.fs.readFile.mockResolvedValue(JSON.stringify({ gamePath: '/game' }));
        mocks.fs.mkdir.mockResolvedValue(undefined);
    });
    it('should warn about conflicts when enabling a mod of same category', async () => {
        const mods = [
            { id: '1', name: 'Goku Base', category: 'Characters', isEnabled: true },
            { id: '2', name: 'Goku SSJ', category: 'Characters', isEnabled: false }
        ];
        mocks.fs.readFile.mockImplementation(async (file: string) => {
            if (file.endsWith('mods.json'))
                return JSON.stringify(mods);
            if (file.endsWith('settings.json'))
                return JSON.stringify({ gamePath: '/game' });
            return '';
        });
        mocks.fs.readdir.mockResolvedValue([]);
        mocks.fs.stat.mockResolvedValue({ isDirectory: () => false });
        const result = await modManager.toggleMod('2', true);
        expect(result.success).toBe(true);
        expect(result.conflict).toContain('shares the category');
    });
});
describe('ModManager Coverage Gaps', () => {
    let modManager: ModManager;
    let downloadManager: DownloadManager;
    beforeEach(async () => {
        vi.resetAllMocks();
        await completeFileSystemDouble();
        mocks.app.getPath.mockReturnValue('/app-data');
        downloadManager = new DownloadManager();
        modManager = new ModManager(downloadManager);
        mocks.fs.readFile.mockResolvedValue(JSON.stringify({ gamePath: '/game' }));
        mocks.fs.mkdir.mockResolvedValue(undefined);
    });
    it('should handle calculateFolderSize errors gracefully', async () => {
        mocks.fs.readdir.mockRejectedValue(new Error('Permission denied'));
        const size = await modManager.calculateFolderSize('/restricted/folder');
        expect(size).toBe(0);
    });
});
