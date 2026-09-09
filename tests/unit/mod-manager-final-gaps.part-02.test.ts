import './mod-manager-final-gaps.fixture';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';
describe('ModManager Final Gaps', () => {
    let modManager: ModManager;
    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.stat as any).mockResolvedValue({ isDirectory: () => true, size: 100 });
        (fs.readdir as any).mockResolvedValue([]);
    });
    it('should handle non-packaged mode paths', () => {
        modManager.ensureModsDir();
        expect(fs.mkdir).toHaveBeenCalledWith(expect.stringMatching(/Mods$/), expect.anything());
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
    it('should fallback to downloadFile in installUE4SS if downloadManager is missing', async () => {
        modManager = new ModManager(undefined);
        modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/game' });
        (fs.stat as any).mockResolvedValue({ isDirectory: () => true });
        (fs.cp as any).mockResolvedValue(undefined);
        (fs.rm as any).mockResolvedValue(undefined);
        (fs.unlink as any).mockResolvedValue(undefined);
        const result = await modManager.installUE4SS();
        expect(result.success).toBe(true);
    });
});
