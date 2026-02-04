import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APICache } from '../../electron/api-cache';
import fs from 'fs/promises';
import { app } from 'electron';

vi.mock('fs/promises', () => ({
    default: {
        readFile: vi.fn(),
        writeFile: vi.fn(),
        mkdir: vi.fn(),
        unlink: vi.fn()
    }
}));

vi.mock('electron', () => ({
    app: {
        getPath: vi.fn(() => '/userData')
    }
}));

describe('APICache Gaps', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (fs.readFile as any).mockResolvedValue('{}');
    });

    it('should evict oldest entry when maxMemorySize is exceeded', async () => {
        const cache = new APICache({ maxMemorySize: 2 });
        await cache.set('1', 'a');
        await cache.set('2', 'b');
        await cache.set('3', 'c'); // Should evict '1'

        expect(await cache.get('1')).toBeNull();
        expect(await cache.get('2')).toBe('b');
        expect(await cache.get('3')).toBe('c');
    });

    it('should handle persistent write failure gracefully', async () => {
        const cache = new APICache();
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        (fs.writeFile as any).mockRejectedValue(new Error('Write Fail'));

        await cache.set('1', 'a');

        // Wait a tick for async no-await setPersistent
        await new Promise(r => setTimeout(r, 0));

        expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle persistent directory creation failure', async () => {
        const cache = new APICache();
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        // Mock mkdir failure
        (fs.mkdir as any).mockRejectedValue(new Error('Mkdir Fail'));

        await cache.set('1', 'a');
        await new Promise(r => setTimeout(r, 0));

        expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle persistent read failure during load', async () => {
        (fs.readFile as any).mockRejectedValue(new Error('No File'));
        const cache = new APICache();
        // Just ensures constructor doesn't crash
        expect(cache).toBeDefined();
    });

    it('should invalidate persistent cache matching regex', async () => {
        const cache = new APICache();
        (fs.readFile as any).mockResolvedValue(JSON.stringify({
            'mod_1': { data: 'a', timestamp: Date.now(), ttl: 9999 },
            'mod_2': { data: 'b', timestamp: Date.now(), ttl: 9999 },
            'user_1': { data: 'c', timestamp: Date.now(), ttl: 9999 }
        }));

        await cache.invalidate('mod_*');

        // Verify writeFile called with updated content (mod_ entries removed)
        expect(fs.writeFile).toHaveBeenCalled();
        const callArgs = (fs.writeFile as any).mock.calls[0];
        const content = JSON.parse(callArgs[1]);
        expect(content.mod_1).toBeUndefined();
        expect(content.user_1).toBeDefined();
    });

    it('should handle invalidate persistent failure', async () => {
        const cache = new APICache();
        (fs.readFile as any).mockRejectedValue(new Error('Fail'));
        await cache.invalidate('*');
        // Should not throw
    });
});
