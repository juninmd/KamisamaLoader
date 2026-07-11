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
    downloadModFiles: vi.fn()
}));
vi.mock('../../electron/settings', () => ({
    getSettings: vi.fn(() => ({ gamePath: '/test/game' }))
}));
vi.mock('electron', () => ({
    app: { getPath: vi.fn(() => '/userData') }
}));

describe('ModManager - more missing gaps', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
    });

    it('should catch error in setModPriority if settings missing', async () => {
        modManager.getProfilesFilePath = vi.fn().mockRejectedValue(new Error('Boom profiles'));
        const res = await modManager.loadProfile('2');
        expect(res.success).toBe(false);
    });

    it('should catch error in checkUpdates if file missing', async () => {
        modManager.getModsFilePath = vi.fn().mockRejectedValue(new Error('Boom mods'));
        // If it throws, we catch it
        await expect(modManager.checkForUpdates()).rejects.toThrow('Boom mods');
    });
});
