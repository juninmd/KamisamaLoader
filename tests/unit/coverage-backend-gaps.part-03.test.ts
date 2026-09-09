import './coverage-backend-gaps.fixture';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';
describe('ModManager Logic Coverage', () => {
    let mm: ModManager;
    beforeEach(() => {
        vi.clearAllMocks();
        mm = new ModManager();
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });
    it('getInstalledMods: recalculates size if 0', async () => {
        const mods = [{ id: '1', name: 'Mod A', folderPath: '/mods/ModA', fileSize: 0 }];
        (fs.readFile as any).mockResolvedValue(JSON.stringify(mods));
        (fs.writeFile as any).mockResolvedValue(undefined);
        (fs.readdir as any).mockResolvedValue(['file.txt']);
        (fs.stat as any).mockResolvedValue({ isDirectory: () => false, size: 1024 });
        const result = await mm.getInstalledMods();
        expect(fs.writeFile).toHaveBeenCalled();
        expect(result[0].fileSize).toBe(1024);
    });
});
