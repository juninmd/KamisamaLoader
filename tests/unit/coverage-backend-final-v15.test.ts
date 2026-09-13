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

const mockFetchAllMods = vi.fn().mockResolvedValue([
    { id: '1', name: 'Test' }
]);
vi.mock('../../electron/gamebanana', () => ({
    getModDetails: vi.fn(),
    fetchItemData: vi.fn(),
    downloadModFiles: vi.fn(),
    fetchModProfile: vi.fn(),
    fetchAllMods: (...args: any[]) => mockFetchAllMods(...args)
}));

vi.mock('electron', () => ({
    app: {
        getPath: vi.fn(() => '/userData'),
        isPackaged: false
    }
}));

vi.mock('../../electron/settings', () => ({
    getSettings: vi.fn(() => ({ gamePath: '/test/game' }))
}));

describe('ModManager - handle parse local mods error', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
    });

    it('should catch error when writing cache file in fetchAllMods', async () => {
         const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
         (fs.writeFile as any).mockRejectedValueOnce(new Error('Cache write error'));

         // Force it to fetch from API not cache
         (fs.readFile as any).mockImplementation((path) => {
             throw new Error('Not found');
         });

         const result = await modManager.getAllOnlineMods(true);
         expect(result.length).toBe(1);
         expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[Cache] Failed to save cache:'), expect.any(Error));
    });
});
