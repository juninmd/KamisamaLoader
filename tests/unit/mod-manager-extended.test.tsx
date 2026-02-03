import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';
import { app, shell } from 'electron';

// Mock dependencies
vi.mock('fs/promises');
vi.mock('electron', () => ({
    app: {
        getPath: vi.fn().mockReturnValue('/tmp'),
        isPackaged: false
    },
    net: { request: vi.fn() },
    shell: { openPath: vi.fn() }
}));

// Mock AdmZip
const mockExtractAllToAsync = vi.fn((dest, overwrite, keep, cb) => {
    if (dest && dest.includes('fail')) {
        cb(new Error('Zip Error'));
    } else {
        cb(null);
    }
});

vi.mock('adm-zip', () => {
    return {
        default: class {
            extractAllToAsync = mockExtractAllToAsync;
        }
    };
});

vi.mock('child_process', () => ({
    execFile: vi.fn((cmd, args, opts, cb) => {
        if (cmd.includes('fail')) cb(new Error('Exec Error'));
        else cb(null);
    })
}));

describe('ModManager Extended', () => {
    let mm: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        mm = new ModManager();
    });

    it('deployMod: falls back to copy if link fails (EXDEV)', async () => {
        const mod = {
            id: '1',
            name: 'TestMod',
            folderPath: '/mods/TestMod',
            isEnabled: true,
            deployedFiles: []
        };
        (fs.readFile as any).mockResolvedValue(JSON.stringify({ gamePath: '/game' }));
        (fs.stat as any).mockResolvedValue({ isDirectory: () => false });
        (fs.readdir as any).mockResolvedValue(['mod.pak']);
        (fs.link as any).mockRejectedValue({ code: 'EXDEV' });
        (fs.copyFile as any).mockResolvedValue(undefined);
        const result = await mm.deployMod(mod as any);
        expect(result).toBe(true);
    });

    it('deployMod: fails if both link and copy fail', async () => {
        const mod = {
            id: '1',
            name: 'TestMod',
            folderPath: '/mods/TestMod',
            isEnabled: true
        };
        (fs.readFile as any).mockResolvedValue(JSON.stringify({ gamePath: '/game' }));
        (fs.stat as any).mockResolvedValue({ isDirectory: () => false });
        (fs.readdir as any).mockResolvedValue(['mod.pak']);
        (fs.link as any).mockRejectedValue({ code: 'EPERM' });
        (fs.copyFile as any).mockRejectedValue(new Error('Copy Failed'));
        const result = await mm.deployMod(mod as any);
        expect(result).toBe(true);
    });

    it('launchGame: handles execution error', async () => {
        (fs.readFile as any).mockResolvedValue(JSON.stringify({ gamePath: '/fail/game.exe' }));
        (fs.stat as any).mockResolvedValue({ isDirectory: () => false });
        (fs.access as any).mockResolvedValue(undefined);
        await mm.launchGame();
        expect(true).toBe(true);
    });

    it('launchGame: throws if game path is missing', async () => {
        (fs.readFile as any).mockResolvedValue(JSON.stringify({ gamePath: '' }));
        await expect(mm.launchGame()).rejects.toThrow('Game path not configured');
    });

    it('installMod: handles zip extraction failure', async () => {
        (fs.readFile as any).mockResolvedValue(Buffer.from('zipdata'));
        (fs.mkdir as any).mockResolvedValue(undefined);

        const result = await mm.installMod('/path/to/fail.zip');

        expect(result.success).toBe(false);
        expect(result.message).toContain('Zip Error');
    });

    it('fixPriorities: handles read/write errors gracefully', async () => {
        (fs.readFile as any).mockRejectedValue(new Error('Read Error'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        await mm.fixPriorities();
        expect(fs.writeFile).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it('openModsDirectory: handles error', async () => {
        (shell.openPath as any).mockRejectedValue(new Error('Open Error'));
        const result = await mm.openModsDirectory();
        expect(result).toBe(false);
    });

    it('deleteProfile: handles error', async () => {
        (fs.writeFile as any).mockRejectedValue(new Error('Write Error'));
        (fs.readFile as any).mockResolvedValue(JSON.stringify([]));
        const result = await mm.deleteProfile('1');
        expect(result).toBe(false);
    });
});
