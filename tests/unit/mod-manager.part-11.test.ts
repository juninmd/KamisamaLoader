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
    describe('Mod Management Actions', () => {
        it('should handle setModPriority invalid id', async () => {
            (fs.readFile as any).mockResolvedValue('[]');
            const result = await modManager.setModPriority('999', 'up');
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
    describe('Game Launch & Misc', () => {
        it('should launch game', async () => {
            const exePath = '/game/SparkingZERO.exe';
            modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: exePath, launchArgs: '-foo' });
            (fs.stat as any).mockResolvedValue({ isDirectory: () => false });
            await modManager.launchGame();
            expect(execFile).toHaveBeenCalledWith(exePath, expect.arrayContaining(['-fileopenlog', '-foo']), expect.anything(), expect.anything());
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
    describe('Game Launch & Misc', () => {
        it('should resolve game executable from directory', async () => {
            const dirPath = '/game';
            modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: dirPath });
            (fs.stat as any).mockImplementation((p) => {
                if (p === dirPath)
                    return Promise.resolve({ isDirectory: () => true });
                return Promise.resolve({ isDirectory: () => false });
            });
            (fs.access as any).mockResolvedValue(undefined);
            await modManager.launchGame();
            expect(execFile).toHaveBeenCalledWith(expect.stringContaining('SparkingZERO.exe'), expect.anything(), expect.anything(), expect.anything());
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
    describe('Game Launch & Misc', () => {
        it('should fallback to binary search if root exe missing', async () => {
            const dirPath = '/game';
            modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: dirPath });
            (fs.stat as any).mockImplementation((p) => {
                if (p === dirPath)
                    return Promise.resolve({ isDirectory: () => true });
                return Promise.resolve({ isDirectory: () => false });
            });
            (fs.access as any).mockImplementationOnce(() => Promise.reject('No'))
                .mockImplementationOnce(() => Promise.resolve());
            await modManager.launchGame();
            expect(execFile).toHaveBeenCalledWith(expect.stringContaining('SparkingZERO-Win64-Shipping.exe'), expect.anything(), expect.anything(), expect.anything());
        });
    });
});
