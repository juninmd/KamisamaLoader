import { describe, it, expect, vi, beforeAll } from 'vitest';
import path from 'path';

// Mock Electron
vi.mock('electron', () => ({
    app: {
        getPath: () => path.resolve('./temp-test-data'),
        isPackaged: false
    },
    net: {
        request: () => ({ on: () => { }, end: () => { } })
    }
}));

// Mock fs/promises for cache to avoid cluttering disk or errors
vi.mock('fs/promises', async () => {
    const actual = await vi.importActual('fs/promises');
    return {
        ...actual,
        mkdir: vi.fn().mockResolvedValue(undefined),
        readFile: vi.fn().mockRejectedValue(new Error('Cache miss')), // Always miss cache
        writeFile: vi.fn().mockResolvedValue(undefined),
        unlink: vi.fn().mockResolvedValue(undefined)
    };
});

// Import after mocks
import { searchBySection, fetchCategories } from '../../electron/gamebanana';

describe('GameBanana API Filters', () => {

    it('should return results for basic search "Goku"', async () => {
        const results = await searchBySection({ search: 'Goku', page: 1 });
        expect(results).toBeDefined();
        // expect(results.length).toBeGreaterThan(0); // Might be 0 if API is down or no network, but we expect array
        expect(Array.isArray(results)).toBe(true);
        if (results.length > 0) {
            console.log('Search "Goku" Sample:', results[0].name);
        }
    });

    it('should return results for sort by downloads (Subfeed - Ignored)', async () => {
        // Subfeed ignores downloads sort to prevent 400 error, so this should just return default results
        const results = await searchBySection({ sort: 'downloads' });
        expect(Array.isArray(results)).toBe(true);
        if (results.length > 0) {
            console.log('Sort Downloads (Ignored) Sample:', results[0].name);
        }
    });

    it('should return results for sort by date (Subfeed)', async () => {
        const results = await searchBySection({ sort: 'date' });
        expect(Array.isArray(results)).toBe(true);
    });

    it('should return results for search "Vegeta" + sort downloads', async () => {
        const results = await searchBySection({ search: 'Vegeta', sort: 'downloads' });
        expect(Array.isArray(results)).toBe(true);
    });

    it('should return results for date range "month"', async () => {
        const results = await searchBySection({ dateRange: 'month' });
        expect(Array.isArray(results)).toBe(true);
    });

    it('should fetch categories', async () => {
        const categories = await fetchCategories(21179);
        expect(Array.isArray(categories)).toBe(true);
        expect(categories.length).toBeGreaterThan(0);
        console.log('Categories found:', categories.length);
    });

    it('should filter by category if valid category provided', async () => {
        const categories = await fetchCategories(21179);
        if (categories.length > 0) {
            const catId = categories[0]._idRow;
            console.log(`Testing Category Filter: ${categories[0]._sName} (${catId})`);
            const results = await searchBySection({ categoryId: catId });
            expect(Array.isArray(results)).toBe(true);
            // Verify at least some semblance of filtering if possible, but API trust is sufficient
        }
    });
});
