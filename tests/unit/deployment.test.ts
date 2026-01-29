import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';
import path from 'path';

// Mock electron app
vi.mock('electron', () => ({
    app: {
        getPath: vi.fn((name) => name === 'exe' ? '/app/exe' : '/tmp'),
        isPackaged: false,
    },
    net: { request: vi.fn() },
    shell: { openPath: vi.fn() }
}));

// Mock fs/promises
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
        link: vi.fn(), // Key for testing hardlinks
        copyFile: vi.fn(),
    }
}));

// Mock fs
vi.mock('fs', () => ({
    createWriteStream: vi.fn(),
    default: { createWriteStream: vi.fn() }
}));

// Mock gamebanana & others to avoid errors during instantiation
vi.mock('../../electron/gamebanana', () => ({}));
vi.mock('../../electron/github', () => ({}));
vi.mock('adm-zip', () => ({ default: class {} }));

describe('Deployment Logic (Non-Destructive)', () => {
    let modManager: ModManager;
    const mockGamePath = '/games/SparkingZERO/SparkingZERO.exe';
    const paksDir = '/games/SparkingZERO/SparkingZERO/Content/Paks/~mods';

    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();

        // Mock Settings to return valid game path
        modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: mockGamePath });

        // Default fs mocks
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.readFile as any).mockResolvedValue('[]');
        (fs.writeFile as any).mockResolvedValue(undefined);
        (fs.stat as any).mockImplementation((p: string) => {
             // Treat directories as directories if path ends with specific names
             if (p.endsWith('ModA') || p.endsWith('ModB') || p.endsWith('Mods')) {
                 return Promise.resolve({ isDirectory: () => true });
             }
             return Promise.resolve({ isDirectory: () => false });
        });
    });

    it('should use hardlinks (fs.link) to deploy files', async () => {
        const mod = {
            id: '1',
            name: 'ModA',
            folderPath: '/Mods/ModA',
            isEnabled: true,
            priority: 1
        };

        // Mock readdir to return a pak file in the mod source folder
        (fs.readdir as any).mockImplementation((dir: string) => {
            if (dir === '/Mods/ModA') return Promise.resolve(['ModA.pak']);
            return Promise.resolve([]);
        });

        await modManager.deployMod(mod as any);

        // Verify fs.link was called (Smart Link)
        expect(fs.link).toHaveBeenCalledWith(
            path.normalize('/Mods/ModA/ModA.pak'),
            expect.stringContaining('ModA.pak') // Destination should contain filename
        );

        // Verify it didn't fallback to copy
        expect(fs.copyFile).not.toHaveBeenCalled();
    });

    it('should NOT delete existing files in ~mods that belong to other mods', async () => {
        // Scenario: Mod B is already deployed. We deploy Mod A.
        // We want to ensure Mod B's files are touched/deleted.
        // NOTE: The `deployMod` function logic does NOT iterate over the destination folder
        // and delete unknown files (which is what Unverum used to do).
        // It only deploys the files from the source mod.
        // We verify this by ensuring `fs.unlink` is ONLY called for the specific destination path
        // to overwrite it if it exists, not on other files.

        const modA = {
            id: '1',
            name: 'ModA',
            folderPath: '/Mods/ModA',
            isEnabled: true,
            priority: 1
        };

        (fs.readdir as any).mockImplementation((dir: string) => {
            if (dir === '/Mods/ModA') return Promise.resolve(['ModA.pak']);
            if (dir === paksDir) return Promise.resolve(['002_ModB.pak']); // Existing Mod B
            return Promise.resolve([]);
        });

        await modManager.deployMod(modA as any);

        // fs.unlink might be called to clear the *specific target file* before linking
        // (path: .../~mods/001_ModA.pak)
        // It should NOT be called for '002_ModB.pak'.

        const unlinkCalls = (fs.unlink as any).mock.calls.map((c: any) => c[0]);
        const deletedModB = unlinkCalls.some((path: string) => path.includes('002_ModB.pak'));

        expect(deletedModB).toBe(false);
    });

    it('should fallback to copyFile if link fails (Cross-Drive support)', async () => {
        const mod = {
            id: '1',
            name: 'ModA',
            folderPath: '/Mods/ModA',
            isEnabled: true
        };

        (fs.readdir as any).mockResolvedValue(['ModA.pak']);

        // Fail the link attempt
        (fs.link as any).mockRejectedValue({ code: 'EXDEV' });

        await modManager.deployMod(mod as any);

        expect(fs.link).toHaveBeenCalled();
        expect(fs.copyFile).toHaveBeenCalledWith(
            path.normalize('/Mods/ModA/ModA.pak'),
            expect.anything()
        );
    });

    it('should support .pak, .utoc, .ucas, .sig extensions (IoStore support)', async () => {
        const mod = {
            id: '1',
            name: 'ComplexMod',
            folderPath: '/Mods/ComplexMod',
            isEnabled: true
        };

        const files = ['data.pak', 'data.utoc', 'data.ucas', 'data.sig', 'readme.txt'];
        (fs.readdir as any).mockResolvedValue(files);

        await modManager.deployMod(mod as any);

        // Should link 4 files, ignore readme.txt
        expect(fs.link).toHaveBeenCalledTimes(4);

        const calls = (fs.link as any).mock.calls;
        const linkedFiles = calls.map((c: any) => c[0]);

        expect(linkedFiles.some(f => f.endsWith('data.pak'))).toBe(true);
        expect(linkedFiles.some(f => f.endsWith('data.utoc'))).toBe(true);
        expect(linkedFiles.some(f => f.endsWith('data.ucas'))).toBe(true);
        expect(linkedFiles.some(f => f.endsWith('data.sig'))).toBe(true);
        expect(linkedFiles.some(f => f.endsWith('readme.txt'))).toBe(false);
    });
});
