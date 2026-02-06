import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchOnlineMods } from '../../electron/gamebanana';

// Mock api-cache to avoid caching logic interfering
vi.mock('../../electron/api-cache', () => ({
    getAPICache: () => ({
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined)
    })
}));

// Mock fetch
global.fetch = vi.fn();

describe('GameBanana Rate Limiting', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-01-01')); // Future date to reset window
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ _aRecords: [] })
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('should respect rate limit', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

        // Trigger 60 requests
        const promises = [];
        for (let i = 0; i < 65; i++) {
            promises.push(searchOnlineMods(1, 'test'));
        }

        // Fast forward time to allow "waiting"
        await vi.advanceTimersByTimeAsync(60000);

        await Promise.all(promises);

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Rate limit reached'));
    });
});
