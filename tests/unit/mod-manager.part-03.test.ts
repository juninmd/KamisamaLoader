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
    describe('Profile Management', () => {
        it('should fail to create profile on error', async () => {
            (fs.writeFile as any).mockRejectedValue(new Error('Fail'));
            const result = await modManager.createProfile('Fail');
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
    describe('Profile Management', () => {
        it('should load a profile', async () => {
            const mockMods = [
                { id: '1', name: 'Mod1', isEnabled: true },
                { id: '2', name: 'Mod2', isEnabled: false }
            ];
            const mockProfiles = [
                { id: 'p1', name: 'P1', modIds: ['2'] }
            ];
            (fs.readFile as any).mockImplementation((path: string) => {
                if (path.includes('mods.json'))
                    return Promise.resolve(JSON.stringify(mockMods));
                if (path.includes('profiles.json'))
                    return Promise.resolve(JSON.stringify(mockProfiles));
                return Promise.resolve('{}');
            });
            modManager.undeployMod = vi.fn().mockResolvedValue(true);
            modManager.deployMod = vi.fn().mockResolvedValue(true);
            const result = await modManager.loadProfile('p1');
            expect(result.success).toBe(true);
            expect(modManager.undeployMod).toHaveBeenCalled();
            expect(modManager.deployMod).toHaveBeenCalled();
            expect(fs.writeFile).toHaveBeenCalledWith(expect.stringContaining('mods.json'), expect.any(String));
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
        it('should handle load profile failure', async () => {
            (fs.readFile as any).mockRejectedValue(new Error('Fail'));
            const result = await modManager.loadProfile('p1');
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
    describe('Profile Management', () => {
        it('should delete a profile', async () => {
            const mockProfiles = [{ id: 'p1', name: 'P1' }];
            (fs.readFile as any).mockResolvedValue(JSON.stringify(mockProfiles));
            const result = await modManager.deleteProfile('p1');
            expect(result).toBe(true);
            expect(fs.writeFile).toHaveBeenCalledWith(expect.stringContaining('profiles.json'), '[]');
        });
    });
});
