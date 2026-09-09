import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import * as gamebanana from '../../electron/gamebanana';
import { APICache } from '../../electron/api-cache';
import fs from 'fs/promises';
import { app } from 'electron';
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
vi.mock('electron', () => ({
    app: {
        getPath: vi.fn().mockReturnValue('/mock/userData'),
        isPackaged: false
    },
    net: { request: vi.fn() },
    shell: { openPath: vi.fn() }
}));
describe('Backend Coverage Gaps', () => {
    describe('GameBanana API Error Handling', () => {
        beforeEach(() => {
            vi.clearAllMocks();
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
            cache = new APICache();
        });
        it('should handle EACCES when saving persistent cache', async () => {
            const error: any = new Error('EACCES: permission denied');
            error.code = 'EACCES';
            (fs.mkdir as any).mockRejectedValue(error);
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            await cache.set('test-key', { foo: 'bar' });
            await new Promise(r => setTimeout(r, 50));
            expect(consoleSpy).toHaveBeenCalledWith('[Cache] Failed to write persistent cache:', expect.anything());
            consoleSpy.mockRestore();
        });
        it('should handle corrupt cache file gracefully', async () => {
            (fs.readFile as any).mockResolvedValue('{ "invalid": json }');
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
            modManager.getSettings = vi.fn().mockRejectedValue(new Error('Settings Error'));
            const mod = { id: '1', name: 'Test', isEnabled: true };
            await expect(modManager.deployMod(mod as any)).rejects.toThrow('Settings Error');
        });
        it('should handle fs.link failure generic error (not EXDEV/EPERM) by failing deployment', async () => {
            (fs.mkdir as any).mockResolvedValue(undefined);
            modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/game' });
            (fs.readdir as any).mockResolvedValue(['file.pak']);
            (fs.link as any).mockRejectedValue(new Error('Unknown Error'));
            const mod = {
                id: '1', name: 'Test', isEnabled: true, folderPath: '/mods/Test', deployedFiles: []
            };
            const result = await modManager.deployMod(mod as any);
            expect(result).toBe(false);
            expect(mod.deployedFiles).toEqual([]);
        });
    });
});
