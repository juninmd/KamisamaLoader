import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';
import { app } from 'electron';
import { execFile } from 'child_process';
import path from 'path';

// Mock child_process
vi.mock('child_process', () => {
    const execFileMock = vi.fn((path, args, opts, cb) => {
         if (typeof opts === 'function') {
             cb = opts;
             opts = {};
         }
         cb && cb(null);
    });
    return {
        execFile: execFileMock,
        default: { execFile: execFileMock }
    };
});

// Mock electron app
vi.mock('electron', () => ({
    app: {
        getPath: vi.fn((name) => name === 'exe' ? '/app/exe' : '/tmp'),
        isPackaged: false,
    },
    net: {
        request: vi.fn(),
    },
    shell: {
        openPath: vi.fn()
    }
}));

// Mock fs/promises (default export)
vi.mock('fs/promises', () => ({
    default: {
        readFile: vi.fn(),
        writeFile: vi.fn(),
        mkdir: vi.fn(),
        stat: vi.fn(),
        unlink: vi.fn(),
        readdir: vi.fn(),
        rm: vi.fn(),
        cp: vi.fn(),
        access: vi.fn(),
        link: vi.fn(),
        copyFile: vi.fn(),
    }
}));

// Mock fs (named exports + default)
vi.mock('fs', () => {
    const createWriteStream = vi.fn();
    return {
        createWriteStream,
        default: { createWriteStream }
    };
});

// Mock gamebanana
vi.mock('../../electron/gamebanana', () => ({
    fetchModProfile: vi.fn(),
    searchOnlineMods: vi.fn(),
    getModChangelog: vi.fn(),
    fetchModDetails: vi.fn(),
}));

// Mock download manager
const mockDownloadManager = {
    startDownload: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn()
};

describe('ModManager', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager(mockDownloadManager as any);
        // Default settings mock
        modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/mock/game/path' });
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
        // Mock settings (override beforeEach)
        (fs.readFile as any).mockResolvedValue(JSON.stringify({ gamePath: '/mock/game/path' }));
        modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/mock/game/path' });

        const result = await modManager.launchGame();

        expect(result).toBe(true);
        expect(execFile).toHaveBeenCalled();
        const callArgs = (execFile as any).mock.calls[0];
        expect(callArgs[0]).toContain('SparkingZERO.exe');
    });

    it('launchGame should fail if not configured', async () => {
        modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '' });
        await expect(modManager.launchGame()).rejects.toThrow('configured');
    });

    it('getInstalledMods should return mods sorted by priority descending', async () => {
        const mockMods = [
            { id: '1', name: 'Low Priority', priority: 1 },
            { id: '2', name: 'High Priority', priority: 100 },
            { id: '3', name: 'Mid Priority', priority: 50 }
        ];

        (fs.readFile as any).mockResolvedValue(JSON.stringify(mockMods));

        const result = await modManager.getInstalledMods();

        expect(result).toHaveLength(3);
        expect(result[0].id).toBe('2'); // 100
        expect(result[1].id).toBe('3'); // 50
        expect(result[2].id).toBe('1'); // 1
    });

    it('setModPriority "up" should increase priority', async () => {
        const mockMods = [
            { id: '2', name: 'High Priority', priority: 100, isEnabled: false },
            { id: '3', name: 'Mid Priority', priority: 50, isEnabled: false },
            { id: '1', name: 'Low Priority', priority: 1, isEnabled: false }
        ];

        (fs.readFile as any).mockResolvedValue(JSON.stringify(mockMods));

        await modManager.setModPriority('3', 'up');

        const calls = (fs.writeFile as any).mock.calls;
        const writtenData = JSON.parse(calls[calls.length - 1][1]);

        expect(writtenData[0].id).toBe('3');
        expect(writtenData[1].id).toBe('2');
    });

    it('deployMod should deploy files to correct locations', async () => {
        const mod = {
            id: '1', name: 'TestMod', priority: 5, folderPath: '/mods/TestMod',
            isEnabled: true, deployedFiles: []
        };

        // Mock file system for deploy
        (modManager as any).getAllFiles = vi.fn().mockResolvedValue([
            '/mods/TestMod/file.pak',
            '/mods/TestMod/LogicMods/logic.pak',
            '/mods/TestMod/ue4ss/bin/tool.dll'
        ]);

        (fs.stat as any).mockImplementation((p: string) => {
            if (p.includes('ue4ss') || p.includes('LogicMods')) return Promise.resolve({ isDirectory: () => true });
            return Promise.resolve({ isDirectory: () => false });
        });

        // Mock mkdir, link (success)
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.link as any).mockResolvedValue(undefined);
        (fs.unlink as any).mockResolvedValue(undefined);

        const result = await modManager.deployMod(mod as any);

        expect(result).toBe(true);
        // Expect link calls
        // 1. .pak -> ~mods/005_file.pak
        // 2. logic.pak -> LogicMods/logic.pak
        // 3. tool.dll -> Binaries/Win64/bin/tool.dll

        expect(fs.link).toHaveBeenCalledTimes(3);
    });

    it('deployMod should fallback to copy if link fails', async () => {
        const mod = {
             id: '1', name: 'TestMod', folderPath: '/mods/TestMod', priority: 1, isEnabled: true
        };
        (modManager as any).getAllFiles = vi.fn().mockResolvedValue(['/mods/TestMod/file.pak']);
        (fs.stat as any).mockResolvedValue({ isDirectory: () => false });

        const error: any = new Error('EXDEV');
        error.code = 'EXDEV';
        (fs.link as any).mockRejectedValue(error);
        (fs.copyFile as any).mockResolvedValue(undefined);

        await modManager.deployMod(mod as any);

        expect(fs.copyFile).toHaveBeenCalled();
    });

    it('installOnlineMod should start download', async () => {
        const mockMod = { gameBananaId: 123, name: 'OnlineMod' };
        const mockProfile = {
            _aFiles: [{ _idRow: 1, _sDownloadUrl: 'http://dl' }],
            _sName: 'OnlineMod',
            _sVersion: '1.0'
        };

        const { fetchModProfile } = await import('../../electron/gamebanana');
        (fetchModProfile as any).mockResolvedValue(mockProfile);

        mockDownloadManager.startDownload.mockReturnValue('dl-1');

        const result = await modManager.installOnlineMod(mockMod as any);

        expect(result.success).toBe(true);
        expect(mockDownloadManager.startDownload).toHaveBeenCalled();
    });
});
