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
        it('should handle individual update check failure', async () => {
            const mockMods = [{ id: '1', gameBananaId: 100 }];
            (fs.readFile as any).mockResolvedValue(JSON.stringify(mockMods));
            const { fetchModProfile } = await import('../../electron/gamebanana');
            (fetchModProfile as any).mockRejectedValue(new Error('Fail'));
            const updates = await modManager.checkForUpdates();
            expect(updates).toEqual([]);
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
    describe('Updates', () => {
        it('should update a mod', async () => {
            const mockMods = [{ id: '1', name: 'TestMod', gameBananaId: 100, latestFileUrl: 'http://update', hasUpdate: true }];
            (fs.readFile as any).mockResolvedValue(JSON.stringify(mockMods));
            mockDownloadManager.startDownload.mockReturnValue('dl-1');
            const promise = modManager.updateMod('1');
            await new Promise(r => setTimeout(r, 0));
            const calls = mockDownloadManager.on.mock.calls;
            const call = calls.find((c: any) => c[0] === 'download-completed');
            expect(call).toBeDefined();
            const onComplete = call[1];
            await onComplete('dl-1');
            expect(fs.unlink).toHaveBeenCalled();
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
    describe('Updates', () => {
        it('should resolve false when an update download fails', async () => {
            (fs.readFile as any).mockResolvedValue(JSON.stringify([
                { id: '1', latestFileUrl: 'http://update' }
            ]));
            mockDownloadManager.startDownload.mockReturnValue('dl-failed');
            const promise = modManager.updateMod('1');
            await new Promise(r => setTimeout(r, 0));
            const failure = mockDownloadManager.on.mock.calls
                .find((call: any) => call[0] === 'download-failed');
            expect(failure).toBeDefined();
            failure[1]('dl-failed', 'Network Error');
            await expect(promise).resolves.toBe(false);
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
    describe('Updates', () => {
        it('should return false update if download manager missing', async () => {
            const noDlManager = new ModManager(undefined);
            noDlManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/p' });
            const mockMods = [{ id: '1', latestFileUrl: 'url' }];
            (fs.readFile as any).mockResolvedValue(JSON.stringify(mockMods));
            const result = await noDlManager.updateMod('1');
            expect(result).toBe(false);
        });
    });
});
