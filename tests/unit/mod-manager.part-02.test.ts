import { mockDownloadManager } from './mod-manager.fixture';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';
import path from 'path';
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
    describe('Core Functionality', () => {
        it('calculateFolderSize should recurse', async () => {
            (fs.readdir as any).mockImplementation((p: string) => {
                if (p === '/root')
                    return Promise.resolve(['dir', 'file']);
                if (p === '/root/dir')
                    return Promise.resolve(['subfile']);
                return Promise.resolve([]);
            });
            (fs.stat as any).mockImplementation((p: string) => {
                if (p.endsWith('dir'))
                    return Promise.resolve({ isDirectory: () => true, size: 0 });
                return Promise.resolve({ isDirectory: () => false, size: 100 });
            });
            const size = await modManager.calculateFolderSize('/root');
            expect(size).toBe(200);
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
    describe('Core Functionality', () => {
        it('openModsDirectory should handle errors', async () => {
            const electron = await import('electron');
            (electron.shell.openPath as any).mockRejectedValue(new Error('Fail'));
            const result = await modManager.openModsDirectory();
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
    describe('Core Functionality', () => {
        it('syncActiveProfile should handle error', async () => {
            modManager.getSettings = vi.fn()
                .mockResolvedValueOnce({ gamePath: '/p' })
                .mockRejectedValue(new Error('Fail'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const mockMods = [{ id: '1', isEnabled: false }];
            (fs.readFile as any).mockResolvedValue(JSON.stringify(mockMods));
            await modManager.toggleMod('1', true);
            expect(consoleSpy).toHaveBeenCalledWith('Failed to sync active profile', expect.anything());
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
    describe('Profile Management', () => {
        it('should create a profile', async () => {
            const mockMods = [{ id: '1', name: 'Test', isEnabled: true }];
            (fs.readFile as any).mockImplementation((path: string) => {
                if (path.includes('mods.json'))
                    return Promise.resolve(JSON.stringify(mockMods));
                if (path.includes('profiles.json'))
                    return Promise.resolve('[]');
                return Promise.resolve('{}');
            });
            const result = await modManager.createProfile('My Profile');
            expect(result.success).toBe(true);
            expect(fs.writeFile).toHaveBeenCalledWith(expect.stringContaining('profiles.json'), expect.stringContaining('My Profile'));
        });
    });
});
