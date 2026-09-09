import './coverage-backend-gaps.fixture';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import * as gamebanana from '../../electron/gamebanana';
import fs from 'fs/promises';
describe('GameBanana Internal Logic', () => {
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
        await gamebanana.searchBySection({ search: 'test', sort: 'downloads' });
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('_sOrder=popularity'));
        await gamebanana.searchBySection({ search: 'test', sort: 'date' });
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('_sOrder=newest'));
        await gamebanana.searchBySection({ search: 'test', sort: 'name', order: 'asc' });
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('_sOrder=alphabetical'));
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('_sOrder=asc'));
    });
});
describe('GameBanana Internal Logic', () => {
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
    it('fetchCategories: handles error', async () => {
        (global.fetch as any).mockResolvedValue({ ok: false, status: 500 });
        const cats = await gamebanana.fetchCategories(21179);
        expect(cats).toEqual([]);
    });
});
describe('GameBanana Internal Logic', () => {
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
    it('fetchFeaturedMods: handles error', async () => {
        (global.fetch as any).mockResolvedValue({ ok: false, status: 500 });
        const mods = await gamebanana.fetchFeaturedMods();
        expect(mods).toEqual([]);
    });
});
describe('GameBanana Internal Logic', () => {
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
    it('searchBySection: uses Subfeed when no search term', async () => {
        await gamebanana.searchBySection({ search: '', sort: 'date' });
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/Subfeed'));
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('_sSort=new'));
    });
});
describe('GameBanana Internal Logic', () => {
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
    it('searchBySection: applies date range', async () => {
        await gamebanana.searchBySection({ search: 'test', dateRange: '24h' });
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('_aFilters[Generic_DateAdded_Min]='));
    });
});
describe('GameBanana Internal Logic', () => {
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
    it('fetchAllMods: fetches multiple pages', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ _aRecords: [{ _idRow: 1, _sName: 'Mod 1' }] })
        }).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ _aRecords: [] })
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
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
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
        expect(result.conflict).toContain('shares the category');
    });
});
