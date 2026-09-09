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
    describe('Advanced Deployment Logic', () => {
        it('should handle UE4SS mods.txt update failure gracefully', async () => {
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
                if (typeof p === 'string' && (p.endsWith('ue4ss') || p.endsWith('Mods') || p.endsWith('MyMod') || p === mod.folderPath)) {
                    return Promise.resolve({ isDirectory: () => true });
                }
                return Promise.resolve({ isDirectory: () => false });
            });
            (fs.link as any).mockResolvedValue(undefined);
            (fs.readFile as any).mockImplementation((p) => {
                if (p.includes('mods.txt'))
                    return Promise.reject(new Error('Fail'));
                return Promise.resolve('[]');
            });
            await modManager.deployMod(mod as any);
            expect(fs.link).toHaveBeenCalled();
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
        it('should deploy LogicMods correctly', async () => {
            const mod = { id: '1', name: 'Logic', folderPath: '/mods/Logic', isEnabled: true };
            const logicDir = '/mods/Logic/LogicMods';
            const pakPath = '/mods/Logic/LogicMods/logic.pak';
            (fs.readdir as any).mockImplementation((dir) => {
                if (dir === mod.folderPath)
                    return Promise.resolve(['LogicMods']);
                if (dir === logicDir)
                    return Promise.resolve(['logic.pak']);
                return Promise.resolve([]);
            });
            (fs.stat as any).mockImplementation((p) => {
                if (p === mod.folderPath || p === logicDir)
                    return Promise.resolve({ isDirectory: () => true });
                return Promise.resolve({ isDirectory: () => false });
            });
            await modManager.deployMod(mod as any);
            expect(fs.link).toHaveBeenCalledWith(pakPath, expect.stringContaining('LogicMods'));
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
    describe('Non-destructive Deployment', () => {
        it('should NOT wipe the destination directory on deploy', async () => {
            const mod = { id: '1', name: 'SafeMod', folderPath: '/mods/SafeMod', isEnabled: true };
            const pakPath = '/mods/SafeMod/safe.pak';
            (fs.readdir as any).mockImplementation((dir) => {
                if (dir === mod.folderPath)
                    return Promise.resolve(['safe.pak']);
                return Promise.resolve([]);
            });
            (fs.stat as any).mockImplementation((p) => {
                if (p === mod.folderPath)
                    return Promise.resolve({ isDirectory: () => true });
                return Promise.resolve({ isDirectory: () => false });
            });
            const rmSpy = vi.spyOn(fs, 'rm');
            const rmdirSpy = vi.spyOn(fs, 'rmdir');
            await modManager.deployMod(mod as any);
            expect(fs.link).toHaveBeenCalledWith(pakPath, expect.stringContaining('~mods'));
            expect(rmSpy).not.toHaveBeenCalledWith(expect.stringContaining('~mods'), expect.objectContaining({ recursive: true }));
            expect(rmdirSpy).not.toHaveBeenCalledWith(expect.stringContaining('~mods'), expect.anything());
        });
    });
});
