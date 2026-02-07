import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import * as gamebanana from '../../electron/gamebanana';
import fs from 'fs/promises';
import { app, shell } from 'electron';
import AdmZip from 'adm-zip';

// Mocks
vi.mock('fs/promises');
vi.mock('electron', () => ({
    app: {
        getPath: vi.fn().mockReturnValue('/tmp'),
        isPackaged: false
    },
    net: { request: vi.fn() },
    shell: { openPath: vi.fn() }
}));

vi.mock('adm-zip', () => {
    return {
        default: class {
            extractAllToAsync(dest: any, overwrite: any, keep: any, cb: any) {
                if (dest && dest.includes('fail')) {
                    cb(new Error('Zip Error'));
                } else {
                    cb(null);
                }
            }
        }
    };
});

vi.mock('child_process', () => ({
    execFile: vi.fn((cmd, args, opts, cb) => {
        if (cmd.includes('fail')) cb(new Error('Exec Error'));
        else cb(null);
    })
}));

// Mock gamebanana module partially
vi.mock('../../electron/gamebanana', async () => {
    const actual = await vi.importActual('../../electron/gamebanana');
    return {
        ...actual,
        getAPICache: () => ({ get: vi.fn(), set: vi.fn() }),
        fetchModProfile: vi.fn(),
        searchOnlineMods: vi.fn()
    };
});

describe('Backend Coverage Gaps', () => {
    let mm: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        mm = new ModManager();
        // Reset console spies if any
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    // --- ModManager Gaps ---

    it('fixPriorities: resolves ties by name', async () => {
        const mods = [
            { id: '1', name: 'B_Mod', priority: 1, isEnabled: true },
            { id: '2', name: 'A_Mod', priority: 1, isEnabled: true }
        ];
        (fs.readFile as any).mockResolvedValue(JSON.stringify(mods));
        (fs.writeFile as any).mockResolvedValue(undefined);

        // Mock deploy/undeploy to avoid side effects
        mm.undeployMod = vi.fn().mockResolvedValue(true);
        mm.deployMod = vi.fn().mockResolvedValue(true);

        await mm.fixPriorities();

        // A_Mod should come first because name 'A' < 'B', so it gets higher priority?
        // Logic:
        // mods.sort((a, b) => {
        //    const pDiff = (b.priority || 0) - (a.priority || 0); // 1 - 1 = 0
        //    if (pDiff !== 0) return pDiff;
        //    return a.name.localeCompare(b.name); // 'A' vs 'B' -> -1 (A comes before B)
        // });
        // So A is first in array.
        // Loop: i=0. targetPriority = 2 - 0 = 2.
        // So A gets priority 2. B gets priority 1.

        expect(fs.writeFile).toHaveBeenCalled();
        const callArgs = (fs.writeFile as any).mock.calls[0][1];
        const savedMods = JSON.parse(callArgs);

        const modA = savedMods.find((m: any) => m.name === 'A_Mod');
        const modB = savedMods.find((m: any) => m.name === 'B_Mod');

        expect(modA.priority).toBe(2);
        expect(modB.priority).toBe(1);
    });

    it('deployMod: handles non-EXDEV link errors', async () => {
        const mod = { id: '1', name: 'Test', folderPath: '/mods/Test' };
        (fs.readFile as any).mockResolvedValue(JSON.stringify({ gamePath: '/game' }));
        (fs.stat as any).mockResolvedValue({ isDirectory: () => false }); // for resolving paths
        (fs.readdir as any).mockResolvedValue(['file.pak']);
        (fs.link as any).mockRejectedValue(new Error('Generic Error')); // Not EXDEV

        const result = await mm.deployMod(mod as any);
        expect(result).toBe(true); // Wrapper returns true but logs error
        // Actually, it returns true if the *loop* completes without throwing out.
        // The error is caught inside `deployFile` -> `catch (error: any) { console.error(...) return false }`.
        // So `deployFile` returns false. `deployModFiles` ignores return value and continues.
        // So `deployMod` returns true.
    });

    it('updateMod: returns false if no download manager (legacy)', async () => {
        // Create MM without DM
        const mmNoDm = new ModManager();
        (fs.readFile as any).mockResolvedValue(JSON.stringify([{ id: '1', latestFileUrl: 'http://test.com/file.zip' }]));

        const result = await mmNoDm.updateMod('1');
        expect(result).toBe(false);
    });

    it('syncActiveProfile: does nothing if no active profile', async () => {
        (fs.readFile as any).mockResolvedValue(JSON.stringify({ activeProfileId: null }));
        // Access private method via any
        await (mm as any).syncActiveProfile('1', true);
        expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('loadProfile: handles error gracefully', async () => {
         (fs.readFile as any).mockRejectedValue(new Error('Read Error'));
         const result = await mm.loadProfile('1');
         expect(result.success).toBe(false);
    });

    it('calculateFolderSize: handles errors', async () => {
        (fs.readdir as any).mockRejectedValue(new Error('Read Error'));
        const size = await mm.calculateFolderSize('/path');
        expect(size).toBe(0);
    });

    it('installMod: handles zip extraction failure (Zip Error)', async () => {
        (fs.readFile as any).mockResolvedValue(Buffer.from('zipdata'));
        (fs.mkdir as any).mockResolvedValue(undefined);

        // Use the mock behavior defined at top: dest includes 'fail' -> throws
        const result = await mm.installMod('/path/to/fail.zip');

        expect(result.success).toBe(false);
        expect(result.message).toContain('Zip Error');
    });

    it('getModChangelog: handles missing mod/id', async () => {
        (fs.readFile as any).mockResolvedValue(JSON.stringify([]));
        const result = await mm.getModChangelog('non-existent');
        expect(result).toBeNull();
    });

    // --- GameBanana Gaps ---
    // We need to test the logic inside gamebanana.ts that we mocked.
    // Wait, we mocked gamebanana.ts module, so we can't test its logic easily unless we import the *actual* functions.
    // But `searchBySection` is exported.

    // We can test `applySorting` if we can access it, but it's not exported.
    // However, `searchBySection` uses it.
});

describe('GameBanana Internal Logic', () => {
    // Need to test the actual module logic, so we unmock it for this block or use a separate file.
    // Since we mocked it globally in this file, we can't easily unmock it here.
    // But we can create a separate test block that *imports* specific non-mocked functions if possible.
    // Or just rely on integration tests?
    // The previous integration tests covered some.
    // We need to hit the branches in `applySorting`.
    // `searchBySection` calls `applySorting`.

    // Let's rely on `tests/unit/gamebanana-gaps.test.ts` for GB logic if possible, or update this file to NOT mock gamebanana entirely.
    // The previous mock was:
    // vi.mock('../../electron/gamebanana', async () => { ... return { ...actual, ... } });
    // So `searchBySection` IS the actual one.

    let originalFetch: any;

    beforeEach(() => {
        originalFetch = global.fetch;
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ _aRecords: [] })
        });
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    it('searchBySection: applies sorting correctly', async () => {
        // We can check the URL passed to fetch

        // 1. Sort by downloads (popularity)
        await gamebanana.searchBySection({ search: 'test', sort: 'downloads' });
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('_sOrder=popularity'));

        // 2. Sort by date
        await gamebanana.searchBySection({ search: 'test', sort: 'date' });
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('_sOrder=newest'));

        // 3. Sort by name + asc
        await gamebanana.searchBySection({ search: 'test', sort: 'name', order: 'asc' });
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('_sOrder=alphabetical'));
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('_sOrder=asc'));
    });

    it('fetchCategories: handles error', async () => {
        (global.fetch as any).mockResolvedValue({ ok: false, status: 500 });
        const cats = await gamebanana.fetchCategories(21179);
        expect(cats).toEqual([]);
    });

    it('fetchFeaturedMods: handles error', async () => {
        // Force error in searchBySection by failing fetch
         (global.fetch as any).mockResolvedValue({ ok: false, status: 500 });
         const mods = await gamebanana.fetchFeaturedMods();
         expect(mods).toEqual([]);
    });

    it('searchBySection: uses Subfeed when no search term', async () => {
        await gamebanana.searchBySection({ search: '', sort: 'date' });
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/Subfeed'));
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('_sSort=new'));
    });

    it('searchBySection: applies date range', async () => {
        await gamebanana.searchBySection({ search: 'test', dateRange: '24h' });
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('_aFilters[Generic_DateAdded_Min]='));
    });

    it('fetchAllMods: fetches multiple pages', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ _aRecords: [{ _idRow: 1, _sName: 'Mod 1' }] })
        }).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ _aRecords: [] }) // Empty page stops it
        });

        const mods = await gamebanana.fetchAllMods(21179, 2);
        expect(mods.length).toBe(1);
    });
});

