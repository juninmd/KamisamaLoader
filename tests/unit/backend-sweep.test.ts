import './backend-sweep.fixture';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager.js';
import { DownloadManager } from '../../electron/download-manager.js';
import fs from 'fs/promises';
import { net } from 'electron';
import { EventEmitter } from 'events';
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
                if (event === 'end')
                    cb();
                if (event === 'data')
                    cb(Buffer.from('data'));
            })
        };
        (net.request as any)
            .mockImplementationOnce(() => {
            mockRequest.on.mockImplementation((event, cb) => {
                if (event === 'response')
                    cb(mockResponseRedirect);
            });
            return mockRequest;
        })
            .mockImplementationOnce(() => {
            mockRequest.on.mockImplementation((event, cb) => {
                if (event === 'response')
                    cb(mockResponseSuccess);
            });
            return mockRequest;
        });
        await (modManager as any).downloadFile('http://original.com', '/dest/file.zip');
        expect(net.request).toHaveBeenCalledTimes(2);
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
    it('downloadFile should resolve only after the file is flushed', async () => {
        let flush = () => undefined;
        const syncFs = await import('fs');
        (syncFs.createWriteStream as any).mockReturnValue({
            write: vi.fn(),
            close: vi.fn(),
            on: vi.fn(),
            end: vi.fn((callback?: () => void) => { flush = () => callback?.(); })
        });
        const response = {
            statusCode: 200,
            headers: {},
            on: vi.fn((event, callback) => { if (event === 'end')
                callback(); })
        };
        const request = {
            on: vi.fn((event, callback) => { if (event === 'response')
                callback(response); }),
            end: vi.fn()
        };
        (net.request as any).mockReturnValue(request);
        let settled = false;
        const download = (modManager as any).downloadFile('http://file', '/dest/file.zip')
            .then(() => { settled = true; });
        await Promise.resolve();
        expect(settled).toBe(false);
        flush();
        await download;
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
    it('downloadFile should handle network errors', async () => {
        const mockRequest = {
            on: vi.fn(),
            end: vi.fn()
        };
        (net.request as any).mockReturnValue(mockRequest);
        mockRequest.on.mockImplementation((event, cb) => {
            if (event === 'error')
                cb(new Error('Net Error'));
        });
        await expect((modManager as any).downloadFile('http://fail.com', '/dest/fail.zip'))
            .rejects.toThrow('Net Error');
    });
});
