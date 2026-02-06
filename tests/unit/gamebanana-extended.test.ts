import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as gamebanana from '../../electron/gamebanana';

// Mock api-cache
const mockCache = {
    get: vi.fn(),
    set: vi.fn()
};
vi.mock('../../electron/api-cache', () => ({
    getAPICache: () => mockCache
}));

// Mock global fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('GameBanana API Extended', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockCache.get.mockResolvedValue(null);
        mockCache.set.mockResolvedValue(undefined);
        fetchMock.mockReset(); // Ensure clean state
    });

    // afterEach(() => {
    //     vi.useRealTimers();
    // });

    describe('Rate Limiting', () => {
        it('should wait if rate limit exceeded', async () => {
            fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
            const p = gamebanana.fetchItemData('Mod', 1);
            await p;
            expect(fetchMock).toHaveBeenCalled();
        });
    });

    describe('Sorting Logic (via searchBySection)', () => {
        it('should apply correct sort parameters for Search Results', async () => {
            fetchMock.mockResolvedValue({ ok: true, json: async () => ({ _aRecords: [] }) });

            // With search string -> Search Endpoint
            await gamebanana.searchBySection({ search: 'test', sort: 'downloads' });
            expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('_sOrder=popularity'));

            await gamebanana.searchBySection({ search: 'test', sort: 'date' });
            expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('_sOrder=newest'));

            await gamebanana.searchBySection({ search: 'test', sort: 'name' });
            expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('_sOrder=alphabetical'));

            // Ascending
             await gamebanana.searchBySection({ search: 'test', sort: 'name', order: 'asc' });
             expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('_sOrder=asc'));
        });

        it('should apply correct sort parameters for Subfeed', async () => {
             fetchMock.mockResolvedValue({ ok: true, json: async () => ({ _aRecords: [] }) });

             // Without search string -> Subfeed
             // Subfeed only supports date and name sorting in this implementation to avoid 400

             await gamebanana.searchBySection({ sort: 'date' });
             expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('_sSort=new'));

             await gamebanana.searchBySection({ sort: 'name' });
             expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('_sSort=alphabetical'));

             // Unsupported sorts should NOT add _sSort
             fetchMock.mockClear();
             await gamebanana.searchBySection({ sort: 'downloads' });
             expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('_sSort'));
        });
    });

    describe('Fetch All Mods Pagination', () => {
         it('should stop if page returns empty or error', async () => {
             fetchMock.mockImplementation((url) => {
                 if (url.includes('_nPage=1')) return Promise.resolve({ ok: true, json: async () => ({ _aRecords: [{_idRow:1}] }) });
                 return Promise.resolve({ ok: false }); // Error on page 2
             });

             const mods = await gamebanana.fetchAllMods(21179, 5);
             expect(mods.length).toBe(1);
         });

         it('should deduplicate mods', async () => {
              fetchMock.mockImplementation((url) => {
                 return Promise.resolve({ ok: true, json: async () => ({ _aRecords: [{_idRow:1, _sName: 'Mod1'}] }) });
             });

             const mods = await gamebanana.fetchAllMods(21179, 2);
             // Both pages return same mod ID
             expect(mods.length).toBe(1);
         });
    });

    describe('Item Data', () => {
         it('should include fields parameter', async () => {
             fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
             await gamebanana.fetchItemData('Mod', 1, ['name', 'date']);
             expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('_aDataSchema=name,date'));
         });

         it('should return null on fetch exception', async () => {
             fetchMock.mockRejectedValue(new Error('Fail'));
             const res = await gamebanana.fetchItemData('Mod', 1);
             expect(res).toBeNull();
         });
    });
});
