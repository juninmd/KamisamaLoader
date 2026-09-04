import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';

vi.mock('fs/promises');
vi.mock('../../electron/archive');
vi.mock('../../electron/gamebanana');

vi.mock('electron', () => ({
    app: {
        getPath: vi.fn(() => '/mock/path'),
        isPackaged: false,
        getAppPath: vi.fn(() => '/mock/app/path')
    }
}));

describe('ModManager Branch 5 Coverage', () => {
    let manager: ModManager;

    beforeEach(() => {
        vi.resetAllMocks();
        manager = new ModManager();
        vi.spyOn(manager as any, 'getSettings').mockResolvedValue({ gamePath: '/mock/game/path' });
        vi.spyOn(manager as any, 'getModsFilePath').mockResolvedValue('/mock/mods.json');
    });

    it('should fall through and return false if setModPriority direction makes index out of bounds N length', async () => {
        vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify([{ id: '1', priority: 1 }]));
        const res = await manager.setModPriority('1', 'down'); // index 0, 'down' -> 1
        expect(res).toBe(false);
    });

    it('should hit the uninstallMod error reading modsFile from getModsFilePath', async () => {
        // Just need to throw inside the main try/catch block by mocking something it awaits early
        vi.spyOn(manager as any, 'getModsFilePath').mockRejectedValue(new Error('path error'));
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const res = await manager.uninstallMod('1');
        expect(res.success).toBe(false);
        consoleErrorSpy.mockRestore();
    });
});
