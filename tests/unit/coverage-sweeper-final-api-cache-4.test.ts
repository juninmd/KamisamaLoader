import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APICache } from '../../electron/api-cache';
import fs from 'fs/promises';

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

    it('should ignore expired entries when loading persistent cache', async () => {
        const mockData = JSON.stringify({
            'expired_key': { data: 'test', expires: Date.now() - 10000, ttl: 100 }
        });
        vi.spyOn(fs, 'readFile').mockResolvedValue(mockData);

        await cache['loadPersistentCache']();

        expect(cache.memoryCache.size).toBe(0);
    });
});
