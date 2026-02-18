import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';
import { execFile } from 'child_process';
import path from 'path';

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

describe('ModManager Final Gaps V3', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
        // @ts-expect-error test intentionally overrides internal field
        modManager.modsDir = '/mock/mods';
    });

    describe('launchGame', () => {
        it('should split launch arguments correctly', async () => {
            // Setup settings with launch args
            const settings = { gamePath: '/game/exe.exe', launchArgs: '-dx11 -windowed  -log ' };
            // @ts-expect-error mocked fs method
            vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(settings));
            // @ts-expect-error mocked fs method
            vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => false });
            // @ts-expect-error mocked fs method
            vi.mocked(fs.access).mockResolvedValue(undefined);

            await modManager.launchGame();

            expect(execFile).toHaveBeenCalledWith(
                '/game/exe.exe',
                ['-fileopenlog', '-dx11', '-windowed', '-log'],
                expect.any(Object),
                expect.any(Function)
            );
        });

        it('should handle missing launch arguments', async () => {
            // Setup settings without launch args
            const settings = { gamePath: '/game/exe.exe' };
            // @ts-expect-error mocked fs method
            vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(settings));
            // @ts-expect-error mocked fs method
            vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => false });
            // @ts-expect-error mocked fs method
            vi.mocked(fs.access).mockResolvedValue(undefined);

            await modManager.launchGame();

            expect(execFile).toHaveBeenCalledWith(
                '/game/exe.exe',
                ['-fileopenlog'],
                expect.any(Object),
                expect.any(Function)
            );
        });

        it('should handle execution error in callback', async () => {
            const settings = { gamePath: '/game/exe.exe' };
            // @ts-expect-error mocked fs method
            vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(settings));
             // @ts-expect-error mocked fs method
            vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => false });
             // @ts-expect-error mocked fs method
            vi.mocked(fs.access).mockResolvedValue(undefined);

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            (execFile as any).mockImplementation((f: any, a: any, o: any, cb: any) => {
                cb(new Error('Spawn Error'));
            });

            await modManager.launchGame();

            expect(consoleSpy).toHaveBeenCalledWith('Failed to launch game:', expect.anything());
        });
    });

    describe('deployMod', () => {
         it('should return false if game path not set', async () => {
            // Setup settings without game path
            const settings = { gamePath: '' };
            // @ts-expect-error mocked fs method
            vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(settings));

            const mod = { id: '1', name: 'Mod', isEnabled: true };
            const result = await modManager.deployMod(mod as any);

            expect(result).toBe(false);
         });
    });

    describe('installUE4SS', () => {
        it('should return failure if game path not set', async () => {
             // Setup settings without game path
            const settings = { gamePath: '' };
            // @ts-expect-error mocked fs method
            vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(settings));

            const result = await modManager.installUE4SS();
            expect(result.success).toBe(false);
            expect(result.message).toBe('Game path not set.');
        });
    });
});
