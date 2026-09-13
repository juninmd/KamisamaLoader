import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';

vi.mock('fs/promises', () => ({
    default: {
        readFile: vi.fn(),
        writeFile: vi.fn(),
        unlink: vi.fn(),
        readdir: vi.fn(),
        mkdir: vi.fn(),
        cp: vi.fn(),
        rm: vi.fn()
    }
}));

const mockFetchModProfile = vi.fn();
vi.mock('../../electron/gamebanana', () => ({
    getModDetails: vi.fn(),
    fetchItemData: vi.fn(),
    downloadModFiles: vi.fn(),
    fetchModProfile: (...args: any[]) => mockFetchModProfile(...args)
}));

vi.mock('electron', () => ({
    app: {
        getPath: vi.fn(() => '/userData'),
        isPackaged: false
    }
}));

vi.mock('../../electron/settings', () => ({
    getSettings: vi.fn(() => ({ gamePath: '/test/game' }))
}));

describe('ModManager - Download Cleanup coverage', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
    });

    it('should call cleanup when onFailed is triggered', async () => {
         modManager.getModsFilePath = vi.fn().mockResolvedValue('/mods.json');
         modManager.calculateFolderSize = vi.fn().mockResolvedValue(100);
         modManager.extractZip = vi.fn().mockResolvedValue(true);
         modManager.deployMod = vi.fn().mockResolvedValue(true);

         const downloadManager = {
              startDownload: vi.fn().mockReturnValue('mock-id'),
              removeListener: vi.fn(),
              failDownload: vi.fn(),
              emit: vi.fn(),
              on: vi.fn()
         };
         (modManager as any).downloadManager = downloadManager;

         mockFetchModProfile.mockResolvedValue({
             _aFiles: [{ _idRow: 500, _sDownloadUrl: 'http://test' }],
             _sName: 'Test',
             _aSubmitter: { _sName: 'TestAuthor' }
         });

         const mod = {
            id: '123',
            name: 'Test Mod',
            gameBananaId: 100,
            latestFileId: 500,
            version: '1.0'
         };

         const result = await modManager.installOnlineMod(mod as any);
         expect(result.success).toBe(true);

         const failListener = (downloadManager.on as any).mock.calls.find((c: any) => c[0] === 'download-failed')?.[1];
         expect(failListener).toBeDefined();

         // Call failListener directly to trigger the branch handling failure
         failListener('mock-id');

         expect(downloadManager.removeListener).toHaveBeenCalledTimes(2);
    });

    it('should ignore onFailed if id does not match', async () => {
         modManager.getModsFilePath = vi.fn().mockResolvedValue('/mods.json');
         modManager.calculateFolderSize = vi.fn().mockResolvedValue(100);
         modManager.extractZip = vi.fn().mockResolvedValue(true);
         modManager.deployMod = vi.fn().mockResolvedValue(true);

         const downloadManager = {
              startDownload: vi.fn().mockReturnValue('mock-id'),
              removeListener: vi.fn(),
              failDownload: vi.fn(),
              emit: vi.fn(),
              on: vi.fn()
         };
         (modManager as any).downloadManager = downloadManager;

         mockFetchModProfile.mockResolvedValue({
             _aFiles: [{ _idRow: 500, _sDownloadUrl: 'http://test' }],
             _sName: 'Test',
             _aSubmitter: { _sName: 'TestAuthor' }
         });

         const mod = {
            id: '123',
            name: 'Test Mod',
            gameBananaId: 100,
            latestFileId: 500,
            version: '1.0'
         };

         const result = await modManager.installOnlineMod(mod as any);
         expect(result.success).toBe(true);

         const failListener = (downloadManager.on as any).mock.calls.find((c: any) => c[0] === 'download-failed')?.[1];

         // Trigger with different id
         failListener('other-id');

         expect(downloadManager.removeListener).toHaveBeenCalledTimes(0);
    });
});
