import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';
import { execFile } from 'child_process';
import path from 'path';

// Mock child_process
vi.mock('child_process', () => {
    const execFileMock = vi.fn((path, args, opts, cb) => {
        if (typeof opts === 'function') {
            cb = opts;
            opts = {};
        }
        if (cb) cb(null);
    });
    return {
        execFile: execFileMock,
        default: { execFile: execFileMock }
    };
});

// Mock electron app
vi.mock('electron', () => ({
    app: {
        getPath: vi.fn((name) => name === 'exe' ? '/app/exe' : '/tmp'),
        isPackaged: false,
    },
    net: {
        request: vi.fn(),
    },
    shell: {
        openPath: vi.fn()
    }
}));

// Mock fs/promises (default export)
vi.mock('fs/promises', () => ({
    default: {
        readFile: vi.fn(),
        writeFile: vi.fn(),
        mkdir: vi.fn(),
        stat: vi.fn(),
        unlink: vi.fn(),
        readdir: vi.fn(),
        rm: vi.fn(),
        rmdir: vi.fn(),
        cp: vi.fn(),
        access: vi.fn(),
        link: vi.fn(),
        copyFile: vi.fn(),
    }
}));

// Mock fs (named exports + default)
vi.mock('fs', () => {
    const createWriteStream = vi.fn();
    return {
        createWriteStream,
        default: { createWriteStream }
    };
});

// Mock gamebanana
vi.mock('../../electron/gamebanana', () => ({
    fetchModProfile: vi.fn(),
    searchOnlineMods: vi.fn(),
    getModChangelog: vi.fn(),
    fetchModDetails: vi.fn(),
    fetchLatestRelease: vi.fn()
}));

// Mock github
vi.mock('../../electron/github', () => ({
    fetchLatestRelease: vi.fn()
}));

// Mock adm-zip
vi.mock('adm-zip', () => {
    return {
        default: class {
            constructor() { }
            extractAllTo = vi.fn();
            extractAllToAsync = vi.fn((dest, overwrite, keepPerms, cb) => {
                if (cb) cb(null);
            });
        }
    };
});

// Mock download manager
const mockDownloadManager = {
    startDownload: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn()
};

