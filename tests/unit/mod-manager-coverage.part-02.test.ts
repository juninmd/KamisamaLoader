import { mocks } from './mod-manager-coverage.fixture';
import { completeFileSystemDouble } from '../mock-fs-defaults';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
    it('should handle unlink errors in deployFile gracefully', async () => {
        const mod = {
            id: '1',
            name: 'Test',
            priority: 1,
            isEnabled: true,
            folderPath: '/mods/Test'
        };
        mocks.fs.readdir.mockImplementation(async (dir) => {
            if (dir === '/mods/Test')
                return ['file.pak'];
            return [];
        });
        mocks.fs.stat.mockResolvedValue({ isDirectory: () => false });
        mocks.fs.unlink.mockRejectedValue(new Error('Busy'));
        mocks.fs.link.mockResolvedValue(undefined);
        await modManager.deployMod(mod as any);
        expect(mocks.fs.link).toHaveBeenCalled();
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
        const err: any = new Error('EXDEV');
        err.code = 'EXDEV';
        mocks.fs.link.mockRejectedValue(err);
        mocks.fs.copyFile.mockResolvedValue(undefined);
        await modManager.deployMod(mod as any);
        expect(mocks.fs.copyFile).toHaveBeenCalled();
    });
});
