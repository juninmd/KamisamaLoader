import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APICache } from '../../electron/api-cache';

const disk = new Map<string, string>();
const tick = () => new Promise(r => setTimeout(r, 0));

vi.mock('fs/promises', () => ({
    default: {
        readFile: vi.fn(async (p: string) => {
            await tick();
            if (!disk.has(p)) throw new Error('ENOENT');
            return disk.get(p);
        }),
        writeFile: vi.fn(async (p: string, data: string) => { await tick(); disk.set(p, data); }),
        mkdir: vi.fn(async () => undefined),
        unlink: vi.fn(async () => undefined),
    }
}));

vi.mock('electron', () => ({ app: { getPath: vi.fn(() => '/tmp/userData') } }));

const stored = () => Object.keys(JSON.parse([...disk.values()][0] ?? '{}'));

describe('APICache persistent writes', () => {
    beforeEach(() => disk.clear());

    it('keeps every entry when sets run concurrently', async () => {
        const cache = new APICache();
        await Promise.all(Array.from({ length: 8 }, (_, i) => cache.set(`k${i}`, i)));
        await vi.waitFor(() => expect(stored()).toHaveLength(8));
        await new Promise(r => setTimeout(r, 20));
        expect(stored().sort()).toEqual(['k0', 'k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7']);
    });

    it('does not resurrect entries invalidated while writes are pending', async () => {
        const cache = new APICache();
        await cache.set('mods:1', 1);
        await cache.set('other', 2);
        await cache.invalidate('mods:*');
        await new Promise(r => setTimeout(r, 20));
        expect(stored()).toEqual(['other']);
    });
});
