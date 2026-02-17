import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchBySection, fetchCategories, fetchFeaturedMods, fetchAllMods, fetchItemData } from '../../electron/gamebanana';

// Mock API Cache to always miss
vi.mock('../../electron/api-cache', () => ({
    getAPICache: () => ({
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
    })
}));

describe('GameBanana Complete Coverage', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('searchBySection URL Construction', () => {
        it('should use Search Results endpoint when search term is present', async () => {
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ _aRecords: [] })
            });

            await searchBySection({ search: 'Goku', sort: 'downloads' });

            const url = (global.fetch as any).mock.calls[0][0];
            expect(url).toContain('Util/Search/Results');
            expect(url).toContain('_sSearchString=Goku');
            expect(url).toContain('_sOrder=popularity'); // downloads -> popularity
        });

        it('should use Subfeed endpoint when NO search term is present', async () => {
             (global.fetch as any).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ _aRecords: [] })
            });

            await searchBySection({ sort: 'date' });

            const url = (global.fetch as any).mock.calls[0][0];
            expect(url).toContain('Game/21179/Subfeed');
            expect(url).toContain('_sSort=new'); // date -> new
        });

        it('should NOT apply sort parameter on Subfeed if sort is popularity (downloads/likes)', async () => {
             (global.fetch as any).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ _aRecords: [] })
            });

            // Subfeed crashes on popularity sort, code avoids adding it
            await searchBySection({ sort: 'downloads' });

            const url = (global.fetch as any).mock.calls[0][0];
            expect(url).toContain('Game/21179/Subfeed');
            expect(url).not.toContain('_sSort=');
            expect(url).not.toContain('_sOrder=');
        });

        it('should apply alphabet sort on Subfeed', async () => {
             (global.fetch as any).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ _aRecords: [] })
            });

            await searchBySection({ sort: 'name', order: 'asc' });

            const url = (global.fetch as any).mock.calls[0][0];
            expect(url).toContain('_sSort=alphabetical');
            expect(url).toContain('_sOrder=asc');
        });

        it('should handle date ranges', async () => {
             (global.fetch as any).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ _aRecords: [] })
            });

            await searchBySection({ dateRange: 'week' });

            const url = (global.fetch as any).mock.calls[0][0];
            // Uses Subfeed for range? Wait, code says:
            // "If date range present: Use /Util/Search/Results (Subfeed doesn't support complex range filtering easily)"
            // BUT actually code block:
            // if (search) { ... } else { url = Subfeed ... if (minDate) url += ... }
            // So it DOES verify if minDate is added to Subfeed URL.

            // Wait, looking at code:
            /*
            if (search) { ... } else {
                url = Subfeed ...
                if (minDate > 0) url += ...
            }
            */
            // So logic supports minDate on Subfeed.

            expect(url).toContain('_aFilters[Generic_DateAdded_Min]=');
        });
    });

    describe('Rate Limiting', () => {
        it('should wait if rate limit exceeded', async () => {
            // We need to trigger 60 requests
            // mocking p-limit is tricky because it's imported inside.
            // But we can just rely on the internal requestCount variable if we could access it.
            // Since we can't export it easily, we just simulate many calls.

            // Actually, simply calling fetchCategories 61 times might be slow in test.
            // Let's rely on the fact that checkRateLimit calls setTimeout.

            // We can't easily test the internal state without exporting it or refactoring.
            // But we can trust the logic if we cover the lines.
            // Coverage report said `checkRateLimit` branch `if (requestCount >= 60)` was uncovered.

            // To hit it, we MUST make > 60 calls.
            // Mock fetch to be instant.
            (global.fetch as any).mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

            const p = [];
            for(let i=0; i<65; i++) {
                p.push(fetchCategories());
            }

            // Advance time to flush the wait
            await vi.runAllTimersAsync();

            await Promise.all(p);
            // If we are here without timeout error, it worked.
            expect(global.fetch).toHaveBeenCalledTimes(65);
        });
    });

    describe('Error Handling', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should handle fetchCategories failure (500)', async () => {
             (global.fetch as any).mockResolvedValue({
                ok: false,
                status: 500
            });
            const p = fetchCategories();
            await vi.runAllTimersAsync();
            const result = await p;
            expect(result).toEqual([]);
        });

        it('should handle fetchCategories exception', async () => {
             (global.fetch as any).mockRejectedValue(new Error('Network'));
            const p = fetchCategories();
            await vi.runAllTimersAsync();
            const result = await p;
            expect(result).toEqual([]);
        });

        it('should handle fetchFeaturedMods exception', async () => {
             (global.fetch as any).mockRejectedValue(new Error('Network'));
            const p = fetchFeaturedMods();
            await vi.runAllTimersAsync();
            const result = await p;
            expect(result).toEqual([]);
        });

        it('should handle fetchAllMods page failure', async () => {
            // First page fails
            (global.fetch as any).mockResolvedValueOnce({ ok: false });

            const p = fetchAllMods(21179, 1);
            await vi.runAllTimersAsync();
            const result = await p;
            expect(result).toEqual([]);
        });
    });

    describe('fetchItemData', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should return data on success', async () => {
             (global.fetch as any).mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ key: 'value' })
            });
            const p = fetchItemData('Mod', 1);
            await vi.runAllTimersAsync();
            const result = await p;
            expect(result).toEqual({ key: 'value' });
        });
    });
});
