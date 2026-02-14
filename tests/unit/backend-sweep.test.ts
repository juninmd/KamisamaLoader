import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager.js';
import { DownloadManager } from '../../electron/download-manager.js';
import fs from 'fs/promises';
import { app, net } from 'electron';
import { EventEmitter } from 'events';
import * as gamebanana from '../../electron/gamebanana.js';
import * as github from '../../electron/github.js';

// Mocks
vi.mock('fs/promises');
vi.mock('fs', () => {
    return {
        createWriteStream: vi.fn().mockReturnValue({
            write: vi.fn(),
            end: vi.fn(),
            close: vi.fn(),
            on: vi.fn((event, cb) => {
            })
        }),
        promises: {
            mkdir: vi.fn(),
            readFile: vi.fn(),
            writeFile: vi.fn(),
            unlink: vi.fn(),
            stat: vi.fn(),
            readdir: vi.fn(),
            cp: vi.fn(),
            rm: vi.fn(),
            link: vi.fn(),
            copyFile: vi.fn()
        }
    };
});
vi.mock('adm-zip', () => {
    return {
        default: vi.fn().mockImplementation(() => ({
            extractAllToAsync: vi.fn((dest, overwrite, keepOriginal, cb) => cb(null)),
            getEntries: vi.fn().mockReturnValue([])
        }))
    };
});
vi.mock('electron', () => ({
    app: {
        getPath: vi.fn().mockReturnValue('/mock/app'),
        isPackaged: false
    },
    net: {
        request: vi.fn()
    },
    shell: {
        openPath: vi.fn()
    }
}));

