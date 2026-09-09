import { mockDownloadManager } from './mod-manager.fixture';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';
import { execFile } from 'child_process';
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
    describe('Additional Coverage', () => {
        it('updateAllMods should handle partial failures', async () => {
            const modIds = ['1', '2'];
            modManager.updateMod = vi.fn()
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(false);
            const result = await modManager.updateAllMods(modIds);
            expect(result.successCount).toBe(1);
            expect(result.failCount).toBe(1);
            expect(result.results).toHaveLength(2);
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
    describe('Additional Coverage', () => {
        it('installUE4SS should use fallback if download manager is not present', async () => {
            const noDlManager = new ModManager(undefined);
            noDlManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/p' });
            const { fetchLatestRelease } = await import('../../electron/github');
            (fetchLatestRelease as any).mockResolvedValue('http://ue4ss.zip');
            (noDlManager as any).downloadFile = vi.fn().mockResolvedValue(undefined);
            (noDlManager as any).finalizeUE4SSInstall = vi.fn().mockResolvedValue({ success: true });
            const result = await noDlManager.installUE4SS();
            expect(result.success).toBe(true);
            expect((noDlManager as any).downloadFile).toHaveBeenCalled();
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
    describe('Additional Coverage', () => {
        it('launchGame should catch execFile errors (callback)', async () => {
            modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/game.exe' });
            (fs.stat as any).mockResolvedValue({ isDirectory: () => false });
            (execFile as any).mockImplementation((file, args, opts, cb) => {
                cb(new Error('Spawn failed'));
            });
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            await modManager.launchGame();
            expect(consoleSpy).toHaveBeenCalledWith('Failed to launch game:', expect.any(Error));
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
    describe('Additional Coverage', () => {
        it('toggleMod should warn on category conflict', async () => {
            const mockMods = [
                { id: '1', name: 'A', category: 'Skins', isEnabled: false },
                { id: '2', name: 'B', category: 'Skins', isEnabled: true }
            ];
            (fs.readFile as any).mockResolvedValue(JSON.stringify(mockMods));
            modManager.deployMod = vi.fn().mockResolvedValue(true);
            modManager.syncActiveProfile = vi.fn();
            const result = await modManager.toggleMod('1', true);
            expect(result.success).toBe(true);
            expect(result.conflict).toContain('shares the category');
        });
    });
});
