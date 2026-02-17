import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';
import { app } from 'electron';
import path from 'path';
import { execFile } from 'child_process';
import { fetchModProfile } from '../../electron/gamebanana';

// Mock Modules
vi.mock('electron', () => ({
    app: {
        getPath: vi.fn((name) => name === 'exe' ? '/app/exe' : '/tmp'),
        isPackaged: false,
    },
    net: { request: vi.fn() },
    shell: { openPath: vi.fn() }
}));

vi.mock('fs/promises', () => ({
    default: {
        readFile: vi.fn(),
        writeFile: vi.fn(),
        mkdir: vi.fn(),
        stat: vi.fn(),
        unlink: vi.fn(),
        readdir: vi.fn(),
        rm: vi.fn(),
        cp: vi.fn(),
        access: vi.fn(),
        link: vi.fn(),
        copyFile: vi.fn(),
    }
}));

vi.mock('child_process', () => ({
    execFile: vi.fn((cmd, args, opts, cb) => cb && cb(null))
}));

// Mock gamebanana to avoid network calls
vi.mock('../../electron/gamebanana', () => ({
    fetchModProfile: vi.fn(),
    searchOnlineMods: vi.fn(),
    getModChangelog: vi.fn(),
    fetchModDetails: vi.fn()
}));

vi.mock('adm-zip', () => ({ default: class {} }));

