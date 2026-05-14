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
    });

    it('should return >0 hit rate when not empty', () => {
        cache.memoryCache.set('test', { data: 1, expires: Date.now() + 1000, ttl: 10 });
        expect(cache['calculateHitRate']()).toBeGreaterThan(0);
    });
});
