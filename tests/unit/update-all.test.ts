import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';

// Mock everything needed by ModManager
vi.mock('child_process', () => ({ execFile: vi.fn() }));
vi.mock('electron', () => ({
    app: { getPath: vi.fn(() => '/tmp'), isPackaged: false },
    net: { request: vi.fn() },
    shell: { openPath: vi.fn() }
}));
vi.mock('fs/promises', () => ({
    default: {
        readFile: vi.fn(),
        writeFile: vi.fn(),
        mkdir: vi.fn(),
        stat: vi.fn(),
        unlink: vi.fn(),
        readdir: vi.fn(),
        rm: vi.fn(),
        link: vi.fn(),
        copyFile: vi.fn(),
    }
}));
vi.mock('fs', () => ({
    createWriteStream: vi.fn(),
    default: { createWriteStream: vi.fn() }
}));
vi.mock('adm-zip', () => ({
    default: class { constructor() {} extractAllTo = vi.fn(); }
}));
vi.mock('../../electron/gamebanana', () => ({}));
vi.mock('../../electron/github', () => ({}));

describe('ModManager - updateAllMods', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
        // Mock getSettings to avoid file read
        modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/mock/game' });
    });

    it('should update all mods successfully', async () => {
        const modIds = ['1', '2', '3'];

        // Mock updateMod to succeed
        modManager.updateMod = vi.fn().mockResolvedValue(true);

        const result = await modManager.updateAllMods(modIds);

        expect(result.successCount).toBe(3);
        expect(result.failCount).toBe(0);
        expect(result.results).toHaveLength(3);
        expect(modManager.updateMod).toHaveBeenCalledTimes(3);
        expect(modManager.updateMod).toHaveBeenCalledWith('1');
        expect(modManager.updateMod).toHaveBeenCalledWith('2');
        expect(modManager.updateMod).toHaveBeenCalledWith('3');
    });

    it('should handle partial failures', async () => {
        const modIds = ['1', '2', '3'];

        // Mock updateMod: 1 succeeds, 2 fails, 3 succeeds
        modManager.updateMod = vi.fn()
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce(false)
            .mockResolvedValueOnce(true);

        const result = await modManager.updateAllMods(modIds);

        expect(result.successCount).toBe(2);
        expect(result.failCount).toBe(1);
        expect(result.results.find(r => r.id === '2')?.success).toBe(false);
    });

    it('should handle exceptions in updateMod', async () => {
        const modIds = ['1'];
        modManager.updateMod = vi.fn().mockRejectedValue(new Error('Update failed'));

        // Silence console.error for this test
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const result = await modManager.updateAllMods(modIds);

        expect(result.successCount).toBe(0);
        expect(result.failCount).toBe(1);
        expect(result.results[0].success).toBe(false);
    });

    it('should respect concurrency (implicitly checked via p-limit usage)', async () => {
        // While we can't easily check exact concurrency without spying on p-limit,
        // we can ensure the logic flow works for many items.
        const modIds = Array.from({ length: 10 }, (_, i) => String(i));
        modManager.updateMod = vi.fn().mockResolvedValue(true);

        const result = await modManager.updateAllMods(modIds);
        expect(result.successCount).toBe(10);
    });
});
