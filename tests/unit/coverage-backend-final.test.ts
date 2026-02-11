import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager.js';
import fs from 'fs/promises';
import { app, shell } from 'electron';
import path from 'path';

// Mock Modules
vi.mock('../../electron/gamebanana.js', () => ({
    searchBySection: vi.fn(),
    fetchModProfile: vi.fn(),
    getModChangelog: vi.fn(),
    fetchModDetails: vi.fn(),
    fetchLatestRelease: vi.fn()
}));
vi.mock('fs/promises');
vi.mock('electron', () => ({
    app: {
        getPath: vi.fn().mockReturnValue('/mock/app/path'),
        isPackaged: false
    },
    shell: {
        openPath: vi.fn()
    },
    net: {
        request: vi.fn()
    }
}));
vi.mock('child_process', () => ({
    execFile: vi.fn((cmd, args, opts, cb) => cb && cb(new Error('Exec Fail')))
}));

describe('ModManager Coverage Boost', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
        // Mock ensureModsDir
        vi.spyOn(modManager as any, 'ensureModsDir').mockResolvedValue('/mock/mods');
        // Mock getSettings to return valid paths
        vi.spyOn(modManager, 'getSettings').mockResolvedValue({
            gamePath: '/mock/game/SparkingZERO.exe',
            modDownloadPath: '/mock/mods'
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should handle fs.unlink failure gracefully in deployFile', async () => {
        // Setup: Mock fs.mkdir (success), fs.unlink (fail), fs.link (success)
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.unlink as any).mockRejectedValue(new Error('Unlink Fail'));
        (fs.link as any).mockResolvedValue(undefined);

        // Access private method via any
        const result = await (modManager as any).deployFile('/src/file', '/dest/file');
        expect(result).toBe(true); // Should proceed despite unlink fail
    });

    it('should fall back to copy if link fails with EXDEV in deployFile', async () => {
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.unlink as any).mockResolvedValue(undefined);
        const err: any = new Error('Link Fail');
        err.code = 'EXDEV';
        (fs.link as any).mockRejectedValue(err);
        (fs.copyFile as any).mockResolvedValue(undefined);

        const result = await (modManager as any).deployFile('/src/file', '/dest/file');
        expect(result).toBe(true);
        expect(fs.copyFile).toHaveBeenCalledWith('/src/file', '/dest/file');
    });

    it('should fail deployFile if copy fails after link fail', async () => {
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.unlink as any).mockResolvedValue(undefined);
        const err: any = new Error('Link Fail');
        err.code = 'EXDEV';
        (fs.link as any).mockRejectedValue(err);
        (fs.copyFile as any).mockRejectedValue(new Error('Copy Fail'));

        const result = await (modManager as any).deployFile('/src/file', '/dest/file');
        expect(result).toBe(false);
    });

    it('should fail deployFile if link fails with non-EXDEV error', async () => {
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.unlink as any).mockResolvedValue(undefined);
        const err: any = new Error('Generic Link Fail');
        (fs.link as any).mockRejectedValue(err);

        const result = await (modManager as any).deployFile('/src/file', '/dest/file');
        expect(result).toBe(false);
    });

    it('should handle fs.unlink failure gracefully in undeployMod', async () => {
        const mod = {
            id: '1',
            name: 'Test',
            deployedFiles: ['/dest/file'],
            isEnabled: true,
            priority: 1
        };

        // Mock fs.unlink fail
        (fs.unlink as any).mockRejectedValue(new Error('Unlink Fail'));

        const result = await modManager.undeployMod(mod as any);
        expect(result).toBe(true); // Should return true as we "tried" our best
        expect(mod.deployedFiles).toEqual([]);
    });

    it('should return false if undeployMod throws unexpected error', async () => {
        const deployedFiles = ['/path/1'];
        // Force iterator to throw
        (deployedFiles as any)[Symbol.iterator] = function* () {
            throw new Error('Iterator Error');
        };

        const mod = {
            id: '1',
            name: 'Test',
            deployedFiles: deployedFiles,
            isEnabled: true
        };

        const result = await modManager.undeployMod(mod as any);
        expect(result).toBe(false);
    });


    it('should handle corrupt mods.json in installMod', async () => {
        (fs.readFile as any).mockResolvedValue('{{invalid_json');
        (fs.copyFile as any).mockResolvedValue(undefined);
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.stat as any).mockResolvedValue({ size: 100, isDirectory: () => false });

        const result = await modManager.installMod('/path/to/mod.pak');
        expect(result.success).toBe(true);
    });

    it('should return false if installMod fails completely (e.g. mkdir fails)', async () => {
        (fs.mkdir as any).mockRejectedValue(new Error('Mkdir Fail'));
        const result = await modManager.installMod('/path/to/mod.pak');
        expect(result.success).toBe(false);
        expect(result.message).toContain('Mkdir Fail');
    });

    it('should handle uninstallMod failure if fs.rm fails', async () => {
        // Mock getMods to return our mod
        (fs.readFile as any).mockResolvedValue(JSON.stringify([{ id: '1', folderPath: '/mods/1' }]));
        (fs.rm as any).mockRejectedValue(new Error('Rm Fail'));

        const result = await modManager.uninstallMod('1');
        expect(result.success).toBe(false);
        expect(result.message).toContain('Rm Fail');
    });

    it('should handle toggleMod failure if fs.readFile fails', async () => {
        (fs.readFile as any).mockRejectedValue(new Error('Read Fail'));
        const result = await modManager.toggleMod('1', true);
        expect(result.success).toBe(false);
    });

    it('should return false in updateMod if no downloadManager', async () => {
         // modManager was created without DM
         (fs.readFile as any).mockResolvedValue(JSON.stringify([{ id: '1', latestFileUrl: 'http://url' }]));
         const result = await modManager.updateMod('1');
         expect(result).toBe(false);
    });

    it('should handle launchGame execution error', async () => {
        (fs.stat as any).mockResolvedValue({ isDirectory: () => false });
        (fs.access as any).mockResolvedValue(undefined);

        // execFile is mocked to fail
        const result = await modManager.launchGame();
        expect(result).toBe(true);
    });

    it('should handle setModPriority failure (e.g. invalid index)', async () => {
        (fs.readFile as any).mockResolvedValue(JSON.stringify([]));
        const result = await modManager.setModPriority('1', 'up');
        expect(result).toBe(false);
    });

    it('should handle setModPriority file write failure', async () => {
        (fs.readFile as any).mockResolvedValue(JSON.stringify([{ id: '1', priority: 1 }, { id: '2', priority: 0 }]));
        (fs.writeFile as any).mockRejectedValueOnce(new Error('Write Fail'));

        const result = await modManager.setModPriority('1', 'down');
        expect(result).toBe(false);
    });

    it('should calculateFolderSize gracefully handle errors', async () => {
        (fs.readdir as any).mockRejectedValue(new Error('Access Denied'));
        const size = await modManager.calculateFolderSize('/path');
        expect(size).toBe(0);
    });

    it('should handle API errors in checkForUpdates gracefully', async () => {
        (fs.readFile as any).mockResolvedValue(JSON.stringify([{ id: '1', gameBananaId: 123 }]));

        const { fetchModProfile } = await import('../../electron/gamebanana.js');
        (fetchModProfile as any).mockRejectedValue(new Error('API Fail'));

        const updates = await modManager.checkForUpdates();
        expect(updates).toEqual([]);
    });

    it('should handle getModChangelog fatal error', async () => {
        vi.spyOn(modManager as any, 'getModsFilePath').mockRejectedValue(new Error('Fatal Path Error'));
        const result = await modManager.getModChangelog('mod-id');
        expect(result).toBeNull();
    });

    it('should handle getModDetails fatal error', async () => {
        const { fetchModDetails } = await import('../../electron/gamebanana.js');
        (fetchModDetails as any).mockRejectedValue(new Error('API Fatal'));

        const result = await modManager.getModDetails(123);
        expect(result).toBeNull();
    });
});
