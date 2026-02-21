import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';

// --- Virtual Filesystem ---
const virtualFS: Record<string, string | Buffer> = {};
const virtualDirs: Set<string> = new Set();

const normalizePath = (p: string) => p.replace(/\\/g, '/');

// Reset FS before each test
const resetFS = () => {
    for (const key in virtualFS) delete virtualFS[key];
    virtualDirs.clear();
    virtualDirs.add('/game'); // Game root
    virtualDirs.add('/game/SparkingZERO/Content/Paks/~mods'); // Game mods dir
    virtualDirs.add('/mods'); // Mods storage
};

vi.mock('fs/promises', () => ({
    default: {
        mkdir: vi.fn(async (p, opts) => {
            const normalized = normalizePath(p);
            virtualDirs.add(normalized);
            // recursive: true implies parents are created, let's assume success
        }),
        readFile: vi.fn(async (p) => {
            const normalized = normalizePath(p);
            if (virtualFS[normalized] !== undefined) return virtualFS[normalized];
            throw new Error(`ENOENT: no such file or directory, open '${p}'`);
        }),
        writeFile: vi.fn(async (p, data) => {
            const normalized = normalizePath(p);
            virtualFS[normalized] = data;
        }),
        unlink: vi.fn(async (p) => {
            const normalized = normalizePath(p);
            if (virtualFS[normalized]) delete virtualFS[normalized];
            else throw new Error('ENOENT');
        }),
        link: vi.fn(async (src, dest) => {
            const nSrc = normalizePath(src);
            const nDest = normalizePath(dest);
            if (virtualFS[nSrc] === undefined) throw new Error('ENOENT: src not found');
            virtualFS[nDest] = virtualFS[nSrc]; // Simulate link by copying content reference
        }),
        copyFile: vi.fn(async (src, dest) => {
            const nSrc = normalizePath(src);
            const nDest = normalizePath(dest);
            if (virtualFS[nSrc] === undefined) throw new Error('ENOENT: src not found');
            virtualFS[nDest] = virtualFS[nSrc];
        }),
        stat: vi.fn(async (p) => {
            const normalized = normalizePath(p);
            if (virtualDirs.has(normalized)) return { isDirectory: () => true, size: 0 };
            if (virtualFS[normalized] !== undefined) return { isDirectory: () => false, size: 1024 };
            throw new Error(`ENOENT: no such file or directory, stat '${p}'`);
        }),
        readdir: vi.fn(async (p) => {
            const normalized = normalizePath(p);
            // Simple filter: find keys in virtualFS that start with p
            // and find dirs in virtualDirs that start with p
            // This is a rough simulation
            const entries = new Set<string>();

            // Files
            for (const file of Object.keys(virtualFS)) {
                if (file.startsWith(normalized + '/') && file.lastIndexOf('/') === normalized.length) {
                    entries.add(path.basename(file));
                }
            }
            // Dirs (we don't strictly track nested dirs in this set logic properly for sub-sub dirs,
            // but ModManager usually reads flat lists or recursive.
            // getAllFiles is recursive.
            // Let's rely on getAllFiles implementation in ModManager which calls readdir.
            // We need to return direct children.

            // NOTE: ModManager.getAllFiles uses recursion.
            // If I mock readdir, I need to be careful.

            // Improved readdir mock for children:
            // Check files
            Object.keys(virtualFS).forEach(f => {
                if (f.startsWith(normalized + '/')) {
                     const relative = f.slice(normalized.length + 1);
                     const parts = relative.split('/');
                     entries.add(parts[0]);
                }
            });
             // Check dirs
             virtualDirs.forEach(d => {
                if (d.startsWith(normalized + '/') && d !== normalized) {
                     const relative = d.slice(normalized.length + 1);
                     const parts = relative.split('/');
                     entries.add(parts[0]);
                }
            });

            return Array.from(entries);
        }),
        rm: vi.fn(async (p, opts) => {
             const normalized = normalizePath(p);
             // Remove all files starting with p
             Object.keys(virtualFS).forEach(k => {
                 if (k.startsWith(normalized)) delete virtualFS[k];
             });
             // Remove dirs
             virtualDirs.forEach(d => {
                 if (d.startsWith(normalized)) virtualDirs.delete(d);
             });
        }),
        access: vi.fn(async (p) => {
             const normalized = normalizePath(p);
             if (virtualFS[normalized] || virtualDirs.has(normalized)) return;
             throw new Error('ENOENT');
        })
    }
}));

