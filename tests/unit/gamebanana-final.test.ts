import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as gamebanana from '../../electron/gamebanana.js';
import { getAPICache } from '../../electron/api-cache.js';

// Mock dependencies
vi.mock('../../electron/api-cache.js', () => ({
    getAPICache: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
    }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Ensure we start far in the future to exceed any module-load-time timestamp
let testStartTime = Date.now() + 1000 * 60 * 60 * 24 * 365; // +1 year

describe('GameBanana Final Coverage', () => {
    beforeEach(() => {
        // Always use fake timers to control Date.now() and setTimeout
        vi.useFakeTimers();

        // Increment time significantly to reset rate limiter state
        testStartTime += 1000 * 60 * 60; // +1 hour each test
        vi.setSystemTime(testStartTime);

        vi.clearAllMocks();
        mockFetch.mockReset();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should hit rate limit logic', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ _aRecords: [] })
        });

        const promises = [];
        for (let i = 0; i < 65; i++) {
            promises.push(gamebanana.searchOnlineMods(1, 'test'));
        }

        await vi.advanceTimersByTimeAsync(61000);
        await Promise.all(promises);

        expect(mockFetch).toHaveBeenCalled();
    });

    it('fetchAllMods should handle empty pages and stop early (batch granularity)', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ _aRecords: [] })
        });

        const modsPromise = gamebanana.fetchAllMods(21179, 20);
        await vi.advanceTimersByTimeAsync(2000);
        await modsPromise;

        expect(mockFetch).toHaveBeenCalledTimes(10);
    });

    it('fetchModUpdates should handle empty updates array', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => []
        });

        const result = await gamebanana.fetchModUpdates(1);
        expect(result).toBeNull();
    });

    it('getModChangelog should handle API error', async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 500,
            statusText: 'Error'
        });

        const result = await gamebanana.getModChangelog(1);
        expect(result).toEqual([]);
    });

    it('getModChangelog should handle empty array response', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => []
        });

        const result = await gamebanana.getModChangelog(1);
        expect(result).toEqual([]);
    });

    it('fetchNewMods should call searchBySection with date sort', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ _aRecords: [] })
        });

        await gamebanana.fetchNewMods(1);
        const url = mockFetch.mock.calls[0][0];
        expect(url).toContain('_sSort=new');
    });

    it('fetchFeaturedMods should sort results by likes locally', async () => {
        const mockMods = [
            { _idRow: 1, _nLikeCount: 10, _sName: 'Low' },
            { _idRow: 2, _nLikeCount: 100, _sName: 'High' }
        ];

        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ _aRecords: mockMods })
        });

        const results = await gamebanana.fetchFeaturedMods();
        expect(results[0].name).toBe('High');
        expect(results[1].name).toBe('Low');
    });

    it('searchBySection should apply various sort parameters correctly', async () => {
        mockFetch.mockResolvedValue({ ok: true, json: async () => ({ _aRecords: [] }) });

        // Search supports sorting
        await gamebanana.searchBySection({ search: 't', sort: 'downloads' });
        expect(mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0]).toContain('_sOrder=popularity');

        await gamebanana.searchBySection({ search: 't', sort: 'likes' });
        expect(mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0]).toContain('_sOrder=popularity');

        await gamebanana.searchBySection({ search: 't', sort: 'name' });
        expect(mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0]).toContain('_sOrder=alphabetical');

        // Subfeed (no search) IGNORES downloads/likes/views
        await gamebanana.searchBySection({ sort: 'downloads' });
        expect(mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0]).not.toContain('_sSort=Generic_MostDownloaded');

        await gamebanana.searchBySection({ sort: 'likes' });
        expect(mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0]).not.toContain('_sSort=Generic_MostLiked');

        await gamebanana.searchBySection({ sort: 'views' });
        expect(mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0]).not.toContain('_sSort=Generic_MostViewed');

        // Subfeed supports date/name
        await gamebanana.searchBySection({ sort: 'name', order: 'asc' });
        expect(mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0]).toContain('_sSort=alphabetical');
        expect(mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0]).toContain('_sOrder=asc');
    });
});
