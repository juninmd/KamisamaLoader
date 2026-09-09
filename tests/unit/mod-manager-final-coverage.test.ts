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
    it('should handle fs.mkdir failure in ensureModsDir', async () => {
        (fs.mkdir as any).mockRejectedValueOnce(new Error('Permission denied'));
        const result = await modManager.ensureModsDir();
        expect(result).toBeNull();
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
    it('should handle deployMod failure when fs.mkdir fails', async () => {
        const mod = {
            id: '1',
            name: 'TestMod',
            isEnabled: true,
            folderPath: '/mods/TestMod',
            priority: 1
        };
        (fs.readFile as any).mockResolvedValueOnce(JSON.stringify({ gamePath: '/game' }));
        (fs.mkdir as any)
            .mockResolvedValueOnce(undefined)
            .mockRejectedValueOnce(new Error('Mkdir failed'));
        const result = await modManager.deployMod(mod);
        expect(result).toBe(false);
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
    it('should fall back to fs.copyFile if fs.link fails with EXDEV', async () => {
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
        const exdevError: any = new Error('Cross-device link not permitted');
        exdevError.code = 'EXDEV';
        (fs.link as any).mockRejectedValueOnce(exdevError);
        (fs.copyFile as any).mockResolvedValueOnce(undefined);
        const result = await modManager.deployMod(mod);
        expect(result).toBe(true);
        expect(fs.copyFile).toHaveBeenCalled();
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
    it('should return false if fs.copyFile also fails after EXDEV', async () => {
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
        const exdevError: any = new Error('Cross-device link');
        exdevError.code = 'EXDEV';
        (fs.link as any).mockRejectedValueOnce(exdevError);
        (fs.copyFile as any).mockRejectedValueOnce(new Error('Copy failed'));
        const result = await modManager.deployMod(mod);
        expect(result).toBe(false);
    });
});
