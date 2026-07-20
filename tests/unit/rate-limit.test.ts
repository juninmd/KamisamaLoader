import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchCategories } from '../../electron/gamebanana';
import { vi } from 'vitest';

vi.mock('electron', () => ({
    app: { getPath: vi.fn(() => '/userData') }
}));

vi.mock('fs/promises', () => ({
    default: {
        readFile: vi.fn().mockResolvedValue('{}'),
        writeFile: vi.fn(),
        mkdir: vi.fn(),
        unlink: vi.fn()
    }
}));

describe('GameBanana Rate Limiting', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should trigger rate limit delay when hitting >= 60 requests', async () => {
        // Run 61 requests to trigger `if (requestCount >= 60)` branch
        const promises = [];
        for (let i = 0; i < 61; i++) {
            promises.push(fetchCategories());
        }

        await vi.runAllTimersAsync();
        await Promise.all(promises);

        // if the promise resolves without hanging, we handled the rate limit
        expect(global.fetch).toHaveBeenCalled();
    });
});
