import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';

vi.mock('fs/promises', () => ({
    default: {
        readFile: vi.fn(),
        writeFile: vi.fn(),
        unlink: vi.fn(),
        readdir: vi.fn(),
        mkdir: vi.fn(),
        cp: vi.fn()
    }
}));
vi.mock('../../electron/gamebanana', () => ({
    getModDetails: vi.fn(),
    fetchItemData: vi.fn(),
    downloadModFiles: vi.fn()
}));
vi.mock('../../electron/settings', () => ({
    getSettings: vi.fn(() => ({ gamePath: '/test/game' }))
}));
vi.mock('electron', () => ({
    app: { getPath: vi.fn(() => '/userData') }
}));

vi.mock('adm-zip', () => {
    return {
        default: vi.fn(function() {
            return {
                addLocalFile: vi.fn(),
                writeZip: vi.fn(),
                getEntries: () => { throw new Error('Bad Zip'); },
                readAsText: vi.fn()
            };
        })
    };
});

describe('ModManager Backup/Migrate Gaps Part 3', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
    });

    it('should handle import error on invalid zip', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const res = await modManager.importCloudSync('/path.zip');
        expect(res.success).toBe(false);
        expect(res.message).toBeTruthy();
        expect(consoleSpy).toHaveBeenCalled();
    });
});
