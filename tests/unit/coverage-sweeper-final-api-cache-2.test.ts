import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APICache, getAPICache } from '../../electron/api-cache';

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/mock/userData'),
  },
}));

describe('APICache singleton coverage', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        // reset singleton
        // @ts-expect-error test
        getAPICache().persistentCacheLoaded = false;
    });

    it('should create singleton on first call', () => {
        const c1 = getAPICache();
        const c2 = getAPICache();
        expect(c1).toBe(c2);
    });
});
