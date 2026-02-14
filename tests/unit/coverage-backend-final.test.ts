import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager.js';
import fs from 'fs/promises';
import { app, shell, net } from 'electron';
import child_process from 'child_process';
import path from 'path';

// Mock Dependencies
vi.mock('fs/promises');
vi.mock('fs');
vi.mock('electron', () => ({
    app: { getPath: vi.fn().mockReturnValue('/app/temp'), isPackaged: false },
    shell: { openPath: vi.fn() },
    net: { request: vi.fn() }
}));
vi.mock('child_process');
vi.mock('adm-zip', () => {
    return {
        default: vi.fn().mockImplementation(() => ({
            extractAllToAsync: vi.fn((dest, overwrite, keep, cb) => cb(null))
        }))
    };
});
vi.mock('../../electron/gamebanana.js');
vi.mock('../../electron/github.js');

describe('Backend Final Coverage', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
        (fs.readFile as any).mockResolvedValue('[]');
        (fs.writeFile as any).mockResolvedValue(undefined);
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.stat as any).mockResolvedValue({ isDirectory: () => true, size: 100 });
        (fs.readdir as any).mockResolvedValue([]);
    });

    it('launchGame should handle execFile error', async () => {
        (fs.readFile as any).mockResolvedValue(JSON.stringify({ gamePath: '/game/exe.exe' }));
        (fs.stat as any).mockResolvedValue({ isDirectory: () => false });
        (fs.access as any).mockResolvedValue(undefined);

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        (child_process.execFile as any).mockImplementation((file: string, args: any, opts: any, cb: any) => {
            cb(new Error('Launch failed'));
        });

        await modManager.launchGame();

        expect(child_process.execFile).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith('Failed to launch game:', expect.any(Error));
    });

    it('launchGame should handle directory with no exe found', async () => {
        (fs.readFile as any).mockResolvedValue(JSON.stringify({ gamePath: '/game' }));
        (fs.stat as any).mockResolvedValue({ isDirectory: () => true });
        // Fail both checks
        (fs.access as any).mockRejectedValue(new Error('Not found'));

        await expect(modManager.launchGame()).rejects.toThrow('Could not find SparkingZERO.exe');
    });

    it('deployMod should return false on mkdir failure', async () => {
        (fs.readFile as any).mockResolvedValue(JSON.stringify({ gamePath: '/game.exe' }));
        const mod = { id: '1', name: 'Mod1', isEnabled: true, folderPath: '/mods/Mod1' };

        // Fail mkdir for paksDir (2nd call: 1st is in getSettings)
        (fs.mkdir as any)
            .mockResolvedValueOnce(undefined)
            .mockRejectedValueOnce(new Error('Mkdir fail'));

        const result = await modManager.deployMod(mod as any);
        expect(result).toBe(false);
    });

    it('undeployMod should handle unlink failure gracefully', async () => {
        const mod = { id: '1', name: 'Mod1', deployedFiles: ['/game/file.pak'] };
        (fs.unlink as any).mockRejectedValue(new Error('Locked'));
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = await modManager.undeployMod(mod as any);
        expect(result).toBe(true);
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to delete file'), expect.any(Error));
    });

    it('toggleMod should handle conflict warning', async () => {
        const mods = [
            { id: '1', name: 'Mod1', category: 'Skins', isEnabled: true, priority: 1 },
            { id: '2', name: 'Mod2', category: 'Skins', isEnabled: false, priority: 2 }
        ];
        (fs.readFile as any).mockResolvedValue(JSON.stringify(mods));

        const result = await modManager.toggleMod('2', true);
        expect(result.success).toBe(true);
        expect(result.conflict).toContain('conflicts with "Mod1"');
    });

    it('downloadFile (private) fallback should handle request errors', async () => {
        // Trigger via installUE4SS without downloadManager
        (fs.readFile as any).mockResolvedValue(JSON.stringify({ gamePath: '/game.exe' }));
        const { fetchLatestRelease } = await import('../../electron/github.js');
        (fetchLatestRelease as any).mockResolvedValue('http://fail.com/file.zip');

        // Mock net.request to fail
        (net.request as any).mockReturnValue({
            on: (event: string, cb: any) => {
                if (event === 'error') cb(new Error('Net Error'));
            },
            end: vi.fn()
        });

        const result = await modManager.installUE4SS();
        expect(result.success).toBe(false);
        expect(result.message).toBe('Net Error');
    });

     it('downloadFile (private) fallback should handle non-200 response', async () => {
        (fs.readFile as any).mockResolvedValue(JSON.stringify({ gamePath: '/game.exe' }));
        const { fetchLatestRelease } = await import('../../electron/github.js');
        (fetchLatestRelease as any).mockResolvedValue('http://404.com/file.zip');

        (net.request as any).mockReturnValue({
            on: (event: string, cb: any) => {
                if (event === 'response') cb({ statusCode: 404, headers: {} });
            },
            end: vi.fn()
        });

        const result = await modManager.installUE4SS();
        expect(result.success).toBe(false);
        expect(result.message).toContain('Download failed with status code: 404');
    });

    it('deployFile should fallback to copy on cross-device link error', async () => {
        // Mock deployFile private method by calling installMod or deployMod
        // We can expose it or test via side effect.
        // Let's use deployMod with a file structure that triggers deployFile

        const mod = { id: '1', name: 'Mod1', folderPath: '/mods/Mod1', isEnabled: true };
        (fs.readFile as any).mockResolvedValue(JSON.stringify({ gamePath: '/game.exe' }));
        (fs.readdir as any).mockResolvedValue(['file.pak']);
        (fs.stat as any).mockResolvedValue({ isDirectory: () => false });

        // Fail link with EXDEV
        const exdevError: any = new Error('EXDEV');
        exdevError.code = 'EXDEV';
        (fs.link as any).mockRejectedValueOnce(exdevError);
        (fs.copyFile as any).mockResolvedValue(undefined);

        const result = await modManager.deployMod(mod as any);

        expect(fs.link).toHaveBeenCalled();
        expect(fs.copyFile).toHaveBeenCalled(); // Fallback
        expect(result).toBe(true);
    });

    it('openModsDirectory should handle shell failure', async () => {
        (shell.openPath as any).mockRejectedValue(new Error('Shell fail'));
        const result = await modManager.openModsDirectory();
        expect(result).toBe(false);
    });
});
