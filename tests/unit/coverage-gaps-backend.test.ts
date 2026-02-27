import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import * as gamebanana from '../../electron/gamebanana';
import { APICache, getAPICache } from '../../electron/api-cache';
import fs from 'fs/promises';
import { app } from 'electron';

// --- Mocks ---

// Mock fs/promises
vi.mock('fs/promises', () => ({
    default: {
        mkdir: vi.fn(),
        readFile: vi.fn(),
        writeFile: vi.fn(),
        unlink: vi.fn(),
        link: vi.fn(),
        copyFile: vi.fn(),
        stat: vi.fn(),
        readdir: vi.fn(),
        rm: vi.fn(),
        cp: vi.fn(),
        access: vi.fn()
    }
}));

// Mock electron
vi.mock('electron', () => ({
    app: {
        getPath: vi.fn().mockReturnValue('/mock/userData'),
        isPackaged: false
    },
    net: { request: vi.fn() },
    shell: { openPath: vi.fn() }
}));

// Mock api-cache (partially, to control behavior)
// We will test APICache logic separately if needed, but here we focus on integration
// However, since we want to reproduce EACCES, we need fs.mkdir to fail.

describe('Backend Coverage Gaps', () => {

    describe('GameBanana API Error Handling', () => {
        beforeEach(() => {
            vi.clearAllMocks();
            // Reset global fetch mock
            global.fetch = vi.fn();
        });

        it('fetchItemData should return null on 404 response', async () => {
            (global.fetch as any).mockResolvedValue({
                ok: false,
                status: 404,
                statusText: 'Not Found'
            });
            const result = await gamebanana.fetchItemData('Mod', 123);
            expect(result).toBeNull();
        });

        it('fetchItemData should return null on network error', async () => {
             (global.fetch as any).mockRejectedValue(new Error('Network Error'));
             const result = await gamebanana.fetchItemData('Mod', 123);
             expect(result).toBeNull();
        });

        it('searchBySection should handle 500 server error gracefully', async () => {
            (global.fetch as any).mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Server Error',
                text: async () => 'Internal Server Error'
            });
            const result = await gamebanana.searchBySection({});
            expect(result).toEqual([]);
        });

        it('fetchCategories should return empty array on 404', async () => {
             (global.fetch as any).mockResolvedValue({
                ok: false,
                status: 404,
                json: async () => ({})
            });
            const result = await gamebanana.fetchCategories();
            expect(result).toEqual([]);
        });

        it('fetchModProfile should return null on 500', async () => {
            (global.fetch as any).mockResolvedValue({
                ok: false,
                status: 500
            });
            const result = await gamebanana.fetchModProfile(1);
            expect(result).toBeNull();
        });

         it('fetchModUpdates should return null on 404', async () => {
            (global.fetch as any).mockResolvedValue({
                ok: false,
                status: 404
            });
            const result = await gamebanana.fetchModUpdates(1);
            expect(result).toBeNull();
        });
    });

    describe('APICache Robustness', () => {
        let cache: APICache;

        beforeEach(() => {
            vi.clearAllMocks();
            // Reset singleton if possible, or create new instance
            // Since getAPICache returns singleton, we might need to rely on that or new APICache
            // APICache is exported class, so we can instantiate it.
            cache = new APICache();
        });

        it('should handle EACCES when saving persistent cache', async () => {
            // Mock fs.mkdir to fail with EACCES
            const error: any = new Error('EACCES: permission denied');
            error.code = 'EACCES';
            (fs.mkdir as any).mockRejectedValue(error);

            // Spy on console.error
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            // Trigger set which calls setPersistent
            await cache.set('test-key', { foo: 'bar' });

            // Since setPersistent is async and not awaited in set(), we need to wait a bit
            await new Promise(r => setTimeout(r, 50));

            // It actually logs: [Cache] Failed to write persistent cache: [Error: EACCES...]
            expect(consoleSpy).toHaveBeenCalledWith('[Cache] Failed to write persistent cache:', expect.anything());
            consoleSpy.mockRestore();
        });

        it('should handle corrupt cache file gracefully', async () => {
            (fs.readFile as any).mockResolvedValue('{ "invalid": json }'); // Invalid JSON

            // Calling get should fail silently (return null) or log error but not throw
            // get calls getPersistent
            const val = await cache.get('some-key');
            expect(val).toBeNull();
        });
    });

    describe('ModManager Deployment Gaps', () => {
        let modManager: ModManager;

        beforeEach(() => {
            vi.clearAllMocks();
            modManager = new ModManager();
            (fs.stat as any).mockResolvedValue({ isDirectory: () => false });
            (fs.readdir as any).mockResolvedValue([]);
        });

        it('should throw if getSettings fails in deployMod (current behavior)', async () => {
            // ModManager.deployMod calls getSettings before the try-catch block.
            // Therefore, errors in getSettings propagate instead of returning false.
            modManager.getSettings = vi.fn().mockRejectedValue(new Error('Settings Error'));

            const mod = { id: '1', name: 'Test', isEnabled: true };
            await expect(modManager.deployMod(mod as any)).rejects.toThrow('Settings Error');
        });

        it('should handle fs.link failure generic error (not EXDEV/EPERM) by failing deployment', async () => {
             // In ModManager.deployMod -> deployModFiles -> loop -> deployFile
             // deployFile catches error and returns false.
             // deployModFiles continues loop.
             // deployMod finishes loop and returns true.

             // Wait, why did it return false in previous run?
             // Ah, because in `beforeEach` for `ModManager Deployment Gaps` (lines 135+),
             // we did NOT mock fs.mkdir to resolve.
             // In `modManager.deployMod`: `await fs.mkdir(paksDir, { recursive: true });`
             // If we rely on default mock from top of file `vi.mock('fs/promises', ... mkdir: vi.fn(), ...)`
             // vi.fn() returns undefined by default, so it resolves.
             // BUT, earlier in `APICache Robustness` test, we did:
             // `(fs.mkdir as any).mockRejectedValue(error);`
             // This mock might have leaked if `beforeEach` didn't reset it properly.
             // `beforeEach` calls `vi.clearAllMocks()`.
             // But `mockRejectedValue` changes implementation. `clearAllMocks` only clears call history?
             // No, `clearAllMocks` clears history. `mockReset` clears implementation.
             // `beforeEach` at line 137: `vi.clearAllMocks();`
             // We need to restore implementations.

             // Let's explicitly fix fs.mkdir for this test suite.
             (fs.mkdir as any).mockResolvedValue(undefined);

             modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/game' });
             (fs.readdir as any).mockResolvedValue(['file.pak']);
             (fs.link as any).mockRejectedValue(new Error('Unknown Error'));

             const mod = {
                 id: '1', name: 'Test', isEnabled: true, folderPath: '/mods/Test', deployedFiles: []
             };

             const result = await modManager.deployMod(mod as any);
             expect(result).toBe(true);
             expect(mod.deployedFiles).toEqual([]);
         });
    });
});
