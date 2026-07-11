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
        cp: vi.fn(),
        rm: vi.fn()
    }
}));
vi.mock('../../electron/gamebanana', () => ({
    fetchModProfile: vi.fn()
}));
vi.mock('../../electron/settings', () => ({
    getSettings: vi.fn(() => ({ gamePath: '/test/game' }))
}));
vi.mock('electron', () => ({
    app: { getPath: vi.fn(() => '/userData') }
}));

import * as gb from '../../electron/gamebanana';

describe('ModManager - iconUrl gap', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
    });

    it('should set iconUrl in installOnlineMod if missing', async () => {
        (gb.fetchModProfile as any).mockResolvedValue({
            _sVersion: '2.0',
            _sText: 'desc',
            _aFiles: [{ _sDownloadUrl: 'url', _idRow: 123 }],
            _aPreviewMedia: {
                _aImages: [
                    { _sBaseUrl: 'http://base', _sFile220: 'img.png' }
                ]
            }
        });

        // mock download manager so it doesn't break
        (modManager as any).downloadManager = {
            startDownload: vi.fn(() => 'dl-1'),
            on: vi.fn(),
            removeListener: vi.fn()
        };

        const res = await modManager.installOnlineMod({
            gameBananaId: 123,
            name: 'Test Mod',
            description: '', // Should be overridden by _sText
            version: '1.0', // Should be overridden
            creator: 'Me',
            category: 'UI',
            imageUrl: ''
        });

        expect(res.success).toBe(true);
        expect((modManager as any).downloadManager.startDownload).toHaveBeenCalled();

        // Let's also check missing file
        (gb.fetchModProfile as any).mockResolvedValue({
            _aFiles: []
        });
        const res2 = await modManager.installOnlineMod({
            gameBananaId: 123,
            name: 'Test Mod',
            creator: 'Me',
            category: 'UI',
            imageUrl: ''
        });
        expect(res2.success).toBe(false);
    });
});
