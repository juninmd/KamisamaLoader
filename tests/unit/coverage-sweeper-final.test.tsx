import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APICache } from '../../electron/api-cache';

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/mock/userData'),
  },
}));

describe('APICache remaining coverage', () => {
    let cache: APICache;

    beforeEach(() => {
        vi.restoreAllMocks();
        cache = new APICache({maxMemorySize: 10}, '/mock/cache');
        cache['persistentCacheLoaded'] = true; // prevent loading
    });

    it('should evict nothing if keys are somehow undefined', () => {
        // simulate memory cache having size > maxMemorySize but no firstKey
        cache.memoryCache.set('test', { data: 1, expires: Date.now() + 1000, ttl: 100 });
        cache['maxMemorySize'] = 0;

        vi.spyOn(cache.memoryCache, 'keys').mockReturnValue({
            next: () => ({ done: true, value: undefined }),
            [Symbol.iterator]() { return this; }
        });

        const deleteSpy = vi.spyOn(cache.memoryCache, 'delete');

        vi.spyOn(cache as any, 'setPersistent').mockResolvedValue(undefined); // prevent mock write
        cache.set('test2', { data: 2 }, 100);

        expect(deleteSpy).not.toHaveBeenCalled();
    });

    it('should catch error in setPersistent execution', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(cache as any, 'setPersistent').mockRejectedValue(new Error('failed'));

        cache.set('test', { data: 1 }, 100);

        // wait for promise to reject
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(consoleSpy).toHaveBeenCalled();
    });
});
