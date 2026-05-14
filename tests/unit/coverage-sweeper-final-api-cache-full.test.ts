import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APICache, getAPICache } from '../../electron/api-cache';
import fs from 'fs/promises';

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/mock/userData'),
  },
}));

describe('APICache complete coverage', () => {
    let cache: APICache;

    beforeEach(() => {
        vi.restoreAllMocks();
        cache = new APICache({maxMemorySize: 10}, '/mock/cache');
    });

    it('should ignore entries without ttl', async () => {
        const mockData = JSON.stringify({
            'no_ttl_key': { data: 'test', expires: Date.now() + 10000 }
        });
        vi.spyOn(fs, 'readFile').mockResolvedValue(mockData);

        await cache['loadPersistentCache']();

        expect(cache.memoryCache.size).toBe(0);
    });

    it('should ignore expired entries when loading persistent cache', async () => {
        const mockData = JSON.stringify({
            'expired_key': { data: 'test', expires: Date.now() - 10000, ttl: 100 }
        });
        vi.spyOn(fs, 'readFile').mockResolvedValue(mockData);

        await cache['loadPersistentCache']();

        expect(cache.memoryCache.size).toBe(0);
    });

    it('should create singleton on first call', () => {
        // @ts-expect-error test
        getAPICache().persistentCacheLoaded = false;
        const c1 = getAPICache();
        const c2 = getAPICache();
        expect(c1).toBe(c2);
    });

    it('should return >0 hit rate when not empty', () => {
        cache.memoryCache.set('test', { data: 1, expires: Date.now() + 1000, ttl: 10 });
        expect(cache['calculateHitRate']()).toBeGreaterThan(0);
    });

    it('should early return in loadPersistentCache if already loaded', async () => {
        cache['persistentCacheLoaded'] = true;
        const readFileSpy = vi.spyOn(fs, 'readFile');

        await cache['loadPersistentCache']();

        expect(readFileSpy).not.toHaveBeenCalled();
    });
});
