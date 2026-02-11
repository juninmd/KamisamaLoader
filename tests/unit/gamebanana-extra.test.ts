import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock electron before importing anything that uses it
vi.mock('electron', () => {
    return {
        default: {
            app: {
                getPath: vi.fn().mockReturnValue('/tmp'),
            },
            net: {
                request: vi.fn()
            }
        },
        app: {
            getPath: vi.fn().mockReturnValue('/tmp'),
        },
        net: {
            request: vi.fn()
        }
    };
});

import { fetchItemData, fetchAllMods, fetchFeaturedMods } from '../../electron/gamebanana.js';

describe('GameBanana Extra Coverage', () => {
    let originalFetch: any;

    beforeEach(() => {
        originalFetch = global.fetch;
        vi.clearAllMocks();
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    it('fetchItemData should return null on fetch error', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('Network'));
        const result = await fetchItemData('Mod', 1);
        expect(result).toBeNull();
    });

    it('fetchItemData should return null on non-ok response', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 404
        });
        const result = await fetchItemData('Mod', 1);
        expect(result).toBeNull();
    });

    it('fetchAllMods should handle fetch error gracefully', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('Network'));
        const result = await fetchAllMods(1, 1);
        expect(result).toEqual([]);
    });

    it('fetchAllMods should handle non-ok response', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false
        });
        const result = await fetchAllMods(1, 1);
        expect(result).toEqual([]);
    });

    it('fetchFeaturedMods should handle error gracefully', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('Network'));
        const result = await fetchFeaturedMods();
        expect(result).toEqual([]);
    });
});
