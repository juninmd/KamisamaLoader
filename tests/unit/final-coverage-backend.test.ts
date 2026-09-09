import { completeFileSystemDouble } from '../mock-fs-defaults';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs/promises';
import { ModManager } from '../../electron/mod-manager';
import { searchBySection, fetchAllMods, fetchCategories } from '../../electron/gamebanana';
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
const mockFetch = vi.fn();
global.fetch = mockFetch;
describe('Final Backend Coverage', () => {
    beforeEach(async () => {
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
                const callArgs = mockFetch.mock.calls[0][0];
                expect(callArgs).toContain('_aFilters[Generic_DateAdded_Min]=');
                mockFetch.mockClear();
            }
        });
        it('fetchAllMods should handle partial batch failures', async () => {
            mockFetch
                .mockResolvedValueOnce({ ok: false })
                .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    _aRecords: [{ _idRow: 1, _sName: 'Mod 1' }]
                })
            });
            const results = await fetchAllMods(21179, 2);
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
            await completeFileSystemDouble();
            (fs.stat as any).mockResolvedValue({ size: 100 });
            const src = '/source/file.pak';
            const dest = '/dest/file.pak';
            (fs.mkdir as any).mockResolvedValue(undefined);
            (fs.unlink as any).mockResolvedValue(undefined);
            const exdevError: any = new Error('Cross-device link not permitted');
            exdevError.code = 'EXDEV';
            (fs.link as any).mockRejectedValueOnce(exdevError);
            (fs.copyFile as any).mockResolvedValue(undefined);
            const result = await (manager as any).deployFile(src, dest);
            expect(fs.link).toHaveBeenCalledWith(src, expect.stringContaining(dest + '.kamisama-'));
            expect(fs.copyFile).toHaveBeenCalledWith(src, expect.stringContaining(dest + '.kamisama-'));
            expect(fs.rename).toHaveBeenCalledWith(expect.stringContaining(dest + '.kamisama-'), dest);
            expect(result).toBe(true);
        });
        it('fixPriorities should tie-break by name if priorities are equal', async () => {
            const manager = new ModManager();
            const modsFile = '/mods/mods.json';
            (manager as any).getModsFilePath = vi.fn().mockResolvedValue(modsFile);
            const mockMods = [
                { id: '1', name: 'Z Mod', priority: 1, isEnabled: true },
                { id: '2', name: 'A Mod', priority: 1, isEnabled: true }
            ];
            (fs.readFile as any).mockResolvedValue(JSON.stringify(mockMods));
            (fs.writeFile as any).mockResolvedValue(undefined);
            (manager as any).deployMod = vi.fn().mockResolvedValue(true);
            (manager as any).undeployMod = vi.fn().mockResolvedValue(true);
            await manager.fixPriorities();
            const writeCall = (fs.writeFile as any).mock.calls[0];
            const writtenData = JSON.parse(writeCall[1]);
            const aMod = writtenData.find((m: any) => m.name === 'A Mod');
            const zMod = writtenData.find((m: any) => m.name === 'Z Mod');
            expect(aMod.priority).toBeGreaterThan(zMod.priority);
        });
    });
});
