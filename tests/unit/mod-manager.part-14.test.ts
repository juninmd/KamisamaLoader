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
    describe('Install Local Mod', () => {
        it('should install zip', async () => {
            const zipPath = '/dl/mod.zip';
            const modManager = new ModManager(mockDownloadManager as any);
            (fs.readFile as any).mockImplementation((path) => {
                if (path === zipPath)
                    return Promise.resolve(Buffer.from('zip'));
                return Promise.resolve('[]');
            });
            const install = vi.spyOn(modManager, 'installPackage').mockResolvedValue(undefined);
            const result = await modManager.installMod(zipPath);
            expect(result.success).toBe(true);
            expect(install).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ name: 'mod' }), expect.any(String));
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
    describe('Install Local Mod', () => {
        it('should install non-zip', async () => {
            const pakPath = '/dl/mod.pak';
            (fs.readFile as any).mockResolvedValue('[]');
            (fs.copyFile as any).mockResolvedValue(undefined);
            const install = vi.spyOn(modManager, 'installPackage').mockResolvedValue(undefined);
            const result = await modManager.installMod(pakPath);
            expect(result.success).toBe(true);
            expect(install).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ name: 'mod' }), expect.any(String));
            expect(fs.copyFile).toHaveBeenCalled();
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
    describe('Install Local Mod', () => {
        it('should handle install error', async () => {
            (fs.copyFile as any).mockRejectedValue(new Error('Fail'));
            const result = await modManager.installMod('mod.pak');
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
    describe('Additional Coverage', () => {
        it('fixPriorities should do nothing if order is already correct', async () => {
            const mockMods = [
                { id: '1', priority: 2, name: 'A', isEnabled: true },
                { id: '2', priority: 1, name: 'B', isEnabled: true }
            ];
            (fs.readFile as any).mockResolvedValue(JSON.stringify(mockMods));
            const writeSpy = vi.spyOn(fs, 'writeFile');
            await modManager.fixPriorities();
            expect(writeSpy).not.toHaveBeenCalled();
        });
    });
});
