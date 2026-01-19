import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';
import { app } from 'electron';
import { execFile } from 'child_process';

// Mock child_process
vi.mock('child_process', () => ({
    execFile: vi.fn((path, args, opts, cb) => cb && cb(null)),
}));

// Mock electron app
vi.mock('electron', () => ({
    app: {
        getPath: vi.fn(() => '/tmp'),
        isPackaged: false,
    },
    net: {
        request: vi.fn(),
    }
}));

// Mock fs
vi.mock('fs/promises');
vi.mock('fs');

// Mock gamebanana
vi.mock('../../electron/gamebanana', () => ({
    fetchModProfile: vi.fn(),
    searchOnlineMods: vi.fn(),
}));

describe('ModManager', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
    });

    it('should be defined', () => {
        expect(modManager).toBeDefined();
    });

    it('ensureModsDir should create directory', async () => {
        (fs.mkdir as any).mockResolvedValue(undefined);
        const dir = await modManager.ensureModsDir();
        expect(fs.mkdir).toHaveBeenCalledWith(expect.stringContaining('Mods'), { recursive: true });
        expect(dir).toContain('Mods');
    });

    it('getInstalledMods should return empty array on error', async () => {
        (fs.readFile as any).mockRejectedValue(new Error('No file'));
        const mods = await modManager.getInstalledMods();
        expect(mods).toEqual([]);
    });

    it('toggleMod should update mod status', async () => {
        const mockMods = [{ id: '1', isEnabled: false, folderPath: '/mock/mods/dir/mod1' }]; // Add folderPath
        (fs.readFile as any).mockResolvedValue(JSON.stringify(mockMods));
        (fs.writeFile as any).mockResolvedValue(undefined);
        // Mock getSettings to return a path so deployMod doesn't fail
        modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/mock/game/path' });
        modManager.ensureModsDir = vi.fn().mockResolvedValue('/mock/mods/dir');

        // Mock getAllFiles to prevent error in deployMod
        (modManager as any).getAllFiles = vi.fn().mockResolvedValue([]);
        // Mock stat for ue4ss check
        (fs.stat as any).mockRejectedValue(new Error('Not found'));

        const result = await modManager.toggleMod('1', true);

        expect(result).toEqual({ success: true, conflict: null });
        const writeCall = (fs.writeFile as any).mock.calls[0];
        const writtenData = JSON.parse(writeCall[1]);
        expect(writtenData[0].isEnabled).toBe(true);
    });
    it('launchGame should execute correct binary', async () => {
        // Mock checking path
        (fs.stat as any).mockResolvedValue({ isDirectory: () => true });
        (fs.access as any).mockResolvedValue(undefined); // Success
        // Mock settings
        (fs.readFile as any).mockResolvedValue(JSON.stringify({ gamePath: '/mock/game/path' }));

        const result = await modManager.launchGame();

        expect(result).toBe(true);
        expect(execFile).toHaveBeenCalled();
        const callArgs = (execFile as any).mock.calls[0];
        expect(callArgs[0]).toContain('SparkingZERO.exe');
    });

    it('launchGame should fail if not configured', async () => {
        (fs.readFile as any).mockResolvedValue(JSON.stringify({ gamePath: '' }));
        await expect(modManager.launchGame()).rejects.toThrow('configured');
    });
});
