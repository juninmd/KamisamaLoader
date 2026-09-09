import './backend-sweep.fixture';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager.js';
import { DownloadManager } from '../../electron/download-manager.js';
import fs from 'fs/promises';
import { net } from 'electron';
import { EventEmitter } from 'events';
import * as gamebanana from '../../electron/gamebanana.js';
describe('Backend Sweep - ModManager', () => {
    let modManager: ModManager;
    let mockDownloadManager: any;
    beforeEach(() => {
        vi.clearAllMocks();
        mockDownloadManager = new EventEmitter();
        mockDownloadManager.startDownload = vi.fn().mockReturnValue('dl-123');
        mockDownloadManager.failDownload = vi.fn();
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
            if (event === 'response')
                cb(mockResponse);
        });
        await expect((modManager as any).downloadFile('http://404.com', '/dest/404.zip'))
            .rejects.toThrow('Download failed with status code: 404');
    });
});
describe('Backend Sweep - ModManager', () => {
    let modManager: ModManager;
    let mockDownloadManager: any;
    beforeEach(() => {
        vi.clearAllMocks();
        mockDownloadManager = new EventEmitter();
        mockDownloadManager.startDownload = vi.fn().mockReturnValue('dl-123');
        mockDownloadManager.failDownload = vi.fn();
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
    it('downloadFile should handle response stream error', async () => {
        const mockRequest = {
            on: vi.fn(),
            end: vi.fn()
        };
        const mockResponse = {
            statusCode: 200,
            headers: {},
            on: vi.fn((event, cb) => {
                if (event === 'error')
                    cb(new Error('Stream Error'));
            })
        };
        (net.request as any).mockReturnValue(mockRequest);
        mockRequest.on.mockImplementation((event, cb) => {
            if (event === 'response')
                cb(mockResponse);
        });
        await expect((modManager as any).downloadFile('http://stream-error.com', '/dest/file.zip'))
            .rejects.toThrow('Stream Error');
        expect(fs.unlink).toHaveBeenCalled();
    });
});
describe('Backend Sweep - ModManager', () => {
    let modManager: ModManager;
    let mockDownloadManager: any;
    beforeEach(() => {
        vi.clearAllMocks();
        mockDownloadManager = new EventEmitter();
        mockDownloadManager.startDownload = vi.fn().mockReturnValue('dl-123');
        mockDownloadManager.failDownload = vi.fn();
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
    it('installOnlineMod should handle successful download completion event', async () => {
        const mod = { gameBananaId: 123, name: 'TestMod' };
        vi.spyOn(gamebanana, 'fetchModProfile').mockResolvedValue({
            _aFiles: [{ _idRow: 1, _sDownloadUrl: 'http://dl.com' }],
            _sName: 'TestMod',
            _aSubmitter: { _sName: 'Author' }
        } as any);
        vi.spyOn(modManager, 'installPackage').mockResolvedValue(undefined);
        mockDownloadManager.completeInstallation = vi.fn();
        (modManager as any).extractZip = vi.fn().mockResolvedValue(undefined);
        (modManager as any).calculateFolderSize = vi.fn().mockResolvedValue(100);
        const result = await modManager.installOnlineMod(mod as any);
        expect(result.success).toBe(true);
        expect(result.downloadId).toBe('dl-123');
        mockDownloadManager.emit('download-completed', 'dl-123');
        await new Promise(resolve => setTimeout(resolve, 10));
        expect((modManager as any).extractZip).toHaveBeenCalled();
        expect(modManager.installPackage).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ name: 'TestMod', installedFileId: 1 }), expect.any(String));
        expect(mockDownloadManager.completeInstallation).toHaveBeenCalledWith('dl-123');
    });
});
