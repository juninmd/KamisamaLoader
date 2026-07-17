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
        rm: vi.fn(),
        rename: vi.fn()
    }
}));
vi.mock('../../electron/gamebanana', () => ({
    getModDetails: vi.fn(),
    fetchItemData: vi.fn(),
    downloadModFiles: vi.fn(),
    fetchModProfile: vi.fn()
}));
vi.mock('../../electron/settings', () => ({
    getSettings: vi.fn(() => ({ gamePath: '/test/game' }))
}));
vi.mock('electron', () => ({
    app: { getPath: vi.fn(() => '/userData') }
}));

import * as gb from '../../electron/gamebanana';

describe('ModManager - Final specific lines', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
    });

    it('should set iconUrl in installOnlineMod', async () => {
        // Line 1009 requires mod.iconUrl to be evaluated.
        // It happens when mod is an object passed to installOnlineMod. Wait, mod is passed as an object!
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
            removeListener: vi.fn(),
            failDownload: vi.fn()
        };

        const onlineModArg = {
            gameBananaId: 123,
            name: 'Test Mod',
            description: '',
            version: '1.0',
            creator: 'Me',
            category: 'UI'
            // NO iconUrl here
        };

        const res = await modManager.installOnlineMod(onlineModArg as any);
        expect(res.success).toBe(true);
        expect(onlineModArg.iconUrl).toBe('http://base/img.png');
    });

    it('should hit catch block inside installOnlineMod onComplete', async () => {
        // Line 1087-1088
        (gb.fetchModProfile as any).mockResolvedValue({
            _sVersion: '2.0',
            _sText: 'desc',
            _aFiles: [{ _sDownloadUrl: 'url', _idRow: 123 }]
        });

        const dlManagerMock = {
            startDownload: vi.fn(() => 'dl-1'),
            on: vi.fn(),
            removeListener: vi.fn(),
            failDownload: vi.fn()
        };
        (modManager as any).downloadManager = dlManagerMock;

        await modManager.installOnlineMod({
            gameBananaId: 123, name: 'T'
        } as any);

        const onCompleteCall = dlManagerMock.on.mock.calls.find(c => c[0] === 'download-completed');
        expect(onCompleteCall).toBeDefined();

        const onComplete = onCompleteCall![1] as Function;

        modManager.deployMod = vi.fn().mockRejectedValue(new Error('Deploy Fail'));
        modManager.getModsFilePath = vi.fn().mockResolvedValue('/mods.json');
        (fs.readFile as any).mockResolvedValue('[]');

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // Invoke it
        await onComplete('dl-1', '/path/to/mod.zip');

        expect(consoleSpy).toHaveBeenCalledWith('Install post-download failed', expect.any(Error));
        expect(dlManagerMock.removeListener).toHaveBeenCalledWith('download-completed', onComplete);
    });
});
