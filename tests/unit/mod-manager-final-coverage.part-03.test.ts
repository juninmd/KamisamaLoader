import './mod-manager-final-coverage.fixture';
import { completeFileSystemDouble } from '../mock-fs-defaults';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import * as fs from 'fs/promises';
import { app, shell } from 'electron';
import AdmZip from 'adm-zip';
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
    it('should installMod handle zip extraction failure', async () => {
        (AdmZip as any).mockImplementation(() => {
            throw new Error('Zip invalid');
        });
        const result = await modManager.installMod('/path/to/bad.zip');
        expect(result.success).toBe(false);
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
    it('should installMod handle direct file copy failure', async () => {
        (fs.copyFile as any).mockRejectedValueOnce(new Error('Copy failed'));
        const result = await modManager.installMod('/path/to/file.pak');
        expect(result.success).toBe(false);
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
    it('should updateMod return false if downloadManager is missing', async () => {
        (fs.readFile as any).mockResolvedValueOnce(JSON.stringify([{ id: '1', latestFileUrl: 'http://url' }]));
        const result = await modManager.updateMod('1');
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
    it('should handle openModsDirectory failure', async () => {
        (fs.mkdir as any).mockResolvedValue(undefined);
        (shell.openPath as any).mockRejectedValueOnce(new Error('Open failed'));
        const result = await modManager.openModsDirectory();
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
    it('should handle openModsDirectory success', async () => {
        (fs.mkdir as any).mockResolvedValue(undefined);
        (shell.openPath as any).mockResolvedValue('');
        const result = await modManager.openModsDirectory();
        expect(result).toBe(true);
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
    it('should syncActiveProfile when toggling mod with active profile', async () => {
        vi.resetAllMocks();
        await completeFileSystemDouble();
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.link as any).mockResolvedValue(undefined);
        (fs.stat as any).mockResolvedValue({ isDirectory: () => false });
        (fs.readFile as any)
            .mockResolvedValueOnce(JSON.stringify([{ id: 'm1', isEnabled: false, category: 'UI', folderPath: '/mods/m1' }]))
            .mockResolvedValueOnce(JSON.stringify({ gamePath: '/game' }))
            .mockResolvedValueOnce(JSON.stringify({ gamePath: '/game', activeProfileId: 'p1' }))
            .mockResolvedValueOnce(JSON.stringify([{ id: 'p1', name: 'Main', modIds: [] }]));
        await modManager.toggleMod('m1', true);
        expect(fs.writeFile).toHaveBeenCalledTimes(2);
    });
});
