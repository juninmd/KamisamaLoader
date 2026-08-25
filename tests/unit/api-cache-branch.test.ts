import { describe, it, expect, vi } from 'vitest';
import { APICache } from '../../electron/api-cache';

vi.mock('electron', () => ({
    app: {
        getPath: vi.fn(() => '/tmp/userData')
    }
}));

describe('APICache Branch', () => {
    it('should NOT evict oldest entry if firstKey is undefined', async () => {
        const cache = new APICache({ maxMemorySize: 0 }); // Size 0 triggers eviction on first set

        // Mock internal memory cache Map
        const mockMap = new Map();

        // Let's force size > maxMemorySize
        Object.defineProperty(mockMap, 'size', { value: 1, configurable: true });

        // Spy on delete so we can check if it's called
        const deleteSpy = vi.spyOn(mockMap, 'delete');

        // Provide an iterator that returns undefined
        vi.spyOn(mockMap, 'keys').mockReturnValue({
            next: () => ({ value: undefined, done: true })
        } as any);

        // Inject the mocked map
        (cache as any).memoryCache = mockMap;

        // Calling set triggers eviction
        await cache.set('new_key', 'val');

        // Ensure delete was NOT called because firstKey was undefined
        expect(deleteSpy).not.toHaveBeenCalled();
    });
});
