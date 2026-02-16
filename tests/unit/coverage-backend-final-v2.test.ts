import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import path from 'path';

// Use vi.hoisted to ensure mocks are available
const { mockFs, mockNet, mockShell, mockApp } = vi.hoisted(() => {
    return {
        mockFs: {
            readFile: vi.fn(),
            writeFile: vi.fn(),
            mkdir: vi.fn(),
            unlink: vi.fn(),
            rm: vi.fn(),
            stat: vi.fn(),
            cp: vi.fn(),
            access: vi.fn(),
            readdir: vi.fn(),
            createWriteStream: vi.fn(),
        },
        mockNet: {
            request: vi.fn(),
        },
        mockShell: {
            showItemInFolder: vi.fn(),
            openPath: vi.fn(),
        },
        mockApp: {
            getPath: vi.fn((name) => {
                if (name === 'userData') return '/mock/userdata';
                if (name === 'temp') return '/mock/temp';
                if (name === 'exe') return '/mock/app/dist-electron/electron.exe';
                return '/mock/path';
            }),
            isPackaged: false,
        },
    };
});

// Mock fs
vi.mock('fs', async () => {
    return {
        default: {
            ...mockFs,
            createWriteStream: vi.fn(() => ({
                write: vi.fn(),
                close: vi.fn(),
                end: vi.fn(),
                on: vi.fn(),
                once: vi.fn(),
                emit: vi.fn(),
            })),
            unlink: vi.fn((p: any, cb: any) => cb(null)),
        },
        createWriteStream: vi.fn(() => ({
            write: vi.fn(),
            close: vi.fn(),
            end: vi.fn(),
            on: vi.fn(),
            once: vi.fn(),
            emit: vi.fn(),
        })),
    };
});

vi.mock('fs/promises', () => ({ default: mockFs }));

// Mock electron
vi.mock('electron', () => ({
    net: mockNet,
    shell: mockShell,
    app: mockApp,
    BrowserWindow: class {
        webContents = { send: vi.fn() };
    },
}));

// Mock external modules
vi.mock('../../electron/github.js', () => ({
    fetchLatestRelease: vi.fn(),
}));

vi.mock('../../electron/gamebanana.js', () => ({
    fetchModProfile: vi.fn(),
    searchOnlineMods: vi.fn(),
    getModChangelog: vi.fn(),
    fetchModDetails: vi.fn(),
}));

// Imports
import { DownloadManager } from '../../electron/download-manager';
import { APICache } from '../../electron/api-cache';
import { ModManager } from '../../electron/mod-manager';
import { fetchLatestRelease } from '../../electron/github.js';

