import './mod-manager-final-gaps.fixture';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';
import path from 'path';
describe('ModManager Final Gaps', () => {
    let modManager: ModManager;
    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.stat as any).mockResolvedValue({ isDirectory: () => true, size: 100 });
        (fs.readdir as any).mockResolvedValue([]);
    });
    it('should fallback to copyFile when fs.link fails with EXDEV', async () => {
        const mod = {
            id: '1',
            name: 'TestMod',
            isEnabled: true,
            folderPath: '/mods/TestMod',
            priority: 1,
            fileSize: 100
        };
        modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/game' });
        (fs.readdir as any).mockResolvedValue(['file.pak']);
        (fs.stat as any).mockResolvedValue({ isDirectory: () => false });
        const exdevError: any = new Error('Cross-device link not permitted');
        exdevError.code = 'EXDEV';
        (fs.link as any).mockRejectedValueOnce(exdevError);
        (fs.copyFile as any).mockResolvedValue(undefined);
        const result = await modManager.deployMod(mod);
        expect(result).toBe(true);
        expect(fs.link).toHaveBeenCalled();
        expect(fs.copyFile).toHaveBeenCalled();
    });
});
describe('ModManager Final Gaps', () => {
    let modManager: ModManager;
    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.stat as any).mockResolvedValue({ isDirectory: () => true, size: 100 });
        (fs.readdir as any).mockResolvedValue([]);
    });
    it('should fallback to copyFile when fs.link fails with EPERM', async () => {
        const mod = {
            id: '1',
            name: 'TestMod',
            isEnabled: true,
            folderPath: '/mods/TestMod',
            priority: 1,
            fileSize: 100
        };
        modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/game' });
        (fs.readdir as any).mockResolvedValue(['file.pak']);
        (fs.stat as any).mockResolvedValue({ isDirectory: () => false });
        const epermError: any = new Error('Operation not permitted');
        epermError.code = 'EPERM';
        (fs.link as any).mockRejectedValueOnce(epermError);
        (fs.copyFile as any).mockResolvedValue(undefined);
        const result = await modManager.deployMod(mod);
        expect(result).toBe(true);
        expect(fs.copyFile).toHaveBeenCalled();
    });
});
describe('ModManager Final Gaps', () => {
    let modManager: ModManager;
    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.stat as any).mockResolvedValue({ isDirectory: () => true, size: 100 });
        (fs.readdir as any).mockResolvedValue([]);
    });
    it('should fail deployment if copyFile also fails', async () => {
        const mod = {
            id: '1',
            name: 'TestMod',
            isEnabled: true,
            folderPath: '/mods/TestMod',
            priority: 1,
            fileSize: 100
        };
        modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/game' });
        (fs.readdir as any).mockResolvedValue(['file.pak']);
        (fs.stat as any).mockResolvedValue({ isDirectory: () => false });
        const exdevError: any = new Error('EXDEV');
        exdevError.code = 'EXDEV';
        (fs.link as any).mockRejectedValueOnce(exdevError);
        (fs.copyFile as any).mockRejectedValue(new Error('Copy failed'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        await modManager.deployMod(mod);
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Deployment failed'), expect.any(Error));
        consoleSpy.mockRestore();
    });
});
describe('ModManager Final Gaps', () => {
    let modManager: ModManager;
    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.stat as any).mockResolvedValue({ isDirectory: () => true, size: 100 });
        (fs.readdir as any).mockResolvedValue([]);
    });
    it('should correctly resolve game path when given a deep nested exe', async () => {
        const nestedPath = '/Game/SparkingZERO/Binaries/Win64/SparkingZERO-Win64-Shipping.exe';
        modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: nestedPath });
        const mod = {
            id: '1',
            name: 'TestMod',
            isEnabled: true,
            folderPath: '/mods/TestMod',
            priority: 1,
            fileSize: 100
        };
        (fs.readdir as any).mockResolvedValue(['file.pak']);
        (fs.stat as any).mockResolvedValue({ isDirectory: () => false });
        (fs.link as any).mockResolvedValue(undefined);
        await modManager.deployMod(mod);
        const expectedDest = path.join('/Game/SparkingZERO/Content/Paks/~mods', '001_file.pak');
        expect(fs.link).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('~mods'));
    });
});
describe('ModManager Final Gaps', () => {
    let modManager: ModManager;
    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.stat as any).mockResolvedValue({ isDirectory: () => true, size: 100 });
        (fs.readdir as any).mockResolvedValue([]);
    });
    it('should fail updateMod if downloadManager is missing', async () => {
        modManager = new ModManager(undefined);
        (fs.readFile as any).mockResolvedValue(JSON.stringify([{
                id: '1',
                name: 'Mod',
                latestFileUrl: 'http://example.com/file.zip'
            }]));
        const result = await modManager.updateMod('1');
        expect(result).toBe(false);
    });
});
