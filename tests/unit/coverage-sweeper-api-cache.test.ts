import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APICache } from '../../electron/api-cache';

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/mock/userData'),
  },
}));

describe('APICache', () => {
    let cache: APICache;

    beforeEach(() => {
        vi.restoreAllMocks();
        cache = new APICache({maxMemorySize: 10}, '/mock/cache');
    });

    it('should ignore entries without ttl', async () => {
        const fs = require('fs/promises');
        const mockData = JSON.stringify({
            'no_ttl_key': { data: 'test', expires: Date.now() + 10000 }
        });
        vi.spyOn(fs, 'readFile').mockResolvedValue(mockData);

        await cache['loadPersistentCache']();

        expect(cache.memoryCache.size).toBe(0);
    });
});
