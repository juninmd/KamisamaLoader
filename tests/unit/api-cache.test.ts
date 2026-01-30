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

    it('should load from disk if memory miss', async () => {
        const diskData = {
            'diskKey': { data: { val: 99 }, timestamp: Date.now(), ttl: 10000 }
        };
        (fs.readFile as any).mockResolvedValue(JSON.stringify(diskData));

        const val = await cache.get('diskKey');
        expect(val).toEqual({ val: 99 });
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

    it('should clear all cache', async () => {
        await cache.set('a', 1);
        (fs.unlink as any).mockResolvedValue(undefined);
        await cache.clear();
        expect(await cache.get('a')).toBeNull();
        expect(fs.unlink).toHaveBeenCalled();
    });
});
