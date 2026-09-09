import { mockDownloadManager } from './mod-manager.fixture';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';
import { execFile } from 'child_process';
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
    describe('Game Launch & Misc', () => {
        it('should fail launch if path invalid', async () => {
            modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '' });
            await expect(modManager.launchGame()).rejects.toThrow();
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
        it('should handle launch execution error', async () => {
            const exePath = '/game/SparkingZERO.exe';
            modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: exePath });
            (fs.stat as any).mockResolvedValue({ isDirectory: () => false });
            (execFile as any).mockImplementation((path, args, opts, cb) => {
                cb(new Error('Launch failed'));
            });
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            await modManager.launchGame();
            expect(consoleSpy).toHaveBeenCalledWith('Failed to launch game:', expect.anything());
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
    describe('Advanced Deployment Logic', () => {
        it('should deploy UE4SS mods correctly', async () => {
            const mod = { id: '1', name: 'UE4SSMod', folderPath: '/mods/UE4SSMod', isEnabled: true };
            const ue4ssPath = '/mods/UE4SSMod/ue4ss';
            const modsDir = '/mods/UE4SSMod/ue4ss/Mods';
            const myModDir = '/mods/UE4SSMod/ue4ss/Mods/MyMod';
            const modDllPath = '/mods/UE4SSMod/ue4ss/Mods/MyMod/main.dll';
            (fs.readdir as any).mockImplementation((dir) => {
                if (dir === mod.folderPath)
                    return Promise.resolve(['ue4ss']);
                if (dir === ue4ssPath)
                    return Promise.resolve(['Mods']);
                if (dir === modsDir)
                    return Promise.resolve(['MyMod']);
                if (dir === myModDir)
                    return Promise.resolve(['main.dll']);
                return Promise.resolve([]);
            });
            (fs.stat as any).mockImplementation((p) => {
                if (p === mod.folderPath || p === ue4ssPath || p === modsDir || p === myModDir) {
                    return Promise.resolve({ isDirectory: () => true });
                }
                return Promise.resolve({ isDirectory: () => false });
            });
            (fs.readFile as any).mockImplementation((path) => {
                if (path.includes('mods.txt'))
                    return Promise.resolve('OtherMod : 1\n');
                return Promise.resolve('[]');
            });
            await modManager.deployMod(mod as any);
            expect(fs.link).toHaveBeenCalledWith(modDllPath, expect.stringContaining('Binaries'));
            expect(fs.writeFile).toHaveBeenCalledWith(expect.stringContaining('mods.txt'), expect.stringContaining('MyMod : 1'));
        });
    });
});