describe('ModManager Final Backend Coverage', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
        // Setup default mocks
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.readFile as any).mockResolvedValue('[]'); // Default empty array JSON
        (fs.writeFile as any).mockResolvedValue(undefined);
        (fs.stat as any).mockResolvedValue({ isDirectory: () => true, size: 100 });

        // Mock getSettings to return something valid by default
        modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/game/path' });
    });

    describe('deleteProfile', () => {
        it('should return true on successful deletion', async () => {
            const profiles = [{ id: '1', name: 'Test', modIds: [] }];
            (fs.readFile as any).mockResolvedValue(JSON.stringify(profiles));

            const result = await modManager.deleteProfile('1');
            expect(result).toBe(true);
            expect(fs.writeFile).toHaveBeenCalledWith(
                expect.stringContaining('profiles.json'),
                '[]'
            );
        });

        it('should return false on exception', async () => {
            (fs.writeFile as any).mockRejectedValue(new Error('Fail'));
            const result = await modManager.deleteProfile('1');
            expect(result).toBe(false);
        });
    });

    describe('syncActiveProfile', () => {
        it('should do nothing if no active profile is set', async () => {
            modManager.getSettings = vi.fn().mockResolvedValue({}); // No activeProfileId
            // We need to access the private method or trigger it via toggleMod
            // Since it's private, we can't call directly easily without ignoring TS or using toggleMod
            // Let's use toggleMod which calls syncActiveProfile

            // Setup mods.json
            const mods = [{ id: 'm1', name: 'Mod1', isEnabled: false }];
            (fs.readFile as any).mockResolvedValue(JSON.stringify(mods));

            await modManager.toggleMod('m1', true);

            // Verify fs.writeFile was called for mods.json but NOT for profiles.json
            // profiles.json is only written if sync happens
            const calls = (fs.writeFile as any).mock.calls;
            const profileWrites = calls.filter((c: any) => c[0].includes('profiles.json'));
            expect(profileWrites.length).toBe(0);
        });

        it('should sync if active profile is set', async () => {
             modManager.getSettings = vi.fn().mockResolvedValue({ activeProfileId: 'p1' });
             const profiles = [{ id: 'p1', name: 'Profile1', modIds: [] }];
             const mods = [{ id: 'm1', name: 'Mod1', isEnabled: false }];

             // Mock readFile to return mods then profiles (sequence matters if calls are strict)
             // Actually ModManager calls getModsFilePath (readFile) then getProfiles (readFile)
             (fs.readFile as any).mockImplementation((path: string) => {
                 if (path.includes('mods.json')) return Promise.resolve(JSON.stringify(mods));
                 if (path.includes('profiles.json')) return Promise.resolve(JSON.stringify(profiles));
                 return Promise.resolve('[]');
             });

             await modManager.toggleMod('m1', true);

             const calls = (fs.writeFile as any).mock.calls;
             const profileWrites = calls.filter((c: any) => c[0].includes('profiles.json'));
             expect(profileWrites.length).toBeGreaterThan(0);
             const savedProfiles = JSON.parse(profileWrites[0][1]);
             expect(savedProfiles[0].modIds).toContain('m1');
        });
    });

    describe('calculateFolderSize', () => {
        it('should handle errors gracefully and return 0 (or partial size)', async () => {
            (fs.readdir as any).mockRejectedValue(new Error('Access Denied'));
            const size = await modManager.calculateFolderSize('/invalid/path');
            expect(size).toBe(0);
        });
    });

    describe('launchGame', () => {
         it('should throw error if game path not configured', async () => {
             modManager.getSettings = vi.fn().mockResolvedValue({});
             await expect(modManager.launchGame()).rejects.toThrow('Game path not configured');
         });

         it('should search for SparkingZERO.exe if directory is provided', async () => {
             modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/game/dir' });

             // First stat check: directory
             (fs.stat as any).mockResolvedValueOnce({ isDirectory: () => true });

             // First access check (SparkingZERO.exe): fail
             (fs.access as any).mockRejectedValueOnce(new Error('Not found'));

             // Second access check (Binaries): success
             (fs.access as any).mockResolvedValueOnce(undefined);

             await modManager.launchGame();

             expect(execFile).toHaveBeenCalledWith(
                 expect.stringContaining('SparkingZERO-Win64-Shipping.exe'),
                 expect.anything(),
                 expect.anything(),
                 expect.anything()
             );
         });

         it('should throw if no exe found in directory', async () => {
             modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/game/dir' });
             (fs.stat as any).mockResolvedValue({ isDirectory: () => true });
             (fs.access as any).mockRejectedValue(new Error('Not found')); // Fail both

             await expect(modManager.launchGame()).rejects.toThrow('Could not find SparkingZERO.exe');
         });
    });

    describe('installOnlineMod', () => {
        it('should return failure if profile has no files', async () => {
            (fetchModProfile as any).mockResolvedValue({ _aFiles: [] }); // Empty files

            const result = await modManager.installOnlineMod({ gameBananaId: 123 } as any);
            expect(result.success).toBe(false);
            expect(result.message).toContain('No download files found');
        });

        it('should return failure if profile fetch fails (returns null)', async () => {
            (fetchModProfile as any).mockResolvedValue(null);

            const result = await modManager.installOnlineMod({ gameBananaId: 123 } as any);
            expect(result.success).toBe(false);
            expect(result.message).toContain('No download files found');
        });
    });

    describe('setModPriority', () => {
        it('should return false if mod not found', async () => {
            (fs.readFile as any).mockResolvedValue('[]');
            const result = await modManager.setModPriority('999', 'up');
            expect(result).toBe(false);
        });

        it('should return false if moving out of bounds (up from 0)', async () => {
            const mods = [{ id: '1', priority: 1 }];
            (fs.readFile as any).mockResolvedValue(JSON.stringify(mods));
            const result = await modManager.setModPriority('1', 'up');
            // Already at top (index 0), can't move up (index -1)
            expect(result).toBe(false);
        });
    });

    describe('toggleMod Conflict', () => {
         it('should return conflict message', async () => {
             const mods = [
                 { id: '1', name: 'Mod1', category: 'Skins', isEnabled: false },
                 { id: '2', name: 'Mod2', category: 'Skins', isEnabled: true }
             ];
             (fs.readFile as any).mockResolvedValue(JSON.stringify(mods));

             // We need to ensure deployMod returns true so it proceeds
             vi.spyOn(modManager, 'deployMod').mockResolvedValue(true);
             vi.spyOn(modManager as any, 'syncActiveProfile').mockResolvedValue(undefined);

             const result = await modManager.toggleMod('1', true);

             expect(result.success).toBe(true);
             expect(result.conflict).toBeDefined();
             expect(result.conflict).toContain('Mod2');
         });
    });
});
