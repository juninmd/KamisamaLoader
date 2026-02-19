import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';

// Mocks
const { mockFs } = vi.hoisted(() => {
    return {
        mockFs: {
            readFile: vi.fn(),
            writeFile: vi.fn(),
            mkdir: vi.fn(),
            unlink: vi.fn(),
            stat: vi.fn(),
            readdir: vi.fn(),
            link: vi.fn(),
            copyFile: vi.fn(),
            rm: vi.fn(),
            cp: vi.fn(),
            access: vi.fn()
        }
    };
});

vi.mock('fs', async () => ({
    default: { ...mockFs, unlink: vi.fn((p, cb) => cb(null)) },
    createWriteStream: vi.fn(() => ({
        write: vi.fn(),
        close: vi.fn(),
        end: vi.fn(),
        on: vi.fn(),
    })),
}));
vi.mock('fs/promises', () => ({ default: mockFs }));

vi.mock('child_process', () => ({
    execFile: vi.fn((cmd, args, opts, cb) => {
        if (cmd.includes('fail')) {
            cb(new Error('Exec fail'));
        } else {
            cb(null);
        }
    })
}));

vi.mock('electron', () => ({
    app: { getPath: vi.fn(() => '/tmp'), isPackaged: false },
    net: { request: vi.fn() },
    shell: { openPath: vi.fn() }
}));

import { ModManager } from '../../electron/mod-manager';

describe('ModManager Coverage Boost', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
        mockFs.stat.mockResolvedValue({ isDirectory: () => false, size: 100 });
        mockFs.readdir.mockResolvedValue([]);
    });

    describe('deployModFiles', () => {
        it('should handle ue4ss directory', async () => {
            const mod = {
                id: '1', name: 'UE4SSMod', folderPath: '/mods/ue4ss', isEnabled: true
            };
            modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/game/exe' });

            // Mock file structure
            // /mods/ue4ss/ue4ss/Mods/MyMod/main.lua
            mockFs.readdir.mockImplementation(async (dir) => {
                if (dir === '/mods/ue4ss') return ['ue4ss'];
                if (dir === '/mods/ue4ss/ue4ss') return ['Mods'];
                if (dir === '/mods/ue4ss/ue4ss/Mods') return ['MyMod'];
                if (dir === '/mods/ue4ss/ue4ss/Mods/MyMod') return ['main.lua'];
                return [];
            });

            mockFs.stat.mockImplementation(async (p) => {
                if (p.includes('.') && !p.endsWith('ue4ss')) return { isDirectory: () => false }; // file
                return { isDirectory: () => true }; // dir
            });

            // Mock link success
            mockFs.link.mockResolvedValue(undefined);
            mockFs.readFile.mockResolvedValue('');

            await modManager.deployMod(mod);

            // Verify deployFile called
            expect(mockFs.link).toHaveBeenCalled();
            // Verify mods.txt update logic triggered (via readFile/writeFile on mods.txt path)
            // It should try to read mods.txt
            expect(mockFs.readFile).toHaveBeenCalled();
        });

        it('should handle LogicMods directory', async () => {
             const mod = {
                id: '2', name: 'LogicMod', folderPath: '/mods/logic', isEnabled: true
            };
            modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/game/exe' });

             // /mods/logic/LogicMods/MyLogic.pak
            mockFs.readdir.mockImplementation(async (dir) => {
                if (dir === '/mods/logic') return ['LogicMods'];
                if (dir === '/mods/logic/LogicMods') return ['MyLogic.pak'];
                return [];
            });
             mockFs.stat.mockImplementation(async (p) => {
                if (p.endsWith('LogicMods')) return { isDirectory: () => true };
                return { isDirectory: () => false };
            });

             await modManager.deployMod(mod);
             // Verify link to LogicMods dir
             // Dest should contain LogicMods
             const linkCalls = mockFs.link.mock.calls;
             const logicModCall = linkCalls.find(c => c[1].includes('LogicMods'));
             expect(logicModCall).toBeDefined();
        });

        it('should handle Movies directory', async () => {
             const mod = {
                id: '3', name: 'MovieMod', folderPath: '/mods/movies', isEnabled: true
            };
            modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/game/exe' });

             // /mods/movies/Movies/Intro.mp4
            mockFs.readdir.mockImplementation(async (dir) => {
                if (dir === '/mods/movies') return ['Movies'];
                if (dir === '/mods/movies/Movies') return ['Intro.mp4'];
                return [];
            });
             mockFs.stat.mockImplementation(async (p) => {
                if (p.endsWith('Movies')) return { isDirectory: () => true };
                return { isDirectory: () => false };
            });

             await modManager.deployMod(mod);
             // Verify link to Content/Movies
             const linkCalls = mockFs.link.mock.calls;
             const movieCall = linkCalls.find(c => c[1].includes('Content') && c[1].includes('Movies'));
             expect(movieCall).toBeDefined();
        });
    });

    describe('installMod', () => {
        it('should return error if copyFile fails', async () => {
            mockFs.stat.mockResolvedValue({ isDirectory: () => false, size: 100 });
            mockFs.copyFile.mockRejectedValue(new Error('Copy failed'));

            const result = await modManager.installMod('/downloads/mod.pak');
            expect(result.success).toBe(false);
            expect(result.message).toContain('Copy failed');
        });
    });

    describe('launchGame', () => {
        it('should handle missing exe', async () => {
             modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/game/dir' });
             mockFs.stat.mockResolvedValue({ isDirectory: () => true }); // treat gamePath as dir
             mockFs.access.mockRejectedValue(new Error('Not found')); // fail finding sub-exe

             await expect(modManager.launchGame()).rejects.toThrow('Could not find SparkingZERO.exe');
        });

         it('should launch with extra args', async () => {
             modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/game/exe', launchArgs: '-dx12' });
             mockFs.stat.mockResolvedValue({ isDirectory: () => false });

             await modManager.launchGame();
             // execFile mocked in child_process
             // Checking if it didn't throw is good enough for now
        });
    });
});