describe('Backend Sweep - ModManager', () => {
    let modManager: ModManager;
    let mockDownloadManager: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockDownloadManager = new EventEmitter();
        mockDownloadManager.startDownload = vi.fn().mockReturnValue('dl-123');
        modManager = new ModManager(mockDownloadManager as unknown as DownloadManager);
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.readFile as any).mockResolvedValue(JSON.stringify([]));
        (fs.writeFile as any).mockResolvedValue(undefined);
        (fs.unlink as any).mockResolvedValue(undefined);
        (fs.cp as any).mockResolvedValue(undefined);
        (fs.rm as any).mockResolvedValue(undefined);
        (fs.readdir as any).mockResolvedValue([]);
        (fs.stat as any).mockResolvedValue({ isDirectory: () => true });
    });

    it('downloadFile should handle redirects and errors', async () => {
        const mockRequest = {
            on: vi.fn(),
            end: vi.fn()
        };
        const mockResponseRedirect = {
            statusCode: 302,
            headers: { location: 'http://redirect.com/file.zip' },
            on: vi.fn()
        };
        const mockResponseSuccess = {
            statusCode: 200,
            headers: {},
            on: vi.fn((event, cb) => {
                if (event === 'end') cb();
                if (event === 'data') cb(Buffer.from('data'));
            })
        };

        (net.request as any)
            .mockImplementationOnce(() => {
                mockRequest.on.mockImplementation((event, cb) => {
                    if (event === 'response') cb(mockResponseRedirect);
                });
                return mockRequest;
            })
            .mockImplementationOnce(() => {
                mockRequest.on.mockImplementation((event, cb) => {
                    if (event === 'response') cb(mockResponseSuccess);
                });
                return mockRequest;
            });

        await (modManager as any).downloadFile('http://original.com', '/dest/file.zip');
        expect(net.request).toHaveBeenCalledTimes(2);
    });

    it('downloadFile should handle network errors', async () => {
        const mockRequest = {
            on: vi.fn(),
            end: vi.fn()
        };
        (net.request as any).mockReturnValue(mockRequest);

        mockRequest.on.mockImplementation((event, cb) => {
            if (event === 'error') cb(new Error('Net Error'));
        });

        await expect((modManager as any).downloadFile('http://fail.com', '/dest/fail.zip'))
            .rejects.toThrow('Net Error');
    });

     it('downloadFile should handle non-200 status code', async () => {
        const mockRequest = {
            on: vi.fn(),
            end: vi.fn()
        };
        const mockResponse = {
            statusCode: 404,
            on: vi.fn()
        };

        (net.request as any).mockReturnValue(mockRequest);
        mockRequest.on.mockImplementation((event, cb) => {
             if (event === 'response') cb(mockResponse);
        });

        await expect((modManager as any).downloadFile('http://404.com', '/dest/404.zip'))
            .rejects.toThrow('Download failed with status code: 404');
    });

    it('downloadFile should handle response stream error', async () => {
        const mockRequest = {
            on: vi.fn(),
            end: vi.fn()
        };
        const mockResponse = {
            statusCode: 200,
            headers: {},
            on: vi.fn((event, cb) => {
                if (event === 'error') cb(new Error('Stream Error'));
            })
        };

        (net.request as any).mockReturnValue(mockRequest);
        mockRequest.on.mockImplementation((event, cb) => {
             if (event === 'response') cb(mockResponse);
        });

        await expect((modManager as any).downloadFile('http://stream-error.com', '/dest/file.zip'))
            .rejects.toThrow('Stream Error');

        expect(fs.unlink).toHaveBeenCalled();
    });

    it('installOnlineMod should handle successful download completion event', async () => {
        const mod = { gameBananaId: 123, name: 'TestMod' };

        vi.spyOn(gamebanana, 'fetchModProfile').mockResolvedValue({
            _aFiles: [{ _idRow: 1, _sDownloadUrl: 'http://dl.com' }],
            _sName: 'TestMod',
            _aSubmitter: { _sName: 'Author' }
        } as any);

        (modManager as any).deployMod = vi.fn().mockResolvedValue(true);
        (modManager as any).extractZip = vi.fn().mockResolvedValue(undefined);
        (modManager as any).calculateFolderSize = vi.fn().mockResolvedValue(100);

        const result = await modManager.installOnlineMod(mod as any);
        expect(result.success).toBe(true);
        expect(result.downloadId).toBe('dl-123');

        mockDownloadManager.emit('download-completed', 'dl-123');
        await new Promise(resolve => setTimeout(resolve, 10));

        expect((modManager as any).extractZip).toHaveBeenCalled();
        expect((modManager as any).deployMod).toHaveBeenCalled();
    });

    it('installOnlineMod should ignore irrelevant download completion events', async () => {
        const mod = { gameBananaId: 123, name: 'TestMod' };
        vi.spyOn(gamebanana, 'fetchModProfile').mockResolvedValue({
            _aFiles: [{ _idRow: 1, _sDownloadUrl: 'http://dl.com' }]
        } as any);

        (modManager as any).deployMod = vi.fn();

        await modManager.installOnlineMod(mod as any);

        mockDownloadManager.emit('download-completed', 'other-id');
        await new Promise(resolve => setTimeout(resolve, 10));

        expect((modManager as any).deployMod).not.toHaveBeenCalled();
    });

    it('installOnlineMod should handle extraction failure in callback', async () => {
         const mod = { gameBananaId: 123, name: 'TestMod' };

        vi.spyOn(gamebanana, 'fetchModProfile').mockResolvedValue({
            _aFiles: [{ _idRow: 1, _sDownloadUrl: 'http://dl.com' }]
        } as any);

        (modManager as any).extractZip = vi.fn().mockRejectedValue(new Error('Zip Fail'));

        await modManager.installOnlineMod(mod as any);

        mockDownloadManager.emit('download-completed', 'dl-123');
        await new Promise(resolve => setTimeout(resolve, 10));

        expect((modManager as any).extractZip).toHaveBeenCalled();
    });

    it('installUE4SS should handle download completion via DownloadManager', async () => {
        vi.spyOn(modManager, 'getSettings').mockResolvedValue({ gamePath: '/mock/game' });
        vi.spyOn(github, 'fetchLatestRelease').mockResolvedValue('http://ue4ss.com/dl.zip');
        (modManager as any).finalizeUE4SSInstall = vi.fn().mockResolvedValue({ success: true, message: 'OK' });

        const promise = modManager.installUE4SS();

        await new Promise(resolve => setTimeout(resolve, 200));

        mockDownloadManager.emit('download-completed', 'dl-123');

        const result = await promise;
        expect(result.success).toBe(true);
        expect((modManager as any).finalizeUE4SSInstall).toHaveBeenCalled();
    });

    it('installUE4SS should ignore irrelevant download events', async () => {
        vi.spyOn(modManager, 'getSettings').mockResolvedValue({ gamePath: '/mock/game' });
        vi.spyOn(github, 'fetchLatestRelease').mockResolvedValue('http://ue4ss.com/dl.zip');
        (modManager as any).finalizeUE4SSInstall = vi.fn();

        modManager.installUE4SS();

        await new Promise(resolve => setTimeout(resolve, 200));

        mockDownloadManager.emit('download-completed', 'wrong-id');

        await new Promise(resolve => setTimeout(resolve, 10));
        expect((modManager as any).finalizeUE4SSInstall).not.toHaveBeenCalled();
    });

    it('toggleMod should detect conflicts', async () => {
        const mockMods = [
            { id: '1', name: 'Mod A', category: 'Characters', isEnabled: false },
            { id: '2', name: 'Mod B', category: 'Characters', isEnabled: true }
        ];
        (fs.readFile as any).mockResolvedValue(JSON.stringify(mockMods));

        (modManager as any).deployMod = vi.fn().mockResolvedValue(true);
        (modManager as any).syncActiveProfile = vi.fn();

        const result = await modManager.toggleMod('1', true);

        expect(result.success).toBe(true);
        expect(result.conflict).toContain('conflicts with "Mod B"');
    });

    it('checkForUpdates should handle mixed results', async () => {
        const mockMods = [
            { id: '1', gameBananaId: 100, version: '1.0' },
            { id: '2', gameBananaId: 200, version: '1.0' }
        ];
        (fs.readFile as any).mockResolvedValue(JSON.stringify(mockMods));

        vi.spyOn(gamebanana, 'fetchModProfile')
            .mockResolvedValueOnce({ _sVersion: '2.0', _aFiles: [{ _idRow: 999, _sDownloadUrl: 'url' }] } as any) // Mod 1 Update
            .mockRejectedValueOnce(new Error('API Error')); // Mod 2 Error

        const updates = await modManager.checkForUpdates();

        expect(updates).toContain('1');
        expect(updates).not.toContain('2');
    });

    it('deployModFiles should ignore unsupported file extensions in root', async () => {
        // Mock readdir to return files, some ignored
        (fs.readdir as any).mockResolvedValue(['mod.pak', 'readme.txt', 'ignored.png']);
        (fs.stat as any).mockResolvedValue({ isDirectory: () => false });

        // Mock deployFile
        (modManager as any).deployFile = vi.fn().mockResolvedValue(true);

        vi.spyOn(modManager, 'getSettings').mockResolvedValue({ gamePath: '/mock/game' });

        const mod = { id: '1', name: 'M', folderPath: '/mods/M', isEnabled: true };

        // We call deployModFiles directly (private)
        const result = await (modManager as any).deployModFiles(
            mod,
            '/game/paks',
            '/game/logic',
            '/game/bin',
            '/game/content'
        );

        const normalize = (value: string) => value.replace(/\\/g, '/');
        const deployedSources = ((modManager as any).deployFile as ReturnType<typeof vi.fn>)
            .mock.calls
            .map((call: [string, string]) => normalize(call[0]));

        // .pak should be deployed
        expect(deployedSources).toContain('/mods/M/mod.pak');

        // .txt and .png should NOT be deployed
        expect(deployedSources).not.toContain('/mods/M/readme.txt');
        expect(deployedSources).not.toContain('/mods/M/ignored.png');
    });
});
