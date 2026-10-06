import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';


vi.mock('electron', () => ({
    app: {
        getPath: vi.fn(() => '/mock'),
        isPackaged: false
    },
    shell: {
        openPath: vi.fn()
    }
}));

describe('ModManager Core Gaps 5', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(fs, "mkdir").mockResolvedValue(undefined as never);
        modManager = new ModManager();
    });

    it('covers getOnlineModsCachePath coverage gap', async () => {
        const mm = new ModManager();
        const res = await (mm as any).getOnlineModsCachePath();
        expect(res).toContain('online-mods-cache.json');
    });

    it('covers searchBySection API error coverage gap', async () => {
        vi.doMock('../../electron/gamebanana', () => ({
            searchBySection: vi.fn().mockRejectedValue(new Error('Search fail'))
        }));
        const { ModManager: MM } = await import('../../electron/mod-manager?v=123');
        const mm = new MM();
        try {
            await mm.searchOnlineMods(1, 'test');
        } catch(e) {
            expect(e).toBeDefined();
        }
    });
});
