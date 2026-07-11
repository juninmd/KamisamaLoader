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
    fetchAllMods: vi.fn(() => Promise.resolve([{ id: 1 }]))
}));
vi.mock('../../electron/settings', () => ({
    getSettings: vi.fn(() => ({ gamePath: '/test/game' }))
}));
vi.mock('electron', () => ({
    app: { getPath: vi.fn(() => '/userData') }
}));

describe('ModManager - more missing lines', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
    });

    it('should catch error in updateMod', async () => {
        (fs.readFile as any).mockResolvedValue(JSON.stringify([{ id: 'mod1', enabled: false, folderPath: '/test' }]));
        modManager.getModsFilePath = vi.fn().mockRejectedValue(new Error('Update failed error'));

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const res = await modManager.updateMod('mod1');
        expect(res).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith('Update failed', expect.any(Error));
    });

    it('should return false in updateMod if downloadManager is null', async () => {
        (fs.readFile as any).mockResolvedValue(JSON.stringify([{ id: 'mod1', enabled: false, folderPath: '/test', latestFileUrl: 'url' }]));
        modManager.getModsFilePath = vi.fn().mockResolvedValue('/mods.json');

        // Ensure no download manager
        (modManager as any).downloadManager = null;

        const res = await modManager.updateMod('mod1');
        expect(res).toBe(false);
    });
});