describe('ModManager Logic Coverage', () => {
    let mm: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        mm = new ModManager();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('toggleMod: detects category conflict', async () => {
        const mods = [
            { id: '1', name: 'Mod A', category: 'Skins', isEnabled: true },
            { id: '2', name: 'Mod B', category: 'Skins', isEnabled: false }
        ];
        (fs.readFile as any).mockResolvedValue(JSON.stringify(mods));
        (fs.writeFile as any).mockResolvedValue(undefined);
        mm.deployMod = vi.fn().mockResolvedValue(true);
        mm.undeployMod = vi.fn().mockResolvedValue(true);
        (mm as any).syncActiveProfile = vi.fn();

        const result = await mm.toggleMod('2', true);

        expect(result.success).toBe(true);
        expect(result.conflict).toContain('conflicts with "Mod A"');
    });

    it('getInstalledMods: recalculates size if 0', async () => {
        const mods = [{ id: '1', name: 'Mod A', folderPath: '/mods/ModA', fileSize: 0 }];
        (fs.readFile as any).mockResolvedValue(JSON.stringify(mods));
        (fs.writeFile as any).mockResolvedValue(undefined);
        (fs.readdir as any).mockResolvedValue(['file.txt']);
        (fs.stat as any).mockResolvedValue({ isDirectory: () => false, size: 1024 });

        const result = await mm.getInstalledMods();
        expect(fs.writeFile).toHaveBeenCalled(); // Should save updated size
        expect(result[0].fileSize).toBe(1024);
    });
});
