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

describe('ModManager Branch 4 Coverage', () => {
    let manager: ModManager;

    beforeEach(() => {
        vi.resetAllMocks();
        manager = new ModManager();
        vi.spyOn(manager as any, 'getSettings').mockResolvedValue({ gamePath: '/mock/game/path' });
        vi.spyOn(manager as any, 'getModsFilePath').mockResolvedValue('/mock/mods.json');
    });

    it('should catch error in undeployMod loop', async () => {
        const mockMod = { deployedFiles: ['/mock/file1.pak'] } as any;
        vi.mocked(fs.unlink).mockRejectedValue(new Error('unlink failed'));
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const res = await (manager as any).undeployMod(mockMod);

        expect(res).toBe(true);
        expect(consoleWarnSpy).toHaveBeenCalled();
        consoleWarnSpy.mockRestore();
    });

    it('should fall through to success in undeployMod if deployedFiles is null', async () => {
        const mockMod = { deployedFiles: null } as any;
        const res = await (manager as any).undeployMod(mockMod);
        expect(res).toBe(true);
    });

    it('should catch error when uninstallMod fails in the outer try catch', async () => {
        vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify([{ id: '1', folderPath: '/mock/mods/1' }]));
        vi.spyOn(manager as any, 'undeployMod').mockResolvedValue(true);
        // Make fs.rm throw to trigger outer catch
        vi.mocked(fs.rm).mockRejectedValue(new Error('rm failed'));

        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const res = await manager.uninstallMod('1');

        expect(res.success).toBe(false);
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(Error));
        consoleErrorSpy.mockRestore();
    });

    it('should fall through and return false if targetIndex is invalid in setModPriority', async () => {
        vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify([{ id: '1', priority: 1 }]));
        const res = await manager.setModPriority('1', 'up'); // index 0, 'up' -> -1
        expect(res).toBe(false);
    });

});
