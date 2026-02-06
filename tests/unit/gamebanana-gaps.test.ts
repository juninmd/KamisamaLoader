import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as gamebanana from '../../electron/gamebanana.js';

// Mock getAPICache
vi.mock('../../electron/api-cache.js', () => ({
    getAPICache: () => ({
        get: vi.fn(),
        set: vi.fn()
    })
}));

// Mock fetch
const globalFetch = global.fetch;

describe('GameBanana API Gaps', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    afterEach(() => {
        global.fetch = globalFetch;
    });

    it('should return null if fetchModProfile API fails', async () => {
        vi.mocked(global.fetch).mockResolvedValue({
            ok: false,
            status: 500,
            statusText: 'Server Error'
        } as Response);

        const result = await gamebanana.fetchModProfile(1);
        expect(result).toBeNull();
    });

    it('should return null if fetchModUpdates API fails', async () => {
        vi.mocked(global.fetch).mockResolvedValue({
            ok: false,
            status: 500,
            statusText: 'Server Error'
        } as Response);

        const result = await gamebanana.fetchModUpdates(1);
        expect(result).toBeNull();
    });

    it('should return empty array if getModChangelog API fails', async () => {
        vi.mocked(global.fetch).mockResolvedValue({
            ok: false,
            status: 500,
            statusText: 'Server Error'
        } as Response);

        const result = await gamebanana.getModChangelog(1);
        expect(result).toEqual([]);
    });
});
