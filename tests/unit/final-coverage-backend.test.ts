import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import path from 'path';
import { ModManager } from '../../electron/mod-manager';
import { searchBySection, fetchAllMods, fetchCategories } from '../../electron/gamebanana';

// Mocks
vi.mock('fs/promises');
vi.mock('fs');
vi.mock('electron', () => ({
    app: {
        getPath: vi.fn().mockReturnValue('/app/temp'),
        isPackaged: false
    },
    net: { request: vi.fn() },
    shell: { openPath: vi.fn() }
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Final Backend Coverage', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        mockFetch.mockReset();
    });

    describe('GameBanana API - Extended', () => {
        it('searchBySection should handle dateRange filtering correctly', async () => {
            const ranges = ['24h', 'week', 'month', 'year'];

            for (const range of ranges) {
                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ _aRecords: [] })
                });

                await searchBySection({ dateRange: range as any, search: 'test' });

                // Verify URL contains correct filter
                const callArgs = mockFetch.mock.calls[0][0];
                expect(callArgs).toContain('_aFilters[Generic_DateAdded_Min]=');
                mockFetch.mockClear();
            }
        });

        it('fetchAllMods should handle partial batch failures', async () => {
            // Mock fetch to fail for one page but succeed for another
            mockFetch
                .mockResolvedValueOnce({ ok: false }) // Page 1 fails
                .mockResolvedValueOnce({ // Page 2 succeeds
                    ok: true,
                    json: async () => ({
                        _aRecords: [{ _idRow: 1, _sName: 'Mod 1' }]
                    })
                });

            // Mock checkRateLimit implicitly via fast execution or mock p-limit if needed
            // But p-limit handles concurrency, we just need fetch to respond.

            const results = await fetchAllMods(21179, 2); // 2 pages
            // Should contain results from page 2
            expect(results).toHaveLength(1);
            expect(results[0].name).toBe('Mod 1');
        });

        it('fetchCategories should return empty array on API failure', async () => {
            mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
            const cats = await fetchCategories();
            expect(cats).toEqual([]);
        });
    });

    describe('ModManager - Extended Deployment Logic', () => {
        it('deployFile should fallback to copy if link fails with EXDEV', async () => {
            const manager = new ModManager();
            const src = '/source/file.pak';
            const dest = '/dest/file.pak';

            // Mock mkdir
            (fs.mkdir as any).mockResolvedValue(undefined);
            // Mock unlink (success or fail doesn't matter much here, assume success)
            (fs.unlink as any).mockResolvedValue(undefined);

            // Mock link to throw EXDEV
            const exdevError: any = new Error('Cross-device link not permitted');
            exdevError.code = 'EXDEV';
            (fs.link as any).mockRejectedValueOnce(exdevError);

            // Mock copyFile to succeed
            (fs.copyFile as any).mockResolvedValue(undefined);

            // Need to spy on console.log to verify fallback message if we want strictness,
            // but return value true is enough for now.

            // We need to access private method or just trust public deployMod calls it.
            // But to target the specific lines, we can use `deployMod` with a setup that triggers it.
            // Or cast to any to call private.
            const result = await (manager as any).deployFile(src, dest);

            expect(fs.link).toHaveBeenCalledWith(src, dest);
            expect(fs.copyFile).toHaveBeenCalledWith(src, dest);
            expect(result).toBe(true);
        });

        it('fixPriorities should tie-break by name if priorities are equal', async () => {
            const manager = new ModManager();
            const modsFile = '/mods/mods.json';

            // Mock getModsFilePath
            (manager as any).getModsFilePath = vi.fn().mockResolvedValue(modsFile);

            const mockMods = [
                { id: '1', name: 'Z Mod', priority: 1, isEnabled: true },
                { id: '2', name: 'A Mod', priority: 1, isEnabled: true }
            ];

            (fs.readFile as any).mockResolvedValue(JSON.stringify(mockMods));
            (fs.writeFile as any).mockResolvedValue(undefined);

            // Mock deploy/undeploy to avoid side effects
            (manager as any).deployMod = vi.fn().mockResolvedValue(true);
            (manager as any).undeployMod = vi.fn().mockResolvedValue(true);

            await manager.fixPriorities();

            // Verify fs.writeFile was called with sorted mods
            // Z Mod (id 1) and A Mod (id 2) have same priority (1).
            // Logic: sort by priority DESC. If equal, sort by name ASC.
            // So 'A Mod' should come before 'Z Mod' in list?
            // Wait, the logic is:
            // a.priority - b.priority (desc) -> 1 - 1 = 0
            // a.name.localeCompare(b.name) -> 'Z'.localeCompare('A') = 1 (Z > A)
            // So A comes first? No, sort in JS:
            // if > 0, b comes first.
            // Actually: a.name.localeCompare(b.name).
            // 'Z' vs 'A' -> 1.
            // So Z is "greater" than A.
            // If the sort function returns 1, b is sorted before a?
            // sort((a,b) => ...)
            // if > 0, sort b before a.
            // So if Z comes before A in list, and we return 1, A moves before Z.
            // So 'A Mod' should end up at index 0, 'Z Mod' at index 1.

            // After sort: [A Mod, Z Mod]
            // Re-assign priorities:
            // Index 0 (A Mod): priority = 2 (Total)
            // Index 1 (Z Mod): priority = 1 (Total - 1)

            const writeCall = (fs.writeFile as any).mock.calls[0];
            const writtenData = JSON.parse(writeCall[1]);

            const aMod = writtenData.find((m: any) => m.name === 'A Mod');
            const zMod = writtenData.find((m: any) => m.name === 'Z Mod');

            expect(aMod.priority).toBeGreaterThan(zMod.priority);
        });
    });
});
