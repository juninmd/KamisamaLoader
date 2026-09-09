import { mockDownloadManager } from './mod-manager.fixture';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';
describe('ModManager', () => {
    let modManager: ModManager;
    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager(mockDownloadManager as any);
        modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/mock/game/path', activeProfileId: 'p1' });
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.readFile as any).mockResolvedValue('[]');
        (fs.writeFile as any).mockResolvedValue(undefined);
        (fs.stat as any).mockImplementation(() => Promise.resolve({
            isDirectory: () => false,
            size: 100
        }));
        (fs.readdir as any).mockResolvedValue([]);
        (fs.unlink as any).mockResolvedValue(undefined);
        (fs.rm as any).mockResolvedValue(undefined);
        (fs.rename as any).mockResolvedValue(undefined);
        (fs.copyFile as any).mockResolvedValue(undefined);
        (fs.link as any).mockResolvedValue(undefined);
    });
    describe('Updates', () => {
        it('should handle update error', async () => {
            (fs.readFile as any).mockRejectedValue(new Error('Fail'));
            const result = await modManager.updateMod('1');
            expect(result).toBe(false);
        });
    });
});
describe('ModManager', () => {
    let modManager: ModManager;
    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager(mockDownloadManager as any);
        modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/mock/game/path', activeProfileId: 'p1' });
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.readFile as any).mockResolvedValue('[]');
        (fs.writeFile as any).mockResolvedValue(undefined);
        (fs.stat as any).mockImplementation(() => Promise.resolve({
            isDirectory: () => false,
            size: 100
        }));
        (fs.readdir as any).mockResolvedValue([]);
        (fs.unlink as any).mockResolvedValue(undefined);
        (fs.rm as any).mockResolvedValue(undefined);
        (fs.rename as any).mockResolvedValue(undefined);
        (fs.copyFile as any).mockResolvedValue(undefined);
        (fs.link as any).mockResolvedValue(undefined);
    });
    describe('UE4SS', () => {
        it('should install UE4SS', async () => {
            const { fetchLatestRelease } = await import('../../electron/github');
            (fetchLatestRelease as any).mockResolvedValue('http://ue4ss.zip');
            mockDownloadManager.startDownload.mockReturnValue('dl-ue4ss');
            const promise = modManager.installUE4SS();
            await new Promise(r => setTimeout(r, 0));
            const calls = mockDownloadManager.on.mock.calls;
            const call = calls.find((c: any) => c[0] === 'download-completed');
            expect(call).toBeDefined();
            const onComplete = call[1];
            await onComplete('dl-ue4ss');
            expect(mockDownloadManager.startDownload).toHaveBeenCalledWith('http://ue4ss.zip', expect.any(String), expect.any(String), expect.anything());
        });
    });
});
describe('ModManager', () => {
    let modManager: ModManager;
    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager(mockDownloadManager as any);
        modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/mock/game/path', activeProfileId: 'p1' });
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.readFile as any).mockResolvedValue('[]');
        (fs.writeFile as any).mockResolvedValue(undefined);
        (fs.stat as any).mockImplementation(() => Promise.resolve({
            isDirectory: () => false,
            size: 100
        }));
        (fs.readdir as any).mockResolvedValue([]);
        (fs.unlink as any).mockResolvedValue(undefined);
        (fs.rm as any).mockResolvedValue(undefined);
        (fs.rename as any).mockResolvedValue(undefined);
        (fs.copyFile as any).mockResolvedValue(undefined);
        (fs.link as any).mockResolvedValue(undefined);
    });
    describe('UE4SS', () => {
        it('should fail install UE4SS if game path missing', async () => {
            modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '' });
            const result = await modManager.installUE4SS();
            expect(result.success).toBe(false);
        });
    });
});
describe('ModManager', () => {
    let modManager: ModManager;
    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager(mockDownloadManager as any);
        modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/mock/game/path', activeProfileId: 'p1' });
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.readFile as any).mockResolvedValue('[]');
        (fs.writeFile as any).mockResolvedValue(undefined);
        (fs.stat as any).mockImplementation(() => Promise.resolve({
            isDirectory: () => false,
            size: 100
        }));
        (fs.readdir as any).mockResolvedValue([]);
        (fs.unlink as any).mockResolvedValue(undefined);
        (fs.rm as any).mockResolvedValue(undefined);
        (fs.rename as any).mockResolvedValue(undefined);
        (fs.copyFile as any).mockResolvedValue(undefined);
        (fs.link as any).mockResolvedValue(undefined);
    });
    describe('UE4SS', () => {
        it('should resolve a UE4SS download failure', async () => {
            const { fetchLatestRelease } = await import('../../electron/github');
            (fetchLatestRelease as any).mockResolvedValue('http://ue4ss.zip');
            mockDownloadManager.startDownload.mockReturnValue('dl-ue4ss-failed');
            const promise = modManager.installUE4SS();
            await new Promise(r => setTimeout(r, 0));
            const failure = mockDownloadManager.on.mock.calls
                .find((call: any) => call[0] === 'download-failed');
            expect(failure).toBeDefined();
            failure[1]('dl-ue4ss-failed', 'Network Error');
            await expect(promise).resolves.toEqual({ success: false, message: 'Network Error' });
        });
    });
});
