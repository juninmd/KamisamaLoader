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
    it('should handle getSettings failure gracefully', async () => {
        (fs.readFile as any).mockRejectedValueOnce(new Error('Read failed'));
        const settings = await modManager.getSettings();
        expect(settings).toEqual({ gamePath: '' });
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
    it('should handle saveSettings failure', async () => {
        (fs.writeFile as any).mockRejectedValueOnce(new Error('Write failed'));
        const result = await modManager.saveSettings({ gamePath: '/game' });
        expect(result).toBe(false);
    });
});
