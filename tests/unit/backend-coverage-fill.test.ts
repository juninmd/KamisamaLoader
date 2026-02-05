import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager.js';
import * as fs from 'fs/promises';
import path from 'path';
import { app } from 'electron';
import * as gamebanana from '../../electron/gamebanana.js';

// Mock Modules
vi.mock('../../electron/gamebanana.js', () => ({
    fetchModProfile: vi.fn(),
    searchOnlineMods: vi.fn(),
    fetchModUpdates: vi.fn(),
    fetchModDetails: vi.fn(),
    fetchLatestRelease: vi.fn(),
    fetchAllMods: vi.fn(),
}));

vi.mock('electron', () => ({
    app: {
        getPath: vi.fn((name) => name === 'temp' ? '/temp' : '/app'),
        isPackaged: false
    },
    net: {
        request: vi.fn()
    },
    shell: {
        openPath: vi.fn()
    }
}));

vi.mock('fs/promises');
vi.mock('adm-zip');
vi.mock('child_process');

describe('Backend Coverage Fill', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
    });

    describe('ModManager - Launch Game', () => {
        it('should throw if exe not found in directory', async () => {
            vi.spyOn(modManager, 'getSettings').mockResolvedValue({ gamePath: '/game' });
            vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);
            // First access check fails (root exe)
            // Second access check fails (bin exe)
            vi.mocked(fs.access).mockRejectedValue(new Error('Not found'));

            await expect(modManager.launchGame()).rejects.toThrow('Could not find SparkingZERO.exe');
        });
    });

    describe('ModManager - Deploy Mod', () => {
        it('should handle internal loop error in deployModFiles', async () => {
            // Mock deployMod calling resolveGamePaths
            vi.spyOn(modManager as any, 'resolveGamePaths').mockReturnValue({
                paksDir: '/paks', logicModsDir: '/logic', binariesDir: '/bin', contentDir: '/content'
            });
            vi.spyOn(modManager as any, 'getSettings').mockResolvedValue({ gamePath: '/game' });
            vi.mocked(fs.mkdir).mockResolvedValue(undefined);

            // Force getAllFiles to throw
            vi.spyOn(modManager as any, 'getAllFiles').mockRejectedValue(new Error('Scan Error'));

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            await modManager.deployMod({ id: '1', name: 'Test', folderPath: '/mod' } as any);

            expect(consoleSpy).toHaveBeenCalledWith('Error in deployModFiles internal loop', expect.any(Error));
        });
    });

    describe('ModManager - Profile Gaps', () => {
        it('should handle createProfile failure', async () => {
            vi.spyOn(modManager, 'getInstalledMods').mockResolvedValue([]);
            vi.spyOn(modManager, 'getProfiles').mockResolvedValue([]);
            vi.mocked(fs.writeFile).mockRejectedValue(new Error('Write Fail'));

            const result = await modManager.createProfile('Test');
            expect(result.success).toBe(false);
        });

        it('should handle deleteProfile failure', async () => {
            vi.spyOn(modManager, 'getProfiles').mockResolvedValue([]);
            vi.mocked(fs.writeFile).mockRejectedValue(new Error('Write Fail'));

            const result = await modManager.deleteProfile('1');
            expect(result).toBe(false);
        });
    });

    describe('ModManager - Settings Gaps', () => {
        it('should handle saveSettings failure', async () => {
            vi.mocked(fs.writeFile).mockRejectedValue(new Error('Write Fail'));
            const result = await modManager.saveSettings({ gamePath: '' });
            expect(result).toBe(false);
        });

        it('should return default settings on read error', async () => {
            vi.mocked(fs.readFile).mockRejectedValue(new Error('Read Fail'));
            const settings = await modManager.getSettings();
            expect(settings).toEqual({ gamePath: '' });
        });
    });

    describe('ModManager - Install Online/Uninstall Gaps', () => {
        it('should handle installOnlineMod failure when profile fetch fails', async () => {
             vi.mocked(gamebanana.fetchModProfile).mockResolvedValue(null);
             const result = await modManager.installOnlineMod({ id: '1', gameBananaId: 1, name: 'Test' } as any);
             expect(result.success).toBe(false);
             expect(result.message).toContain('No download files found');
        });

        it('should handle getModChangelog error', async () => {
            const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
            // Force error by passing invalid ID or messing with internal state if possible
            // Or better, since getModChangelog calls import('./gamebanana.js'), we can't easily mock the dynamic import result here without more setup.
            // But we can test the fallback if modId is not found in getModChangelog(id)

            vi.spyOn(modManager, 'getModsFilePath').mockResolvedValue('invalid/path');
            vi.mocked(fs.readFile).mockRejectedValue(new Error('Read Fail'));

            const result = await modManager.getModChangelog('1');
            expect(result).toBeNull();
        });
    });
});
