import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';
import { execFile } from 'child_process';

// Mocks
vi.mock('fs/promises');
vi.mock('child_process', () => ({
    execFile: vi.fn()
}));

const mockElectron = vi.hoisted(() => ({
    app: {
        getPath: vi.fn().mockReturnValue('/mock/app/path'),
        isPackaged: false
    },
    shell: { openPath: vi.fn() },
    net: { request: vi.fn() }
}));

vi.mock('electron', () => ({
    default: mockElectron,
    ...mockElectron
}));

vi.mock('../../electron/gamebanana.js', () => ({
    fetchModProfile: vi.fn(),
    searchOnlineMods: vi.fn(),
    getModChangelog: vi.fn(),
    fetchModDetails: vi.fn(),
    fetchLatestRelease: vi.fn(),
    searchBySection: vi.fn(),
    fetchCategories: vi.fn(),
    fetchNewMods: vi.fn(),
    fetchFeaturedMods: vi.fn(),
    fetchAllMods: vi.fn(),
    fetchModUpdates: vi.fn()
}));

describe('ModManager Final Coverage', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
        // @ts-ignore
        modManager.modsDir = '/mock/mods';
    });

    it('should log error when launchGame fails via execFile', async () => {
        // Setup settings
        const settings = { gamePath: '/game/exe.exe' };
        // @ts-ignore
        vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(settings));
        // @ts-ignore
        vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => false });
        // @ts-ignore
        vi.mocked(fs.access).mockResolvedValue(undefined);

        // Spy on console.error
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // Mock execFile to callback with error
        (execFile as any).mockImplementation((file, args, opts, cb) => {
            cb(new Error('Launch Failed'));
        });

        await modManager.launchGame();

        expect(consoleSpy).toHaveBeenCalledWith('Failed to launch game:', expect.any(Error));
        consoleSpy.mockRestore();
    });

    it('should return empty list if getInstalledMods fails', async () => {
        // @ts-ignore
        vi.mocked(fs.readFile).mockRejectedValue(new Error('Read Error'));

        const mods = await modManager.getInstalledMods();
        expect(mods).toEqual([]);
    });

    it('should handle calculateFolderSize error gracefully', async () => {
        // @ts-ignore
        vi.mocked(fs.readdir).mockRejectedValue(new Error('Access Denied'));

        const size = await modManager.calculateFolderSize('/path');
        expect(size).toBe(0);
    });

    it('should handle fixPriorities read error', async () => {
         // @ts-ignore
        vi.mocked(fs.readFile).mockRejectedValue(new Error('Read Error'));
        // Should not throw
        await modManager.fixPriorities();
    });
});