vi.mock('electron', () => ({
    app: { getPath: () => '/mock/app/path', isPackaged: false },
    net: { request: vi.fn() },
    shell: { openPath: vi.fn() }
}));

vi.mock('child_process', () => ({
    execFile: vi.fn()
}));

// Mock AdmZip to just "explode" files into virtualFS
vi.mock('adm-zip', () => {
    return {
        default: vi.fn(function(buffer) {
            return {
                extractAllToAsync: vi.fn((dest, overwrite, keep, cb) => {
                    // Simulate extracting a file
                    const normalizedDest = normalizePath(dest);
                    virtualFS[`${normalizedDest}/mod_file.pak`] = 'dummy content';
                    cb(null);
                })
            };
        })
    };
});


describe('Full Installer Lifecycle Simulation', () => {
    let modManager: ModManager;

    beforeEach(() => {
        resetFS();
        vi.clearAllMocks();
        modManager = new ModManager();
        // Setup initial paths
        virtualDirs.add('/mock/app/path');
        // Setup game exe
        virtualFS['/game/SparkingZERO.exe'] = 'exe binary content';
    });

    it('should complete a full install, launch, and uninstall cycle', async () => {
        // 1. Setup Settings
        const gamePath = '/game';
        await modManager.saveSettings({ gamePath });

        // Verify settings saved
        const settingsPath = '/mods/settings.json'; // Default path in non-packaged mode might be different, let's check.
        // In constructor: if !isPackaged -> __dirname/../../Mods.
        // We mocked app.getPath but constructor logic for !isPackaged uses __dirname.
        // We need to override ensureModsDir or just check wherever it wrote.
        // Actually, we can just call getSettings to verify.

        const settings = await modManager.getSettings();
        expect(settings.gamePath).toBe(gamePath);

        // 2. Install a Mod (Drag and Drop simulation)
        // We simulate dropping a zip file.
        // First, create the dummy zip file in virtualFS to be "read"
        virtualFS['/downloads/MyMod.zip'] = Buffer.from('dummy zip content');

        const installResult = await modManager.installMod('/downloads/MyMod.zip');
        expect(installResult.success).toBe(true);

        // Verify mod is in installed list
        const installedMods = await modManager.getInstalledMods();
        expect(installedMods.length).toBe(1);
        expect(installedMods[0].name).toBe('MyMod');
        expect(installedMods[0].isEnabled).toBe(true);

        // Verify mod files exist in storage
        // installMod extracts to modsDir/MyMod
        // Our AdmZip mock creates 'mod_file.pak' inside dest
        // So we expect: /mods/MyMod/mod_file.pak (assuming modsDir resolved to /mods)
        // Let's find where it is
        const mod = installedMods[0];
        const storedFile = `${mod.folderPath}/mod_file.pak`;
        expect(virtualFS[normalizePath(storedFile)]).toBeDefined();

        // 3. Verify Deployment (Auto-deployed on install)
        // ModManager deploys to: Game/SparkingZERO/Content/Paks/~mods
        // Filename format: 001_mod_file.pak
        const expectedDeployedPath = '/game/SparkingZERO/Content/Paks/~mods/001_mod_file.pak';
        expect(virtualFS[expectedDeployedPath]).toBeDefined();

        // 4. Launch Game
        await modManager.launchGame();

        // Verify execFile called with correct args
        // Since settings has gamePath, it should try to launch it
        expect(execFile).toHaveBeenCalledWith(
            '/game/SparkingZERO.exe',
            expect.arrayContaining(['-fileopenlog']),
            expect.anything(),
            expect.anything()
        );

        // 5. Toggle Mod (Disable)
        await modManager.toggleMod(mod.id, false);

        // Verify file removed from game dir
        expect(virtualFS[expectedDeployedPath]).toBeUndefined();

        // Verify stored file still exists
        expect(virtualFS[normalizePath(storedFile)]).toBeDefined();

        // 6. Toggle Mod (Enable)
        await modManager.toggleMod(mod.id, true);
        expect(virtualFS[expectedDeployedPath]).toBeDefined();

        // 7. Uninstall Mod
        await modManager.uninstallMod(mod.id);

        // Verify everything gone
        expect(virtualFS[expectedDeployedPath]).toBeUndefined();
        expect(virtualFS[normalizePath(storedFile)]).toBeUndefined();

        const finalMods = await modManager.getInstalledMods();
        expect(finalMods.length).toBe(0);
    });
});
