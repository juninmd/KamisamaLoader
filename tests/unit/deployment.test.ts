import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager, LocalMod } from '../../electron/mod-manager';
import fs from 'fs/promises';
import path from 'path';

// Mock everything required for ModManager instantiation
vi.mock('electron', () => ({
    app: {
        getPath: () => '/tmp',
        isPackaged: false,
    },
    net: { request: vi.fn() },
    shell: { openPath: vi.fn() }
}));

vi.mock('child_process', () => ({ execFile: vi.fn() }));

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

vi.mock('fs', () => ({
    createWriteStream: vi.fn(),
    default: { createWriteStream: vi.fn() }
}));

vi.mock('adm-zip', () => ({
    default: class {
        extractAllTo = vi.fn();
    }
}));

describe('Mod Deployment (Non-Destructive)', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager(undefined);

        // Setup default settings with a fake game path
        modManager.getSettings = vi.fn().mockResolvedValue({
            gamePath: '/Game/SparkingZERO.exe'
        });

        // Mock fs default behaviors
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.stat as any).mockResolvedValue({ isDirectory: () => false });
    });

    it('should NOT delete the entire ~mods directory when deploying a mod', async () => {
        const mod: LocalMod = {
            id: 'mod1',
            name: 'TestMod',
            folderPath: '/Mods/TestMod',
            priority: 1,
            isEnabled: true,
            author: 'Me',
            version: '1.0',
            description: 'desc',
            fileSize: 100
        };

        // Mock that the mod folder has one .pak file
        (fs.readdir as any).mockImplementation((dir: string) => {
            if (dir === '/Mods/TestMod') return Promise.resolve(['001_TestMod.pak']);
            return Promise.resolve([]);
        });

        // Mock stat to handle directory checks
        (fs.stat as any).mockImplementation((path: string) => {
            if (path === '/Mods/TestMod') return Promise.resolve({ isDirectory: () => true });
            // By default return file
            return Promise.resolve({ isDirectory: () => false });
        });

        await modManager.deployMod(mod);

        // Expectation:
        // 1. mkdir should be called for destination
        // 2. unlink might be called for the SPECIFIC file (to overwrite)
        // 3. link/copy called
        // 4. rm should NOT be called for the parent folder

        const paksDir = path.normalize('/Game/SparkingZERO/Content/Paks/~mods');

        // Verify mkdir
        expect(fs.mkdir).toHaveBeenCalledWith(expect.stringContaining('~mods'), { recursive: true });

        // Verify unlink was called for the specific file
        const expectedDest = path.join(paksDir, '001_001_TestMod.pak');
        // Note: filename logic is `${priority}_${filename}`.
        // Wait, in mod-manager logic:
        // const destFilename = `${priority}_${filename}`;
        // But here the input filename is '001_TestMod.pak'. The code pads priority to 3 chars.
        // So priority 1 -> "001".
        // Result: 001_001_TestMod.pak.

        expect(fs.unlink).toHaveBeenCalledWith(expectedDest);

        // Crucial: Verify fs.rm was NOT called on the paksDir
        // fs.rm is usually used for recursive delete.
        // We want to ensure we didn't wipe the directory.
        const rmCalls = (fs.rm as any).mock.calls;
        const paksDirRm = rmCalls.find((call: any) => call[0] === paksDir);
        expect(paksDirRm).toBeUndefined();

        // Also check recursive unlink on dir?
        // ModManager uses undeployMod which iterates `deployedFiles` and unlinks them one by one.
        // It does not use `fs.rm(paksDir, ...)`
    });

    it('should deploy multiple mods side-by-side without interference', async () => {
        // This test simulates deploying Mod A then Mod B, ensuring Mod A's files aren't targeted by Mod B's deploy process

        const modA: LocalMod = {
            id: 'modA',
            name: 'ModA',
            folderPath: '/Mods/ModA',
            priority: 1,
            isEnabled: true,
            author: 'Me',
            version: '1.0',
            description: '',
            fileSize: 100,
            deployedFiles: []
        };

        const modB: LocalMod = {
            id: 'modB',
            name: 'ModB',
            folderPath: '/Mods/ModB',
            priority: 2,
            isEnabled: true,
            author: 'Me',
            version: '1.0',
            description: '',
            fileSize: 100
        };

        // Setup Mod A deployment
        (fs.readdir as any).mockResolvedValueOnce(['ModA.pak']);
        await modManager.deployMod(modA);

        const destA = path.normalize('/Game/SparkingZERO/Content/Paks/~mods/001_ModA.pak');
        expect(fs.link).toHaveBeenCalledWith('/Mods/ModA/ModA.pak', destA);

        // Reset mocks to track Mod B specifically
        vi.clearAllMocks();
        // Setup Mod B deployment
        (fs.readdir as any).mockResolvedValueOnce(['ModB.pak']);

        // Re-mock getSettings as clearAllMocks wiped it
        modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/Game/SparkingZERO.exe' });
        (fs.mkdir as any).mockResolvedValue(undefined);

        await modManager.deployMod(modB);

        const destB = path.normalize('/Game/SparkingZERO/Content/Paks/~mods/002_ModB.pak');
        expect(fs.link).toHaveBeenCalledWith('/Mods/ModB/ModB.pak', destB);

        // Ensure we didn't touch Mod A's file during Mod B's deploy
        expect(fs.unlink).not.toHaveBeenCalledWith(destA);
    });
});
