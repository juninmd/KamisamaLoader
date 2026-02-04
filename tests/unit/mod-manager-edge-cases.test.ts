import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';
import path from 'path';

// Mock dependencies
vi.mock('child_process', () => ({ execFile: vi.fn() }));
vi.mock('electron', () => ({
    app: {
        getPath: vi.fn(() => '/tmp'),
        isPackaged: false,
    },
    net: { request: vi.fn() },
    shell: { openPath: vi.fn() }
}));
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
        link: vi.fn(),
        copyFile: vi.fn(),
        access: vi.fn()
    }
}));
vi.mock('../../electron/gamebanana', () => ({}));
vi.mock('../../electron/github', () => ({}));
vi.mock('adm-zip', () => ({ default: class {} }));

describe('ModManager Edge Cases', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager({} as any); // Mock DM
        modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/game' });
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.writeFile as any).mockResolvedValue(undefined);
        (fs.unlink as any).mockResolvedValue(undefined);
    });

    describe('fixPriorities', () => {
        it('should tie-break by name if priorities are equal', async () => {
            const mockMods = [
                { id: '1', name: 'B_Mod', priority: 10, isEnabled: true },
                { id: '2', name: 'A_Mod', priority: 10, isEnabled: true }
            ];
            (fs.readFile as any).mockResolvedValue(JSON.stringify(mockMods));

            await modManager.fixPriorities();

            expect(fs.writeFile).toHaveBeenCalled();
            const written = JSON.parse((fs.writeFile as any).mock.calls[0][1]);
            // A_Mod should be higher priority (sorted by name ascending if priority equal?)
            // Logic: sort((a,b) => (b.p - a.p) || a.name.localeCompare(b.name))
            // So Equal priority -> A comes before B in array.
            // Then loop assigns priority based on array index (High to Low).
            // So Index 0 (A) gets Priority 2. Index 1 (B) gets Priority 1.
            const modA = written.find((m: any) => m.name === 'A_Mod');
            const modB = written.find((m: any) => m.name === 'B_Mod');
            expect(modA.priority).toBeGreaterThan(modB.priority);
        });

        it('should NOT write file if priorities are already correct', async () => {
            // A_Mod (p2), B_Mod (p1). Correct order.
            const mockMods = [
                { id: '2', name: 'A_Mod', priority: 2, isEnabled: true },
                { id: '1', name: 'B_Mod', priority: 1, isEnabled: true }
            ];
            (fs.readFile as any).mockResolvedValue(JSON.stringify(mockMods));

            await modManager.fixPriorities();
            expect(fs.writeFile).not.toHaveBeenCalled();
        });
    });

    describe('deployModFiles Edge Cases', () => {
        it('should deploy LogicMods and Movies correctly', async () => {
            const mod = {
                id: '1', name: 'Complex', folderPath: '/mods/Complex', isEnabled: true
            };

            // Structure:
            // /mods/Complex/LogicMods/logic.pak
            // /mods/Complex/Movies/intro.mp4

            (fs.readdir as any).mockImplementation((dir: string) => {
                if (dir === '/mods/Complex') return Promise.resolve(['LogicMods', 'Movies']);
                if (dir.endsWith('LogicMods')) return Promise.resolve(['logic.pak']);
                if (dir.endsWith('Movies')) return Promise.resolve(['intro.mp4']);
                return Promise.resolve([]);
            });

            (fs.stat as any).mockImplementation((p: string) => {
                if (p.endsWith('LogicMods') || p.endsWith('Movies')) return Promise.resolve({ isDirectory: () => true });
                return Promise.resolve({ isDirectory: () => false });
            });

            await modManager.deployMod(mod as any);

            // Expect LogicMod to go to LogicMods folder
            expect(fs.link).toHaveBeenCalledWith(
                expect.stringContaining('logic.pak'),
                expect.stringContaining(path.join('Content', 'Paks', 'LogicMods', 'logic.pak'))
            );

            // Expect Movie to go to Movies folder (no priority prefix)
            expect(fs.link).toHaveBeenCalledWith(
                expect.stringContaining('intro.mp4'),
                expect.stringContaining(path.join('Content', 'Movies', 'intro.mp4'))
            );
        });

        it('should deploy UE4SS mods with deep structure', async () => {
            const mod = { id: 'ue', name: 'UEM', folderPath: '/mods/UEM', isEnabled: true };
            // Structure: /mods/UEM/ue4ss/Mods/MyMod/Scripts/main.lua

            (fs.readdir as any).mockImplementation((dir: string) => {
                if (dir === '/mods/UEM') return Promise.resolve(['ue4ss']);
                if (dir.endsWith('ue4ss')) return Promise.resolve(['Mods']);
                if (dir.endsWith('Mods')) return Promise.resolve(['MyMod']);
                if (dir.endsWith('MyMod')) return Promise.resolve(['Scripts']);
                if (dir.endsWith('Scripts')) return Promise.resolve(['main.lua']);
                return Promise.resolve([]);
            });
            (fs.stat as any).mockImplementation((p: string) => {
                if (path.extname(p) === '.lua') return Promise.resolve({ isDirectory: () => false });
                return Promise.resolve({ isDirectory: () => true });
            });
            (fs.readFile as any).mockResolvedValue(''); // mods.txt empty

            await modManager.deployMod(mod as any);

            expect(fs.link).toHaveBeenCalledWith(
                expect.stringContaining('main.lua'),
                expect.stringContaining(path.join('Binaries', 'Win64', 'Mods', 'MyMod', 'Scripts', 'main.lua'))
            );

            // Check mods.txt update
            expect(fs.writeFile).toHaveBeenCalledWith(
                expect.stringContaining('mods.txt'),
                expect.stringContaining('MyMod : 1')
            );
        });
    });

    describe('updateUE4SSModsTxt', () => {
        it('should update existing entry in mods.txt', async () => {
            const mod = { id: '1', name: 'Existing', folderPath: '/m', isEnabled: true };
            // Simulate it detecting "Existing" as the mod name from UE4SS structure
            // We can trick it by mocking deployModFiles internal logic or just calling private method if exposed?
            // Since it's private, we must test via deployMod with mocked FS.

            (fs.readdir as any).mockResolvedValue(['ue4ss']);
            // ... setup similar to above but with existing mods.txt content
            (fs.stat as any).mockResolvedValue({ isDirectory: () => true }); // Assume all dirs for simplicity to pass check

            // We need a specific file to trigger the ue4ss logic
            (fs.readdir as any).mockImplementation((d: string) => {
                 if (d.endsWith('Mods')) return Promise.resolve(['TargetMod']);
                 if (d.endsWith('TargetMod')) return Promise.resolve(['main.lua']);
                 if (d === '/m') return Promise.resolve(['ue4ss']);
                 if (d.endsWith('ue4ss')) return Promise.resolve(['Mods']);
                 return Promise.resolve([]);
            });
            (fs.stat as any).mockImplementation((p: string) => {
                if (p.endsWith('.lua')) return Promise.resolve({ isDirectory: () => false });
                return Promise.resolve({ isDirectory: () => true });
            });

            (fs.readFile as any).mockImplementation((p: string) => {
                if (p.endsWith('mods.txt')) return Promise.resolve('TargetMod : 0\nOther : 1');
                return Promise.resolve('[]');
            });

            await modManager.deployMod(mod as any);

            expect(fs.writeFile).toHaveBeenCalledWith(
                expect.stringContaining('mods.txt'),
                expect.stringContaining('TargetMod : 1')
            );
             expect(fs.writeFile).toHaveBeenCalledWith(
                expect.stringContaining('mods.txt'),
                expect.stringContaining('Other : 1')
            );
        });

        it('should append new entry if not found', async () => {
             // Similar setup, but mods.txt doesn't have it
             const mod = { id: '1', name: 'New', folderPath: '/m', isEnabled: true };
              (fs.readdir as any).mockImplementation((d: string) => {
                 if (d.endsWith('Mods')) return Promise.resolve(['NewMod']);
                 if (d.endsWith('NewMod')) return Promise.resolve(['main.lua']);
                 if (d === '/m') return Promise.resolve(['ue4ss']);
                 if (d.endsWith('ue4ss')) return Promise.resolve(['Mods']);
                 return Promise.resolve([]);
            });
            (fs.stat as any).mockImplementation((p: string) => {
                 if (p.endsWith('.lua')) return Promise.resolve({ isDirectory: () => false });
                 return Promise.resolve({ isDirectory: () => true });
            });
            (fs.readFile as any).mockImplementation((p: string) => {
                if (p.endsWith('mods.txt')) return Promise.resolve('Other : 1');
                return Promise.resolve('[]');
            });

            await modManager.deployMod(mod as any);

            expect(fs.writeFile).toHaveBeenCalledWith(
                expect.stringContaining('mods.txt'),
                expect.stringContaining('NewMod : 1')
            );
        });
    });

    describe('Misc Error Handling', () => {
        it('updateMod should return false if no download manager', async () => {
            const noDm = new ModManager(undefined);
            noDm.getSettings = vi.fn().mockResolvedValue({ gamePath: '/p' });
            (fs.readFile as any).mockResolvedValue(JSON.stringify([{id:'1', latestFileUrl:'u'}]));

            const result = await noDm.updateMod('1');
            expect(result).toBe(false);
        });

        it('calculateFolderSize should ignore errors and continue', async () => {
            (fs.readdir as any).mockResolvedValue(['a', 'b']);
            (fs.stat as any).mockImplementation((p: string) => {
                if (p.endsWith('a')) return Promise.resolve({ isDirectory: () => false, size: 10 });
                if (p.endsWith('b')) return Promise.reject(new Error('Perm'));
                return Promise.resolve({ isDirectory: () => false, size: 0 });
            });

            const size = await modManager.calculateFolderSize('/root');
            expect(size).toBe(10); // Should count 'a' and ignore 'b'
        });
    });
});
