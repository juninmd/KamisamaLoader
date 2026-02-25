import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchItemData, searchBySection } from '../../electron/gamebanana';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';

// Mock API Cache
vi.mock('../../electron/api-cache', () => ({
    getAPICache: () => ({
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn(),
    })
}));

// Mock GitHub
vi.mock('../../electron/github.js', () => ({
    fetchLatestRelease: vi.fn().mockResolvedValue(null)
}));

// Mock ModManager deps
vi.mock('fs/promises', () => ({
    default: {
        readFile: vi.fn().mockResolvedValue('[]'),
        writeFile: vi.fn(),
        mkdir: vi.fn(),
        readdir: vi.fn().mockResolvedValue([]),
        stat: vi.fn().mockResolvedValue({ isDirectory: () => true }),
        rm: vi.fn(),
        cp: vi.fn(),
        unlink: vi.fn(),
        access: vi.fn(), // Needed for launchGame
    }
}));
vi.mock('electron', () => ({
    app: { getPath: vi.fn().mockReturnValue('/temp'), isPackaged: false },
    shell: { openPath: vi.fn() },
    net: { request: vi.fn() }
}));

describe('GameBanana API Final Gaps', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    it('should handle fetchItemData error', async () => {
        (global.fetch as any).mockResolvedValue({ ok: false, status: 500 });
        const result = await fetchItemData('Mod', 1);
        expect(result).toBeNull();
    });

    it('should handle fetchItemData exception', async () => {
        (global.fetch as any).mockRejectedValue(new Error('Network'));
        const result = await fetchItemData('Mod', 1);
        expect(result).toBeNull();
    });

    it('should handle searchBySection error text', async () => {
        (global.fetch as any).mockResolvedValue({
            ok: false,
            status: 400,
            text: vi.fn().mockResolvedValue('Bad Request')
        });
        const result = await searchBySection({ page: 1 } as any);
        expect(result).toEqual([]);
    });
});

describe('ModManager Backend Final Gaps', () => {
    let modManager: ModManager;

    beforeEach(() => {
        modManager = new ModManager();
        // Setup base settings
        vi.spyOn(modManager, 'getSettings').mockResolvedValue({ gamePath: '/game/exe' });
        // Ensure stat returns directory for checking game path
        (fs.stat as any).mockResolvedValue({ isDirectory: () => true });
    });

    it('should handle installUE4SS download failure', async () => {
        const result = await modManager.installUE4SS();
        expect(result.success).toBe(false);
        expect(result.message).toContain('Failed to fetch UE4SS release');
    });

    it('should handle launchGame exe not found', async () => {
        // Mock access to reject (file not found)
        (fs.access as any).mockRejectedValue(new Error('No access'));

        await expect(modManager.launchGame()).rejects.toThrow('Could not find SparkingZERO.exe');
    });
});
