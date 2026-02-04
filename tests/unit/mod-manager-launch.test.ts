import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';
import { execFile } from 'child_process';

vi.mock('fs/promises', () => ({
    default: {
        stat: vi.fn(),
        access: vi.fn(),
        readFile: vi.fn(),
        mkdir: vi.fn()
    }
}));

vi.mock('child_process', () => ({
    execFile: vi.fn()
}));

vi.mock('electron', () => ({
    app: { getPath: () => '/tmp', isPackaged: false }
}));

describe('ModManager Launch Gaps', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager({} as any);
        modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/game/exe.exe' });
        (fs.stat as any).mockResolvedValue({ isDirectory: () => false });
        (fs.access as any).mockResolvedValue(undefined);
    });

    it('should launch game without launch arguments', async () => {
        // Mock settings with undefined launchArgs
        modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/game.exe', launchArgs: undefined });

        await modManager.launchGame();

        expect(execFile).toHaveBeenCalledWith(
            '/game.exe',
            ['-fileopenlog'], // Should NOT have undefined or empty string entries
            expect.anything(),
            expect.anything()
        );
    });

    it('should handle execution error in callback', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        (execFile as any).mockImplementation((f: any, a: any, o: any, cb: any) => {
            cb(new Error('Spawn Error'));
        });

        await modManager.launchGame();

        expect(consoleSpy).toHaveBeenCalledWith('Failed to launch game:', expect.anything());
    });
});
