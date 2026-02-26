import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchBySection, fetchItemData, fetchAllMods } from '../../electron/gamebanana';

// Mock global fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

vi.mock('electron', () => ({
    app: {
        getPath: vi.fn().mockReturnValue('/userData')
    },
    net: { request: vi.fn() }
}));

describe('GameBanana Coverage Gaps', () => {
    beforeEach(() => {
        fetchMock.mockReset();
        // Reset cache if possible or mock api-cache module
        // Since api-cache is internal, we might need to rely on clearing mocks
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should construct correct URL for search with date and category filters', async () => {
        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ({ _aRecords: [] })
        });

        await searchBySection({
            search: 'Goku',
            categoryId: 123,
            dateRange: 'week'
        });

        expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('_aFilters[Generic_Category]=123'));
        expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('_aFilters[Generic_DateAdded_Min]='));
    });

    it('should apply correct sorting parameters', async () => {
        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ({ _aRecords: [] })
        });

        // Test date sort
        await searchBySection({ search: 'Goku', sort: 'date' });
        expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('_sOrder=newest'));

        // Test downloads sort
        await searchBySection({ search: 'Goku', sort: 'downloads' });
        expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('_sOrder=popularity'));
    });

    it('should handle fetchItemData errors', async () => {
        // 404
        fetchMock.mockResolvedValueOnce({
            ok: false,
            status: 404,
            text: async () => 'Not Found'
        });

        const result = await fetchItemData('Mod', 1);
        expect(result).toBeNull();
    });

    it('should handle fetchAllMods empty pages', async () => {
        // First call returns empty array
        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ({ _aRecords: [] })
        });

        const results = await fetchAllMods(123, 1);
        expect(results).toEqual([]);
        // Should stop after first batch/page
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
