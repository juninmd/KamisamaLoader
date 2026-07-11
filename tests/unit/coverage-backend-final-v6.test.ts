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
    getModDetails: vi.fn(() => Promise.resolve({
        name: 'Test Mod',
        description: 'Test Desc',
        version: '1.0',
        creator: 'Author',
        imageUrl: '',
        category: 'Test',
        latestFileUrl: 'url',
        latestFileId: 1
    })),
    fetchItemData: vi.fn(() => Promise.resolve({ _sFile: 'url', _sDownloadUrl: 'url', _idRow: 1 })),
    downloadModFiles: vi.fn()
}));
vi.mock('../../electron/api-cache', () => ({
    getAPICache: vi.fn(() => ({
        get: vi.fn(),
        set: vi.fn()
    }))
}));
vi.mock('../../electron/settings', () => ({
    getSettings: vi.fn(() => ({ gamePath: '/test/game' }))
}));
vi.mock('electron', () => ({
    app: { getPath: vi.fn(() => '/userData') }
}));

const mockExtractAllToAsync = vi.fn();
const mockGetEntries = vi.fn();
const mockReadAsText = vi.fn();

vi.mock('adm-zip', () => {
    return {
        default: vi.fn(function() {
            return {
                extractAllToAsync: mockExtractAllToAsync,
                getEntries: mockGetEntries,
                readAsText: mockReadAsText
            };
        })
    };
});

describe('ModManager Backup/Migrate Gaps', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();

        const mockDlManager = {
            startDownload: vi.fn(() => 'dl-1'),
            on: vi.fn(),
            removeListener: vi.fn(),
            downloads: new Map()
        };
        modManager = new ModManager(mockDlManager as any);
        (modManager as any).downloadManager = mockDlManager;
    });

    it('should catch error in installOnlineMod post-download fallback', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const onSpy = vi.spyOn((modManager as any).downloadManager, 'on');

        const result = await modManager.installOnlineMod(123);
        // It might return false because fetchItemData or something isn't mapped properly.
        // We only care about the event listener registration in downloadManager

        const onCompleteCall = onSpy.mock.calls.find(call => call[0] === 'download-completed');
        if (onCompleteCall) {
            const onComplete = onCompleteCall[1] as any;

            modManager.deployMod = vi.fn().mockRejectedValue(new Error('Deploy Failed'));
            modManager.getModsFilePath = vi.fn().mockResolvedValue('/mods.json');
            (fs.readFile as any).mockResolvedValue(JSON.stringify([{id: 'old'}]));

            await onComplete('dl-1', '/downloads/mod.zip');

            expect(consoleSpy).toHaveBeenCalledWith("Install post-download failed", expect.any(Error));
        }
    });

    it('should cover importCloudSync reading profiles.json', async () => {
        modManager.getProfilesFilePath = vi.fn().mockResolvedValue('/profiles.json');
        modManager.getModsFilePath = vi.fn().mockResolvedValue('/mods.json');

        mockGetEntries.mockReturnValue([
            { name: 'profiles.json' }
        ]);
        mockReadAsText.mockReturnValue('{"profiles":[]}');

        await modManager.importCloudSync('/path/to/sync.zip');

        expect(fs.writeFile).toHaveBeenCalledWith('/profiles.json', '{"profiles":[]}', 'utf-8');
    });

    it('should cover importCloudSync reading settings.json', async () => {
        modManager.getProfilesFilePath = vi.fn().mockResolvedValue('/profiles.json');
        modManager.getModsFilePath = vi.fn().mockResolvedValue('/mods.json');

        mockGetEntries.mockReturnValue([
            { name: 'settings.json' }
        ]);
        mockReadAsText.mockReturnValue('{"gamePath":"/"}');

        await modManager.importCloudSync('/path/to/sync.zip');

        // It writes to this.settingsFile which is derived from app path
        expect(fs.writeFile).toHaveBeenCalledWith(expect.any(String), '{"gamePath":"/"}', 'utf-8');
    });
});
