import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';

vi.mock('fs/promises', () => ({
    default: {
        readFile: vi.fn(),
        writeFile: vi.fn(),
        unlink: vi.fn(),
        readdir: vi.fn(),
        mkdir: vi.fn(),
        cp: vi.fn(),
        rm: vi.fn()
    }
}));
vi.mock('../../electron/gamebanana', () => ({
    getModDetails: vi.fn(),
    fetchItemData: vi.fn(),
    downloadModFiles: vi.fn(),
    fetchModProfile: vi.fn(),
    searchBySection: vi.fn(() => Promise.resolve([])),
    fetchAllMods: vi.fn(() => Promise.resolve([{ id: 1 }])),
    fetchCategories: vi.fn(),
    fetchNewMods: vi.fn(),
    fetchFeaturedMods: vi.fn()
}));
vi.mock('../../electron/settings', () => ({
    getSettings: vi.fn(() => ({ gamePath: '/test/game' }))
}));
vi.mock('electron', () => ({
    app: { getPath: vi.fn(() => '/userData') }
}));

import * as gb from '../../electron/gamebanana';

describe('ModManager - search and cache gaps', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
    });

    it('should call searchOnlineMods', async () => {
        const res = await modManager.searchOnlineMods({ searchString: 'test', page: 1 });
        expect(res).toBeDefined();
    });

    it('should hit getAllOnlineMods cache read error', async () => {
        (fs.readFile as any).mockRejectedValue(new Error('No cache'));
        const mods = await modManager.getAllOnlineMods();
        expect(mods.length).toBe(1);
    });

    it('should hit getAllOnlineMods cache write error', async () => {
        (fs.readFile as any).mockRejectedValue(new Error('No cache'));
        (fs.writeFile as any).mockRejectedValue(new Error('Write Fail'));

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const mods = await modManager.getAllOnlineMods(true);
        expect(mods.length).toBe(1);
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[Cache] Failed to save cache:'), expect.any(Error));
    });

    it('should read from cache if valid in getAllOnlineMods', async () => {
        (fs.readFile as any).mockResolvedValue(JSON.stringify({
            timestamp: Date.now(), // Valid
            mods: [{ id: 99 }]
        }));

        const mods = await modManager.getAllOnlineMods();
        expect(mods[0].id).toBe(99);
    });

    it('should ignore cache if expired in getAllOnlineMods', async () => {
        (fs.readFile as any).mockResolvedValue(JSON.stringify({
            timestamp: Date.now() - (2 * 60 * 60 * 1000), // Expired
            mods: [{ id: 99 }]
        }));

        const mods = await modManager.getAllOnlineMods();
        expect(mods[0].id).toBe(1); // Fetched fresh
    });

    it('should call fetchCategories', async () => {
        (gb.fetchCategories as any).mockResolvedValue([{ name: 'TestCat' }]);
        const res = await modManager.fetchCategories();
        expect(res).toBeDefined();
    });

    it('should call fetchNewMods', async () => {
        (gb.fetchNewMods as any).mockResolvedValue([{ name: 'TestCat' }]);
        const res = await modManager.fetchNewMods();
        expect(res).toBeDefined();
    });

    it('should call fetchFeaturedMods', async () => {
        (gb.fetchFeaturedMods as any).mockResolvedValue([{ name: 'TestCat' }]);
        const res = await modManager.fetchFeaturedMods();
        expect(res).toBeDefined();
    });
});