describe('ModManager', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager(mockDownloadManager as any);
        // Default settings mock
        modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/mock/game/path', activeProfileId: 'p1' });
        // Default fs behavior
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
        (fs.copyFile as any).mockResolvedValue(undefined);
        (fs.link as any).mockResolvedValue(undefined);
    });

    describe('Core Functionality', () => {
        it('ensureModsDir should create directory', async () => {
            const dir = await modManager.ensureModsDir();
            expect(fs.mkdir).toHaveBeenCalledWith(expect.stringContaining('Mods'), { recursive: true });
            expect(dir).toContain('Mods');
        });

        it('ensureModsDir should handle error', async () => {
            (fs.mkdir as any).mockRejectedValue(new Error('Fail'));
            const dir = await modManager.ensureModsDir();
            expect(dir).toBeNull();
        });

        it('getInstalledMods should return mods', async () => {
            const mockMods = [{ id: '1', name: 'Test', priority: 1 }];
            (fs.readFile as any).mockResolvedValue(JSON.stringify(mockMods));
            const mods = await modManager.getInstalledMods();
            expect(mods).toHaveLength(1);
            expect(mods[0].name).toBe('Test');
        });

        it('getInstalledMods should handle error', async () => {
            (fs.readFile as any).mockRejectedValue(new Error('Fail'));
            const mods = await modManager.getInstalledMods();
            expect(mods).toEqual([]);
        });

        it('calculateFolderSize should handle errors', async () => {
            (fs.readdir as any).mockRejectedValue(new Error('Fail'));
            const size = await modManager.calculateFolderSize('/path');
            expect(size).toBe(0);
        });

        it('calculateFolderSize should recurse', async () => {
            (fs.readdir as any).mockImplementation((p: string) => {
                if (p === '/root') return Promise.resolve(['dir', 'file']);
                if (p === '/root/dir') return Promise.resolve(['subfile']);
                return Promise.resolve([]);
            });
            (fs.stat as any).mockImplementation((p: string) => {
                if (p.endsWith('dir')) return Promise.resolve({ isDirectory: () => true, size: 0 });
                return Promise.resolve({ isDirectory: () => false, size: 100 });
            });

            const size = await modManager.calculateFolderSize('/root');
            expect(size).toBe(200); // file + subfile
        });

        it('openModsDirectory should handle errors', async () => {
            const electron = await import('electron');
            (electron.shell.openPath as any).mockRejectedValue(new Error('Fail'));
            const result = await modManager.openModsDirectory();
            expect(result).toBe(false);
        });

        it('syncActiveProfile should handle error', async () => {
            // Mock getSettings: Succeed for deployMod, Fail for syncActiveProfile
            modManager.getSettings = vi.fn()
                .mockResolvedValueOnce({ gamePath: '/p' }) // deployMod
                .mockRejectedValue(new Error('Fail')); // syncActiveProfile

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const mockMods = [{ id: '1', isEnabled: false }];
            (fs.readFile as any).mockResolvedValue(JSON.stringify(mockMods));

            await modManager.toggleMod('1', true);
            expect(consoleSpy).toHaveBeenCalledWith('Failed to sync active profile', expect.anything());
        });
    });

    describe('Profile Management', () => {
        it('should create a profile', async () => {
            const mockMods = [{ id: '1', name: 'Test', isEnabled: true }];
            (fs.readFile as any).mockImplementation((path: string) => {
                if (path.includes('mods.json')) return Promise.resolve(JSON.stringify(mockMods));
                if (path.includes('profiles.json')) return Promise.resolve('[]');
                return Promise.resolve('{}');
            });

            const result = await modManager.createProfile('My Profile');
            expect(result.success).toBe(true);
            expect(fs.writeFile).toHaveBeenCalledWith(
                expect.stringContaining('profiles.json'),
                expect.stringContaining('My Profile')
            );
        });

        it('should fail to create profile on error', async () => {
            (fs.writeFile as any).mockRejectedValue(new Error('Fail'));
            const result = await modManager.createProfile('Fail');
            expect(result.success).toBe(false);
        });

        it('should load a profile', async () => {
            const mockMods = [
                { id: '1', name: 'Mod1', isEnabled: true },
                { id: '2', name: 'Mod2', isEnabled: false }
            ];
            const mockProfiles = [
                { id: 'p1', name: 'P1', modIds: ['2'] } // Should enable 2, disable 1
            ];

            (fs.readFile as any).mockImplementation((path: string) => {
                if (path.includes('mods.json')) return Promise.resolve(JSON.stringify(mockMods));
                if (path.includes('profiles.json')) return Promise.resolve(JSON.stringify(mockProfiles));
                return Promise.resolve('{}');
            });

            // Mock undeploy/deploy
            modManager.undeployMod = vi.fn().mockResolvedValue(true);
            modManager.deployMod = vi.fn().mockResolvedValue(true);

            const result = await modManager.loadProfile('p1');
            expect(result.success).toBe(true);

            // Verify Mod1 disabled (undeployed), Mod2 enabled (deployed)
            expect(modManager.undeployMod).toHaveBeenCalled();
            expect(modManager.deployMod).toHaveBeenCalled();

            expect(fs.writeFile).toHaveBeenCalledWith(
                expect.stringContaining('mods.json'),
                expect.any(String)
            );
        });

        it('should handle load profile failure', async () => {
            (fs.readFile as any).mockRejectedValue(new Error('Fail'));
            const result = await modManager.loadProfile('p1');
            expect(result.success).toBe(false);
        });

        it('should delete a profile', async () => {
            const mockProfiles = [{ id: 'p1', name: 'P1' }];
            (fs.readFile as any).mockResolvedValue(JSON.stringify(mockProfiles));

            const result = await modManager.deleteProfile('p1');
            expect(result).toBe(true);
            expect(fs.writeFile).toHaveBeenCalledWith(
                expect.stringContaining('profiles.json'),
                '[]'
            );
        });

        it('should handle delete profile failure', async () => {
            (fs.writeFile as any).mockRejectedValue(new Error('Fail'));
            const result = await modManager.deleteProfile('p1');
            expect(result).toBe(false);
        });
    });

    describe('Settings', () => {
        it('should save settings and move mods if path changed', async () => {
            modManager.ensureModsDir = vi.fn().mockResolvedValue('/old');
            (fs.readFile as any).mockResolvedValue('{}');

            const result = await modManager.saveSettings({ gamePath: 'p', modDownloadPath: '/new' });
            expect(result).toBe(true);
            expect(fs.mkdir).toHaveBeenCalledWith('/new', expect.anything());
            expect(fs.writeFile).toHaveBeenCalledWith(
                path.join('/new', 'settings.json'),
                expect.anything()
            );
        });

        it('should handle save settings error', async () => {
            (fs.writeFile as any).mockRejectedValue(new Error('Fail'));
            const result = await modManager.saveSettings({ gamePath: 'p' });
            expect(result).toBe(false);
        });
    });

    describe('Updates', () => {
        it('should check for updates', async () => {
            const mockMods = [{ id: '1', gameBananaId: 100, version: '1.0' }];
            (fs.readFile as any).mockResolvedValue(JSON.stringify(mockMods));

            const { fetchModProfile } = await import('../../electron/gamebanana');
            (fetchModProfile as any).mockResolvedValue({
                _sVersion: '2.0',
                _aFiles: [{ _idRow: 999, _sDownloadUrl: 'url' }]
            });

            const updates = await modManager.checkForUpdates();
            expect(updates).toHaveLength(1);
            expect(updates[0]).toBe('1');
        });

        it('should handle individual update check failure', async () => {
            const mockMods = [{ id: '1', gameBananaId: 100 }];
            (fs.readFile as any).mockResolvedValue(JSON.stringify(mockMods));
            const { fetchModProfile } = await import('../../electron/gamebanana');
            (fetchModProfile as any).mockRejectedValue(new Error('Fail'));

            const updates = await modManager.checkForUpdates();
            expect(updates).toEqual([]);
        });

        it('should update a mod', async () => {
            const mockMods = [{ id: '1', name: 'TestMod', gameBananaId: 100, latestFileUrl: 'http://update', hasUpdate: true }];
            (fs.readFile as any).mockResolvedValue(JSON.stringify(mockMods));

            mockDownloadManager.startDownload.mockReturnValue('dl-1');

            // We don't await immediately because it waits for the event
            const promise = modManager.updateMod('1');

            // Wait for next tick to ensure 'on' is called
            await new Promise(r => setTimeout(r, 0));

            // Simulate download completion
            const calls = mockDownloadManager.on.mock.calls;
            // We need to find the listener for 'download-completed'
            const call = calls.find((c: any) => c[0] === 'download-completed');
            expect(call).toBeDefined();

            const onComplete = call[1];
            await onComplete('dl-1');

            // Verify fs.unlink called (cleanup temp)
            expect(fs.unlink).toHaveBeenCalled();
        });

        it('should return false update if download manager missing', async () => {
            const noDlManager = new ModManager(undefined);
            noDlManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/p' });
            const mockMods = [{ id: '1', latestFileUrl: 'url' }];
            (fs.readFile as any).mockResolvedValue(JSON.stringify(mockMods));

            const result = await noDlManager.updateMod('1');
            expect(result).toBe(false);
        });

        it('should handle update error', async () => {
            (fs.readFile as any).mockRejectedValue(new Error('Fail'));
            const result = await modManager.updateMod('1');
            expect(result).toBe(false);
        });
    });

    describe('UE4SS', () => {
        it('should install UE4SS', async () => {
            const { fetchLatestRelease } = await import('../../electron/github');
            (fetchLatestRelease as any).mockResolvedValue('http://ue4ss.zip');

            mockDownloadManager.startDownload.mockReturnValue('dl-ue4ss');

            const promise = modManager.installUE4SS();

            // Wait for next tick
            await new Promise(r => setTimeout(r, 0));

            // Simulate completion
            const calls = mockDownloadManager.on.mock.calls;
            const call = calls.find((c: any) => c[0] === 'download-completed');
            expect(call).toBeDefined();

            const onComplete = call[1];
            await onComplete('dl-ue4ss');

            expect(mockDownloadManager.startDownload).toHaveBeenCalledWith(
                'http://ue4ss.zip',
                expect.any(String),
                expect.any(String),
                expect.anything()
            );
        });

        it('should fail install UE4SS if game path missing', async () => {
            modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '' });
            const result = await modManager.installUE4SS();
            expect(result.success).toBe(false);
        });
    });

    describe('Priority & Deploy', () => {
        it('fixPriorities should normalize priorities', async () => {
            const mockMods = [
                { id: '1', priority: 10, name: 'A' },
                { id: '2', priority: 10, name: 'B' } // Collision
            ];
            (fs.readFile as any).mockResolvedValue(JSON.stringify(mockMods));

            await modManager.fixPriorities();

            expect(fs.writeFile).toHaveBeenCalled();
            const written = JSON.parse((fs.writeFile as any).mock.calls[0][1]);
            expect(written[0].priority).not.toBe(written[1].priority);
        });

        it('deployMod should deploy files', async () => {
            const mod = { id: '1', name: 'M', folderPath: '/mods/M', isEnabled: true };
            (fs.readdir as any).mockResolvedValue(['file.pak']);
            (fs.stat as any).mockImplementation((p: string) => Promise.resolve({
                isDirectory: () => false
            }));

            await modManager.deployMod(mod as any);

            // Check if link or copy called
            expect(fs.link).toHaveBeenCalled();
        });

        it('deployMod should handle various file types and errors', async () => {
            const mod = { id: '1', name: 'M', folderPath: '/mods/M', isEnabled: true };
            (fs.readdir as any).mockResolvedValue(['file.pak', 'readme.txt', 'file.sig']);
            (fs.stat as any).mockResolvedValue({ isDirectory: () => false });

            await modManager.deployMod(mod as any);

            // .txt should be ignored
            // .pak and .sig should be linked
            expect(fs.link).toHaveBeenCalledTimes(2);
        });

        it('should deploy Movies (audio/video) correctly', async () => {
            const mod = { id: '1', name: 'MovieMod', folderPath: '/mods/MovieMod', isEnabled: true };
            const moviesDir = '/mods/MovieMod/Movies';
            const movieFile = '/mods/MovieMod/Movies/intro.usm';

            // Mock fs structure
            (fs.readdir as any).mockImplementation((dir) => {
                if (dir === mod.folderPath) return Promise.resolve(['Movies']);
                if (dir === moviesDir) return Promise.resolve(['intro.usm']);
                return Promise.resolve([]);
            });
            (fs.stat as any).mockImplementation((p) => {
                if (p === mod.folderPath || p === moviesDir) return Promise.resolve({ isDirectory: () => true });
                return Promise.resolve({ isDirectory: () => false });
            });

            await modManager.deployMod(mod as any);

            // Should deploy to Content/Movies/intro.usm without priority prefix
            expect(fs.link).toHaveBeenCalledWith(
                movieFile,
                expect.stringContaining(path.join('Content', 'Movies', 'intro.usm'))
            );
        });
    });

    describe('Deploy Fallbacks and Errors', () => {
        it('should fallback to copy if link fails', async () => {
            const mod = { id: '1', name: 'M', folderPath: '/mods/M' };
            (fs.readdir as any).mockResolvedValue(['file.pak']);
            (fs.stat as any).mockResolvedValue({ isDirectory: () => false });

            // Mock link failure
            (fs.link as any).mockRejectedValue({ code: 'EXDEV' });
            (fs.copyFile as any).mockResolvedValue(undefined);

            await modManager.deployMod(mod as any);

            expect(fs.link).toHaveBeenCalled();
            expect(fs.copyFile).toHaveBeenCalled();
        });

        it('should log error if copy also fails', async () => {
            const mod = { id: '1', name: 'M', folderPath: '/mods/M' };
            (fs.readdir as any).mockResolvedValue(['file.pak']);
            (fs.stat as any).mockResolvedValue({ isDirectory: () => false });

            (fs.link as any).mockRejectedValue({ code: 'EXDEV' });
            (fs.copyFile as any).mockRejectedValue(new Error('CopyFail'));

            const consoleSpy = vi.spyOn(console, 'error');

            await modManager.deployMod(mod as any);

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to copy'), expect.anything());
        });

        it('should handle undeploy errors', async () => {
            const mod = { id: '1', deployedFiles: ['/path/file.pak'] };
            (fs.unlink as any).mockRejectedValue(new Error('Fail'));

            await modManager.undeployMod(mod as any);
            // Should verify it caught error. Returns true generally as "best effort" or false?
            // Code says catch -> warn -> return true (partial success)
            // or catch outer -> return false.
            // inner loop catch warns.
        });
    });

    describe('Install Online Mod', () => {
        it('should start download and install on complete', async () => {
            const { fetchModProfile } = await import('../../electron/gamebanana');
            (fetchModProfile as any).mockResolvedValue({
                _aFiles: [{ _idRow: 1, _sDownloadUrl: 'url' }],
                _sName: 'Mod',
                _sVersion: '1.0'
            });

            mockDownloadManager.startDownload.mockReturnValue('dl-mod');

            const result = await modManager.installOnlineMod({ gameBananaId: 1 } as any);
            expect(result.success).toBe(true);

            // Simulate completion
            const onComplete = mockDownloadManager.on.mock.calls.find((c: any) => c[0] === 'download-completed')[1];

            // Mock unzip behavior (implied by finalizing)
            // Ensure writeFile is not failing due to other mocks
            (fs.writeFile as any).mockResolvedValue(undefined);
            (fs.mkdir as any).mockResolvedValue(undefined);
            (fs.readdir as any).mockResolvedValue([]);

            await onComplete('dl-mod');

            expect(fs.writeFile).toHaveBeenCalled();
        });

        it('should fail install online mod if missing download manager', async () => {
            const noDl = new ModManager(undefined);
            const result = await noDl.installOnlineMod({ gameBananaId: 1 } as any);
            expect(result.success).toBe(false);
        });

        it('should fail install online mod if no files found', async () => {
            const { fetchModProfile } = await import('../../electron/gamebanana');
            (fetchModProfile as any).mockResolvedValue({ _aFiles: [] });

            const result = await modManager.installOnlineMod({ gameBananaId: 1 } as any);
            expect(result.success).toBe(false);
        });
    });

    describe('Mod Management Actions', () => {
        it('should toggle mod and detect conflicts', async () => {
            const mockMods = [
                { id: '1', name: 'Mod1', category: 'Skins', isEnabled: false },
                { id: '2', name: 'Mod2', category: 'Skins', isEnabled: true }
            ];
            (fs.readFile as any).mockResolvedValue(JSON.stringify(mockMods));
            modManager.deployMod = vi.fn().mockResolvedValue(true);
            modManager.undeployMod = vi.fn().mockResolvedValue(true);

            const result = await modManager.toggleMod('1', true);
            expect(result.success).toBe(true);
            expect(result.conflict).toContain('conflicts with "Mod2"');
            expect(modManager.deployMod).toHaveBeenCalled();
        });

        it('should disable mod', async () => {
            const mockMods = [{ id: '1', name: 'Mod1', isEnabled: true }];
            (fs.readFile as any).mockResolvedValue(JSON.stringify(mockMods));
            modManager.undeployMod = vi.fn().mockResolvedValue(true);

            const result = await modManager.toggleMod('1', false);
            expect(result.success).toBe(true);
            expect(modManager.undeployMod).toHaveBeenCalled();
        });

        it('should handle toggle mod error', async () => {
            (fs.readFile as any).mockRejectedValue(new Error('Fail'));
            const result = await modManager.toggleMod('1', true);
            expect(result.success).toBe(false);
        });

        it('should uninstall mod', async () => {
            const mockMods = [{ id: '1', name: 'Mod1', folderPath: '/mods/Mod1' }];
            (fs.readFile as any).mockResolvedValue(JSON.stringify(mockMods));
            modManager.undeployMod = vi.fn().mockResolvedValue(true);

            const result = await modManager.uninstallMod('1');
            expect(result.success).toBe(true);
            expect(modManager.undeployMod).toHaveBeenCalled();
            expect(fs.rm).toHaveBeenCalledWith('/mods/Mod1', expect.anything());
        });

        it('should fail to uninstall non-existent mod', async () => {
            (fs.readFile as any).mockResolvedValue('[]');
            const result = await modManager.uninstallMod('999');
            expect(result.success).toBe(false);
        });

        it('should set mod priority up', async () => {
            const mockMods = [
                { id: '1', priority: 2, isEnabled: true },
                { id: '2', priority: 1, isEnabled: true }
            ];
            (fs.readFile as any).mockResolvedValue(JSON.stringify(mockMods));
            modManager.undeployMod = vi.fn().mockResolvedValue(true);
            modManager.deployMod = vi.fn().mockResolvedValue(true);

            // Move ID 2 UP (towards index 0, higher priority)
            // Current sorted: 1 (p2), 2 (p1). Index of 2 is 1. Target is 0.
            // Wait, logic says: sort descending (p2, p1).
            // Index 0: p2(id1), Index 1: p1(id2).
            // modId '2', direction 'up' -> targetIndex = 1 - 1 = 0.
            const result = await modManager.setModPriority('2', 'up');

            expect(result).toBe(true);
            expect(fs.writeFile).toHaveBeenCalled();
            // Verify redeploy called
            expect(modManager.undeployMod).toHaveBeenCalled();
            expect(modManager.deployMod).toHaveBeenCalled();
        });

        it('should handle setModPriority invalid id', async () => {
            (fs.readFile as any).mockResolvedValue('[]');
            const result = await modManager.setModPriority('999', 'up');
            expect(result).toBe(false);
        });
    });

    describe('Game Launch & Misc', () => {
        it('should launch game', async () => {
            const exePath = '/game/SparkingZERO.exe';
            modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: exePath, launchArgs: '-foo' });
            (fs.stat as any).mockResolvedValue({ isDirectory: () => false });

            await modManager.launchGame();
            expect(execFile).toHaveBeenCalledWith(
                exePath,
                expect.arrayContaining(['-fileopenlog', '-foo']),
                expect.anything(),
                expect.anything()
            );
        });

        it('should resolve game executable from directory', async () => {
            const dirPath = '/game';
            modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: dirPath });
            (fs.stat as any).mockImplementation((p) => {
                if (p === dirPath) return Promise.resolve({ isDirectory: () => true });
                return Promise.resolve({ isDirectory: () => false });
            });
            (fs.access as any).mockResolvedValue(undefined); // Found

            await modManager.launchGame();
            expect(execFile).toHaveBeenCalledWith(
                expect.stringContaining('SparkingZERO.exe'),
                expect.anything(),
                expect.anything(),
                expect.anything()
            );
        });

        it('should fallback to binary search if root exe missing', async () => {
            const dirPath = '/game';
            modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: dirPath });
            (fs.stat as any).mockImplementation((p) => {
                if (p === dirPath) return Promise.resolve({ isDirectory: () => true });
                return Promise.resolve({ isDirectory: () => false });
            });
            // First access fail (root exe), second success (binaries)
            (fs.access as any).mockImplementationOnce(() => Promise.reject('No'))
                .mockImplementationOnce(() => Promise.resolve());

            await modManager.launchGame();
            expect(execFile).toHaveBeenCalledWith(
                expect.stringContaining('SparkingZERO-Win64-Shipping.exe'),
                expect.anything(),
                expect.anything(),
                expect.anything()
            );
        });

        it('should fail launch if path invalid', async () => {
            modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '' });
            await expect(modManager.launchGame()).rejects.toThrow();
        });

        it('should handle launch execution error', async () => {
            const exePath = '/game/SparkingZERO.exe';
            modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: exePath });
            (fs.stat as any).mockResolvedValue({ isDirectory: () => false });

            // Mock execFile to fail
            (execFile as any).mockImplementation((path, args, opts, cb) => {
                cb(new Error('Launch failed'));
            });

            // launchGame doesn't throw on exec error, it logs. We spy on console.error
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            await modManager.launchGame();
            expect(consoleSpy).toHaveBeenCalledWith('Failed to launch game:', expect.anything());
        });
    });

    describe('Advanced Deployment Logic', () => {
        it('should deploy UE4SS mods correctly', async () => {
            const mod = { id: '1', name: 'UE4SSMod', folderPath: '/mods/UE4SSMod', isEnabled: true };
            const ue4ssPath = '/mods/UE4SSMod/ue4ss';
            const modsDir = '/mods/UE4SSMod/ue4ss/Mods';
            const myModDir = '/mods/UE4SSMod/ue4ss/Mods/MyMod';
            const modDllPath = '/mods/UE4SSMod/ue4ss/Mods/MyMod/main.dll';

            // Mock recursive file scan
            (fs.readdir as any).mockImplementation((dir) => {
                if (dir === mod.folderPath) return Promise.resolve(['ue4ss']);
                if (dir === ue4ssPath) return Promise.resolve(['Mods']);
                if (dir === modsDir) return Promise.resolve(['MyMod']);
                if (dir === myModDir) return Promise.resolve(['main.dll']);
                return Promise.resolve([]);
            });

            (fs.stat as any).mockImplementation((p) => {
                if (p === mod.folderPath || p === ue4ssPath || p === modsDir || p === myModDir) {
                    return Promise.resolve({ isDirectory: () => true });
                }
                return Promise.resolve({ isDirectory: () => false });
            });

            // Mock reading mods.txt
            (fs.readFile as any).mockImplementation((path) => {
                if (path.includes('mods.txt')) return Promise.resolve('OtherMod : 1\n');
                return Promise.resolve('[]');
            });

            await modManager.deployMod(mod as any);

            // Check if file was deployed to Binaries/Win64/...
            // path relative to ue4ss: Mods/MyMod/main.dll
            // Dest: .../Binaries/Win64/Mods/MyMod/main.dll
            expect(fs.link).toHaveBeenCalledWith(
                modDllPath,
                expect.stringContaining('Binaries')
            );

            // Check if mods.txt updated
            expect(fs.writeFile).toHaveBeenCalledWith(
                expect.stringContaining('mods.txt'),
                expect.stringContaining('MyMod : 1')
            );
        });

        it('should handle UE4SS mods.txt update failure gracefully', async () => {
            const mod = { id: '1', name: 'UE4SSMod', folderPath: '/mods/UE4SSMod', isEnabled: true };
            const ue4ssPath = '/mods/UE4SSMod/ue4ss';
            const modsDir = '/mods/UE4SSMod/ue4ss/Mods';
            const myModDir = '/mods/UE4SSMod/ue4ss/Mods/MyMod';
            const modDllPath = '/mods/UE4SSMod/ue4ss/Mods/MyMod/main.dll';

            // Mock recursive file scan
            (fs.readdir as any).mockImplementation((dir) => {
                if (dir === mod.folderPath) return Promise.resolve(['ue4ss']);
                if (dir === ue4ssPath) return Promise.resolve(['Mods']);
                if (dir === modsDir) return Promise.resolve(['MyMod']);
                if (dir === myModDir) return Promise.resolve(['main.dll']);
                return Promise.resolve([]);
            });
            (fs.stat as any).mockImplementation((p) => {
                if (typeof p === 'string' && (p.endsWith('ue4ss') || p.endsWith('Mods') || p.endsWith('MyMod') || p === mod.folderPath)) {
                    return Promise.resolve({ isDirectory: () => true });
                }
                return Promise.resolve({ isDirectory: () => false });
            });
            // Ensure deployFile works
            (fs.link as any).mockResolvedValue(undefined);

            // Fail reading/writing mods.txt
            (fs.readFile as any).mockImplementation((p) => {
                if (p.includes('mods.txt')) return Promise.reject(new Error('Fail'));
                return Promise.resolve('[]');
            });

            await modManager.deployMod(mod as any);
            // Should still deploy files, just log error for mods.txt
            expect(fs.link).toHaveBeenCalled();
        });

        it('should deploy LogicMods correctly', async () => {
            const mod = { id: '1', name: 'Logic', folderPath: '/mods/Logic', isEnabled: true };
            const logicDir = '/mods/Logic/LogicMods';
            const pakPath = '/mods/Logic/LogicMods/logic.pak';

            (fs.readdir as any).mockImplementation((dir) => {
                if (dir === mod.folderPath) return Promise.resolve(['LogicMods']);
                if (dir === logicDir) return Promise.resolve(['logic.pak']);
                return Promise.resolve([]);
            });
            (fs.stat as any).mockImplementation((p) => {
                if (p === mod.folderPath || p === logicDir) return Promise.resolve({ isDirectory: () => true });
                return Promise.resolve({ isDirectory: () => false });
            });

            await modManager.deployMod(mod as any);

            expect(fs.link).toHaveBeenCalledWith(
                pakPath,
                expect.stringContaining('LogicMods')
            );
        });
    });

    describe('Non-destructive Deployment', () => {
        it('should NOT wipe the destination directory on deploy', async () => {
            const mod = { id: '1', name: 'SafeMod', folderPath: '/mods/SafeMod', isEnabled: true };
            const pakPath = '/mods/SafeMod/safe.pak';

            // Mock source file existence
            (fs.readdir as any).mockImplementation((dir) => {
                if (dir === mod.folderPath) return Promise.resolve(['safe.pak']);
                return Promise.resolve([]);
            });
            (fs.stat as any).mockImplementation((p) => {
                if (p === mod.folderPath) return Promise.resolve({ isDirectory: () => true });
                return Promise.resolve({ isDirectory: () => false });
            });

            // Mock destination directory (~mods) cleanup check
            // We want to ensure fs.rm or fs.rmdir is NOT called on the paksDir
            const rmSpy = vi.spyOn(fs, 'rm');
            const rmdirSpy = vi.spyOn(fs, 'rmdir');

            await modManager.deployMod(mod as any);

            // It should link the new file
            expect(fs.link).toHaveBeenCalledWith(
                pakPath,
                expect.stringContaining('~mods')
            );

            // It should NOT wipe the directory
            // Note: We might see fs.unlink for the specific destination file (to overwrite),
            // but we should NOT see recursive removal of the parent folder.
            expect(rmSpy).not.toHaveBeenCalledWith(expect.stringContaining('~mods'), expect.objectContaining({ recursive: true }));
            expect(rmdirSpy).not.toHaveBeenCalledWith(expect.stringContaining('~mods'), expect.anything());
        });
    });

    describe('Install Local Mod', () => {
        it('should install zip', async () => {
            const zipPath = '/dl/mod.zip';
            const modManager = new ModManager(mockDownloadManager as any);
            (fs.readFile as any).mockImplementation((path) => {
                if (path === zipPath) return Promise.resolve(Buffer.from('zip'));
                return Promise.resolve('[]');
            });

            const result = await modManager.installMod(zipPath);
            expect(result.success).toBe(true);
        });

        it('should install non-zip', async () => {
            const pakPath = '/dl/mod.pak';
            (fs.readFile as any).mockResolvedValue('[]');
            (fs.copyFile as any).mockResolvedValue(undefined);

            const result = await modManager.installMod(pakPath);
            expect(result.success).toBe(true);
            expect(fs.copyFile).toHaveBeenCalled();
        });

        it('should handle install error', async () => {
            (fs.copyFile as any).mockRejectedValue(new Error('Fail'));
            const result = await modManager.installMod('mod.pak');
            expect(result.success).toBe(false);
        });
    });

    describe('Additional Coverage', () => {
        it('fixPriorities should do nothing if order is already correct', async () => {
             const mockMods = [
                { id: '1', priority: 2, name: 'A', isEnabled: true },
                { id: '2', priority: 1, name: 'B', isEnabled: true }
            ];
            (fs.readFile as any).mockResolvedValue(JSON.stringify(mockMods));

            // Should not call undeploy/deploy or write file if no changes
            const writeSpy = vi.spyOn(fs, 'writeFile');
            await modManager.fixPriorities();
            expect(writeSpy).not.toHaveBeenCalled();
        });

        it('updateAllMods should handle partial failures', async () => {
            const modIds = ['1', '2'];
            // Mock updateMod to succeed for 1 and fail for 2
            modManager.updateMod = vi.fn()
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(false);

            const result = await modManager.updateAllMods(modIds);
            expect(result.successCount).toBe(1);
            expect(result.failCount).toBe(1);
            expect(result.results).toHaveLength(2);
        });

        it('installUE4SS should use fallback if download manager is not present', async () => {
            const noDlManager = new ModManager(undefined);
            noDlManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/p' });

            const { fetchLatestRelease } = await import('../../electron/github');
            (fetchLatestRelease as any).mockResolvedValue('http://ue4ss.zip');

            // Mock downloadFile (private method, but we can mock net.request)
            // Or simpler: Mock downloadFile on the instance if possible, or mock net.request
            // Since downloadFile is private, we can't easily spy on it without casting.
            // But we can mock net.request which downloadFile uses.

            // However, we can also cast to any to mock the private method for this specific test
            (noDlManager as any).downloadFile = vi.fn().mockResolvedValue(undefined);
            (noDlManager as any).finalizeUE4SSInstall = vi.fn().mockResolvedValue({ success: true });

            const result = await noDlManager.installUE4SS();
            expect(result.success).toBe(true);
            expect((noDlManager as any).downloadFile).toHaveBeenCalled();
        });

        it('launchGame should catch execFile errors (callback)', async () => {
             modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/game.exe' });
             (fs.stat as any).mockResolvedValue({ isDirectory: () => false });

             (execFile as any).mockImplementation((file, args, opts, cb) => {
                 cb(new Error('Spawn failed'));
             });

             const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
             await modManager.launchGame();
             expect(consoleSpy).toHaveBeenCalledWith('Failed to launch game:', expect.any(Error));
        });

        it('toggleMod should warn on category conflict', async () => {
             const mockMods = [
                { id: '1', name: 'A', category: 'Skins', isEnabled: false },
                { id: '2', name: 'B', category: 'Skins', isEnabled: true }
             ];
             (fs.readFile as any).mockResolvedValue(JSON.stringify(mockMods));
             modManager.deployMod = vi.fn().mockResolvedValue(true);
             modManager.syncActiveProfile = vi.fn(); // avoid error

             const result = await modManager.toggleMod('1', true);
             expect(result.success).toBe(true);
             expect(result.conflict).toContain('conflicts with "B"');
        });

        it('getSettings should return default if file read fails', async () => {
            const mgr = new ModManager();
            (fs.readFile as any).mockRejectedValue(new Error('Fail'));
            const settings = await mgr.getSettings();
            expect(settings).toEqual({ gamePath: '' });
        });

        it('calculateFolderSize should handle stat error gracefully', async () => {
             (fs.readdir as any).mockResolvedValue(['file']);
             (fs.stat as any).mockRejectedValue(new Error('Stat fail'));
             const size = await modManager.calculateFolderSize('/path');
             expect(size).toBe(0);
        });
    });
});
