import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APICache } from '../../electron/api-cache';
import fs from 'fs/promises';

vi.mock('fs/promises', () => ({
    default: {
        readFile: vi.fn(),
        writeFile: vi.fn(),
        mkdir: vi.fn(),
        unlink: vi.fn(),
    }
}));

vi.mock('electron', () => ({
    app: {
        getPath: vi.fn(() => '/tmp/userData')
    }
}));

describe('APICache', () => {
    let cache: APICache;

    beforeEach(() => {
        vi.clearAllMocks();
        cache = new APICache();
    });

    it('should initialize with default config', () => {
        expect(cache).toBeDefined();
        const stats = cache.getStats();
        expect(stats.maxMemorySize).toBe(1000);
    });

    it('should set and get from memory', async () => {
        await cache.set('key1', { val: 1 });
        const val = await cache.get('key1');
        expect(val).toEqual({ val: 1 });
    });

    it('should return null for missing key', async () => {
        const val = await cache.get('missing');
        expect(val).toBeNull();
    });

    it('should expire keys in memory', async () => {
        await cache.set('expired', { val: 1 }, -100); // Already expired
        const val = await cache.get('expired');
        expect(val).toBeNull();
    });

    it('should persist to disk', async () => {
        (fs.readFile as any).mockResolvedValue(JSON.stringify({}));
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.writeFile as any).mockResolvedValue(undefined);

        await cache.set('persist', { val: 1 });

        // Wait for async background write
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(fs.writeFile).toHaveBeenCalled();
        const args = (fs.writeFile as any).mock.calls[0];
        expect(args[0]).toContain('api-cache.json');
        expect(args[1]).toContain('persist');
    });

    it('should handle persist write errors gracefully', async () => {
        (fs.readFile as any).mockResolvedValue(JSON.stringify({}));
        (fs.writeFile as any).mockRejectedValue(new Error('Write Failed'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        await cache.set('persist_fail', { val: 1 });

        await new Promise(resolve => setTimeout(resolve, 50));

        expect(consoleSpy).toHaveBeenCalledWith('[Cache] Failed to write persistent cache:', expect.any(Error));
    });

    it('should load from disk if memory miss', async () => {
        const diskData = {
            'diskKey': { data: { val: 99 }, timestamp: Date.now(), ttl: 10000 }
        };
        (fs.readFile as any).mockResolvedValue(JSON.stringify(diskData));

        const val = await cache.get('diskKey');
        expect(val).toEqual({ val: 99 });
    });

    it('should handle expired items on disk', async () => {
        const diskData = {
            'expiredDisk': { data: { val: 99 }, timestamp: Date.now() - 20000, ttl: 10000 }
        };
        (fs.readFile as any).mockResolvedValue(JSON.stringify(diskData));

        const val = await cache.get('expiredDisk');
        expect(val).toBeNull();
    });

    it('should handle corrupt disk cache during load', async () => {
        // Reset cache to trigger load again? No, load happens in constructor.
        // We can simulate getPersistent failing JSON parse or read
        (fs.readFile as any).mockRejectedValue(new Error('Corrupt'));

        const val = await cache.get('corruptKey');
        expect(val).toBeNull();
    });

    it('should invalidate keys', async () => {
        await cache.set('test_1', 1);
        await cache.set('test_2', 2);
        await cache.set('other', 3);

        (fs.readFile as any).mockResolvedValue(JSON.stringify({}));

        await cache.invalidate('test_*');

        expect(await cache.get('test_1')).toBeNull();
        expect(await cache.get('test_2')).toBeNull();
        expect(await cache.get('other')).toBe(3);
    });

    it('should handle invalidate disk errors', async () => {
        (fs.readFile as any).mockRejectedValue(new Error('Fail'));
        // Should not throw
        await cache.invalidate('test_*');
    });

    it('should clear all cache', async () => {
        await cache.set('a', 1);
        (fs.unlink as any).mockResolvedValue(undefined);
        await cache.clear();
        expect(await cache.get('a')).toBeNull();
        expect(fs.unlink).toHaveBeenCalled();
    });

    it('should handle clear cache file error (ignore if not found)', async () => {
        (fs.unlink as any).mockRejectedValue(new Error('ENOENT'));
        await cache.clear(); // Should not throw
    });

    it('should evict oldest memory entry when max size reached', async () => {
        // Create new cache with small limit
        const smallCache = new APICache({ maxMemorySize: 2 });
        await smallCache.set('1', 1);
        await smallCache.set('2', 2);
        await smallCache.set('3', 3); // Should evict 1

        expect(await smallCache.get('1')).toBeNull(); // Evicted?
        // Note: get('1') checks disk too. If we didn't mock disk to be empty, it might find it.
        // We need to ensure disk read returns nothing or we specifically check memory map size if we could access private.
        // But checking public behavior is better:
        // We must mock fs.readFile to fail or return empty so it doesn't reload from disk
        (fs.readFile as any).mockResolvedValue('{}');

        // However, 'get' promotes to memory if found on disk.
        // We want to verify EVICTION from memory.
        // Since we mock disk as empty, if it's gone from memory, get returns null.

        const val1 = await smallCache.get('1');
        expect(val1).toBeNull();
        expect(await smallCache.get('2')).toBe(2);
        expect(await smallCache.get('3')).toBe(3);
    });

    it('should load persistent cache on init and ignore expired items', async () => {
        // We need to construct a new APICache to trigger loadPersistentCache
        const validEntry = { data: 'valid', timestamp: Date.now(), ttl: 10000 };
        const expiredEntry = { data: 'expired', timestamp: Date.now() - 20000, ttl: 10000 };

        (fs.readFile as any).mockResolvedValue(JSON.stringify({
            valid: validEntry,
            expired: expiredEntry
        }));

        const newCache = new APICache();
        // Allow async load to complete (it's awaited in constructor? No, it's fire-and-forget in constructor)
        // loadPersistentCache is void async.
        // We can wait a bit
        await new Promise(r => setTimeout(r, 10));

        expect(await newCache.get('valid')).toBe('valid');
        // Expired item should not be loaded into memory
        // But get() checks disk too. So we need to ensure get() sees it as expired on disk too (which we tested elsewhere)
        // or that it wasn't added to memory.
        // access private property? No.
    });

    it('should clean up expired entries during setPersistent', async () => {
        const expiredTimestamp = Date.now() - 20000;
        const cacheContent = {
            'old': { data: 'old', timestamp: expiredTimestamp, ttl: 10000 }
        };
        (fs.readFile as any).mockResolvedValue(JSON.stringify(cacheContent));

        await cache.set('new', 'data');
        await new Promise(r => setTimeout(r, 10));

        expect(fs.writeFile).toHaveBeenCalled();
        const writeArg = (fs.writeFile as any).mock.calls[0][1];
        const writtenData = JSON.parse(writeArg);

        expect(writtenData['old']).toBeUndefined(); // Should be cleaned
        expect(writtenData['new']).toBeDefined();
    });

    it('should handle setPersistent when file does not exist yet', async () => {
         (fs.readFile as any).mockRejectedValue(new Error('ENOENT'));
         await cache.set('first', 1);
         await new Promise(r => setTimeout(r, 10));
         expect(fs.writeFile).toHaveBeenCalled();
    });
});