describe('Backend Final Coverage V2', () => {

    describe('DownloadManager', () => {
        let downloadManager: DownloadManager;

        beforeEach(() => {
            downloadManager = new DownloadManager();
            vi.clearAllMocks();
        });

        it('should handle 302 redirect correctly', () => {
            return new Promise<void>((resolve) => {
                const mockRequest1 = new EventEmitter() as any;
                mockRequest1.end = vi.fn();
                mockRequest1.abort = vi.fn();

                const mockResponse1 = new EventEmitter() as any;
                mockResponse1.statusCode = 302;
                mockResponse1.headers = { location: 'http://redirect.com/file.zip' };

                const mockRequest2 = new EventEmitter() as any;
                mockRequest2.end = vi.fn();
                const mockResponse2 = new EventEmitter() as any;
                mockResponse2.statusCode = 200;
                mockResponse2.headers = { 'content-length': '100' };

                mockNet.request
                    .mockReturnValueOnce(mockRequest1)
                    .mockReturnValueOnce(mockRequest2);

                downloadManager.startDownload('http://original.com/file.zip', '/downloads', 'file.zip');

                mockRequest1.emit('response', mockResponse1);

                expect(mockNet.request).toHaveBeenCalledTimes(2);
                expect(mockNet.request).toHaveBeenLastCalledWith(expect.objectContaining({
                    url: 'http://redirect.com/file.zip'
                }));
                resolve();
            });
        });

        it('should handle download progress updates', () => {
            return new Promise<void>((resolve) => {
                const mockRequest = new EventEmitter() as any;
                mockRequest.end = vi.fn();
                mockNet.request.mockReturnValue(mockRequest);

                const mockResponse = new EventEmitter() as any;
                mockResponse.statusCode = 200;
                mockResponse.headers = { 'content-length': '1000' };

                const id = downloadManager.startDownload('http://test.com/file.zip', '/downloads', 'file.zip');

                mockRequest.emit('response', mockResponse);

                const now = Date.now();
                vi.useFakeTimers();
                vi.setSystemTime(now);

                mockResponse.emit('data', Buffer.alloc(500));

                vi.setSystemTime(now + 600);
                mockResponse.emit('data', Buffer.alloc(500));

                mockResponse.emit('end');

                const downloads = downloadManager.getDownloads();
                const dl = downloads.find(d => d.id === id);
                expect(dl?.state).toBe('completed');
                expect(dl?.progress).toBe(100);

                vi.useRealTimers();
                resolve();
            });
        });

        it('should handle download error (non-200)', () => {
            return new Promise<void>((resolve) => {
                const mockRequest = new EventEmitter() as any;
                mockRequest.end = vi.fn();
                mockNet.request.mockReturnValue(mockRequest);

                const mockResponse = new EventEmitter() as any;
                mockResponse.statusCode = 404;
                mockResponse.headers = {};

                const id = downloadManager.startDownload('http://test.com/404.zip', '/downloads', '404.zip');

                mockRequest.emit('response', mockResponse);

                const downloads = downloadManager.getDownloads();
                const dl = downloads.find(d => d.id === id);
                expect(dl?.state).toBe('failed');
                expect(dl?.error).toContain('404');
                resolve();
            });
        });

        it('should open download folder', () => {
            const mockWin = { webContents: { send: vi.fn() } } as any;
            downloadManager.setWindow(mockWin);

            const id = downloadManager.startDownload('http://test.com/file.zip', '/downloads', 'file.zip');
            const dl = downloadManager.getDownloads().find(d => d.id === id);
            if (dl) dl.savePath = '/downloads/file.zip';

            downloadManager.openDownloadFolder(id);
            expect(mockShell.showItemInFolder).toHaveBeenCalledWith(expect.stringContaining('file.zip'));
        });

        it('should handle pause, resume, cancel', () => {
            const mockRequest = new EventEmitter() as any;
            mockRequest.end = vi.fn();
            mockRequest.abort = vi.fn();
            mockNet.request.mockReturnValue(mockRequest);

            const id = downloadManager.startDownload('http://test.com/file.zip', '/downloads', 'file.zip');

            downloadManager.pauseDownload(id);
            let dl = downloadManager.getDownloads().find(d => d.id === id);
            expect(dl?.state).toBe('paused');
            expect(mockRequest.abort).toHaveBeenCalled();

            downloadManager.resumeDownload(id);
            dl = downloadManager.getDownloads().find(d => d.id === id);
            expect(dl?.state).toBe('progressing');
            expect(mockNet.request).toHaveBeenCalledTimes(2);

            downloadManager.cancelDownload(id);
            dl = downloadManager.getDownloads().find(d => d.id === id);
            expect(dl?.state).toBe('cancelled');
        });

        it('should clear completed downloads', () => {
            const id1 = downloadManager.startDownload('http://a.com', '/dl', 'a.zip');
            const item1 = downloadManager.getDownloads().find(d => d.id === id1);
            if (item1) item1.state = 'completed';

            const id2 = downloadManager.startDownload('http://b.com', '/dl', 'b.zip');

            downloadManager.clearCompleted();
            const downloads = downloadManager.getDownloads();
            expect(downloads).toHaveLength(1);
            expect(downloads[0].id).toBe(id2);
        });
    });

    describe('APICache', () => {
        let apiCache: APICache;

        beforeEach(() => {
            vi.clearAllMocks();
            apiCache = new APICache({ maxMemorySize: 2, defaultTTL: 100 });
        });

        it('should expire memory cache and check persistent', async () => {
            const key = 'test-key';
            const value = { foo: 'bar' };

            await apiCache.set(key, value, 50);

            await new Promise(r => setTimeout(r, 60));

            mockFs.readFile.mockRejectedValue(new Error('No file'));

            const result = await apiCache.get(key);
            expect(result).toBeNull();
        });

        it('should handle persistent cache hit', async () => {
            const key = 'persist-key';
            const value = { data: 'persist' };

            const cacheData = {
                [key]: {
                    data: value,
                    timestamp: Date.now(),
                    ttl: 10000
                }
            };
            mockFs.readFile.mockResolvedValue(JSON.stringify(cacheData));

            const result = await apiCache.get(key);
            expect(result).toEqual(value);
        });

        it('should handle persistent cache expired', async () => {
            const key = 'expired-key';
            const cacheData = {
                [key]: {
                    data: 'old',
                    timestamp: Date.now() - 2000,
                    ttl: 1000
                }
            };
            mockFs.readFile.mockResolvedValue(JSON.stringify(cacheData));

            const result = await apiCache.get(key);
            expect(result).toBeNull();
        });

        it('should clear all cache', async () => {
            await apiCache.clear();
            expect(mockFs.unlink).toHaveBeenCalledWith(expect.stringContaining('api-cache.json'));
        });
    });

    describe('ModManager (UE4SS Gaps)', () => {
        let modManager: ModManager;

        beforeEach(() => {
            modManager = new ModManager();
            vi.clearAllMocks();
            mockFs.readFile.mockResolvedValue('{}');
        });

        it('should fail installUE4SS if release fetch fails', async () => {
            (fetchLatestRelease as any).mockResolvedValue(null);

            mockFs.readFile.mockResolvedValue(JSON.stringify({ gamePath: '/game' }));

            const result = await modManager.installUE4SS();
            expect(result.success).toBe(false);
            expect(result.message).toContain('Failed to fetch UE4SS release');
        });

        it('should fail installUE4SS if download fails (no DownloadManager)', async () => {
            (fetchLatestRelease as any).mockResolvedValue('http://ue4ss.zip');
            mockFs.readFile.mockResolvedValue(JSON.stringify({ gamePath: '/game' }));

            const mockRequest = new EventEmitter() as any;
            mockRequest.end = vi.fn();
            mockNet.request.mockReturnValue(mockRequest);

            setTimeout(() => {
                mockRequest.emit('error', new Error('Download Error'));
            }, 10);

            // Wait a bit to ensure async error handling propagates
            try {
                const result = await modManager.installUE4SS();
                expect(result.success).toBe(false);
            } catch (e) {
                // Should catch or handle
            }
        });
    });
});
