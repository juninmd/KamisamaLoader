import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';
import { app } from 'electron';
import { fetchModProfile } from '../../electron/gamebanana';

vi.mock('electron', () => ({
    app: {
        getPath: vi.fn(() => '/tmp'),
        isPackaged: false,
    },
}));

vi.mock('../../electron/gamebanana', () => ({
    fetchModProfile: vi.fn(),
}));

vi.mock('fs/promises', () => ({
    default: {
        readFile: vi.fn(),
        writeFile: vi.fn(),
        mkdir: vi.fn(),
        stat: vi.fn(),
    }
}));

describe('ModManager Error Branches', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
        (fs.mkdir as any).mockResolvedValue(undefined);
    });

    it('should catch error in installOnlineMod', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // Make fetchModProfile throw an error
        (fetchModProfile as any).mockRejectedValue(new Error('Network error'));

        const result = await modManager.installOnlineMod({ gameBananaId: 123 } as any);
        expect(result.success).toBe(false);
        expect(result.message).toContain('Installation failed: Network error');

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});
