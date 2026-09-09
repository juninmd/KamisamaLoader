import './mod-manager-final-coverage.fixture';
import { completeFileSystemDouble } from '../mock-fs-defaults';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import * as fs from 'fs/promises';
import { app } from 'electron';
describe('ModManager Final Coverage', () => {
    let modManager: ModManager;
    beforeEach(async () => {
        vi.resetAllMocks();
        await completeFileSystemDouble();
        (app.getPath as any).mockReturnValue('/app-data');
        (app.isPackaged as any) = false;
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.readFile as any).mockRejectedValue(new Error('File not found'));
        (fs.writeFile as any).mockResolvedValue(undefined);
        (fs.link as any).mockResolvedValue(undefined);
        (fs.stat as any).mockResolvedValue({ isDirectory: () => false, size: 100 });
        modManager = new ModManager();
    });
    it('should handle fs.link generic failure (non-EXDEV)', async () => {
        const mod = {
            id: '1',
            name: 'TestMod',
            isEnabled: true,
            folderPath: '/mods/TestMod',
            priority: 1
        };
        (fs.readFile as any).mockResolvedValueOnce(JSON.stringify({ gamePath: '/game' }));
        (fs.readdir as any).mockResolvedValueOnce(['file.pak']);
        (fs.stat as any).mockResolvedValue({ isDirectory: () => false });
        (fs.link as any).mockRejectedValueOnce(new Error('Generic Link Error'));
        await modManager.deployMod(mod);
        expect(fs.copyFile).not.toHaveBeenCalled();
    });
});
describe('ModManager Final Coverage', () => {
    let modManager: ModManager;
    beforeEach(async () => {
        vi.resetAllMocks();
        await completeFileSystemDouble();
        (app.getPath as any).mockReturnValue('/app-data');
        (app.isPackaged as any) = false;
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.readFile as any).mockRejectedValue(new Error('File not found'));
        (fs.writeFile as any).mockResolvedValue(undefined);
        (fs.link as any).mockResolvedValue(undefined);
        (fs.stat as any).mockResolvedValue({ isDirectory: () => false, size: 100 });
        modManager = new ModManager();
    });
    it('should deploy UE4SS mods correctly', async () => {
        const mod = {
            id: '1',
            name: 'UE4SSMod',
            isEnabled: true,
            folderPath: '/mods/UE4SSMod',
            priority: 1
        };
        (fs.readFile as any).mockResolvedValueOnce(JSON.stringify({ gamePath: '/game' }));
        (fs.readdir as any)
            .mockResolvedValueOnce(['ue4ss'])
            .mockResolvedValueOnce(['Mods'])
            .mockResolvedValueOnce(['MyMod'])
            .mockResolvedValueOnce(['main.lua']);
        (fs.stat as any)
            .mockResolvedValueOnce({ isDirectory: () => true })
            .mockResolvedValueOnce({ isDirectory: () => true })
            .mockResolvedValueOnce({ isDirectory: () => true })
            .mockResolvedValueOnce({ isDirectory: () => false });
        (fs.stat as any).mockResolvedValueOnce({ isDirectory: () => true });
        (fs.stat as any).mockRejectedValueOnce(new Error('No LogicMods'));
        (fs.stat as any).mockRejectedValueOnce(new Error('No Movies'));
        (fs.link as any).mockResolvedValue(undefined);
        (fs.readFile as any).mockResolvedValueOnce('');
        await modManager.deployMod(mod);
        expect(fs.writeFile).toHaveBeenCalled();
    });
});
describe('ModManager Final Coverage', () => {
    let modManager: ModManager;
    beforeEach(async () => {
        vi.resetAllMocks();
        await completeFileSystemDouble();
        (app.getPath as any).mockReturnValue('/app-data');
        (app.isPackaged as any) = false;
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.readFile as any).mockRejectedValue(new Error('File not found'));
        (fs.writeFile as any).mockResolvedValue(undefined);
        (fs.link as any).mockResolvedValue(undefined);
        (fs.stat as any).mockResolvedValue({ isDirectory: () => false, size: 100 });
        modManager = new ModManager();
    });
    it('should handle updateUE4SSModsTxt file read failure (graceful)', async () => {
        const mod = {
            id: '1', name: 'M', isEnabled: true, folderPath: '/m', priority: 1
        };
        (fs.readFile as any).mockResolvedValueOnce(JSON.stringify({ gamePath: '/game' }));
        (fs.readdir as any)
            .mockResolvedValueOnce(['ue4ss'])
            .mockResolvedValueOnce(['Mods'])
            .mockResolvedValueOnce(['MyMod'])
            .mockResolvedValueOnce(['f.lua']);
        (fs.stat as any)
            .mockResolvedValueOnce({ isDirectory: () => true })
            .mockResolvedValueOnce({ isDirectory: () => true })
            .mockResolvedValueOnce({ isDirectory: () => true })
            .mockResolvedValueOnce({ isDirectory: () => false });
        (fs.stat as any).mockResolvedValueOnce({ isDirectory: () => true });
        (fs.stat as any).mockRejectedValueOnce(new Error('No Logic'));
        (fs.stat as any).mockRejectedValueOnce(new Error('No Movies'));
        (fs.readFile as any).mockRejectedValueOnce(new Error('No mods.txt'));
        await modManager.deployMod(mod);
        expect(fs.writeFile).toHaveBeenCalled();
    });
});
describe('ModManager Final Coverage', () => {
    let modManager: ModManager;
    beforeEach(async () => {
        vi.resetAllMocks();
        await completeFileSystemDouble();
        (app.getPath as any).mockReturnValue('/app-data');
        (app.isPackaged as any) = false;
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.readFile as any).mockRejectedValue(new Error('File not found'));
        (fs.writeFile as any).mockResolvedValue(undefined);
        (fs.link as any).mockResolvedValue(undefined);
        (fs.stat as any).mockResolvedValue({ isDirectory: () => false, size: 100 });
        modManager = new ModManager();
    });
    it('should uninstallMod handle fs.rm failure', async () => {
        (fs.readFile as any).mockResolvedValueOnce(JSON.stringify([{ id: '1', folderPath: '/mods/1' }]));
        (fs.rm as any).mockRejectedValueOnce(new Error('Delete failed'));
        const result = await modManager.uninstallMod('1');
        expect(result.success).toBe(false);
    });
});
