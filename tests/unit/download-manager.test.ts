import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DownloadManager } from '../../electron/download-manager';
import { EventEmitter } from 'events';
import fs from 'fs';

// Mock electron
const mockElectron = vi.hoisted(() => ({
    net: { request: vi.fn() },
    BrowserWindow: vi.fn(),
    shell: { showItemInFolder: vi.fn() },
}));

vi.mock('electron', () => ({
    net: mockElectron.net,
    BrowserWindow: mockElectron.BrowserWindow,
    shell: mockElectron.shell,
    default: mockElectron
}));

// Mock fs
vi.mock('fs', () => ({
    default: {
        createWriteStream: vi.fn(),
        unlink: vi.fn()
    }
}));

describe('DownloadManager', () => {
    let manager: DownloadManager;
    let mockWindow: any;
    let mockRequest: any;
    let mockResponse: EventEmitter & { statusCode: number, headers: any };
    let mockStream: any;

    beforeEach(() => {
        vi.clearAllMocks();
        manager = new DownloadManager();

        mockWindow = {
            webContents: {
                send: vi.fn()
            }
        };
        manager.setWindow(mockWindow as unknown as BrowserWindow);

        // Setup Request Mock
        mockRequest = new EventEmitter();
        mockRequest.end = vi.fn();
        mockRequest.abort = vi.fn();
        (mockElectron.net.request as any).mockReturnValue(mockRequest);

        // Setup Response Mock
        mockResponse = new EventEmitter() as any;
        mockResponse.statusCode = 200;
        mockResponse.headers = { 'content-length': '1000' };

        // Setup Stream Mock
        mockStream = {
            write: vi.fn(),
            close: vi.fn(),
            end: vi.fn(),
            on: vi.fn() // Add on method just in case
        };
        (fs.createWriteStream as any).mockReturnValue(mockStream);

        vi.useFakeTimers();
        vi.setSystemTime(new Date(2020, 1, 1, 12, 0, 0));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should start a download', () => {
        const id = manager.startDownload('http://test.com', '/tmp', 'test.zip');
        expect(id).toBeDefined();
        expect(mockElectron.net.request).toHaveBeenCalledWith({ url: 'http://test.com', method: 'GET' });
        expect(mockRequest.end).toHaveBeenCalled();

        const downloads = manager.getDownloads();
        expect(downloads.length).toBe(1);
        expect(downloads[0].state).toBe('progressing');
    });

    it('should handle download progress', () => {
        const id = manager.startDownload('http://test.com', '/tmp', 'test.zip');

        // Emit response
        mockRequest.emit('response', mockResponse);

        // Emit data
        const chunk = Buffer.alloc(100);
        mockResponse.emit('data', chunk);

        // Advance timer and system time to trigger throttle
        vi.advanceTimersByTime(1000);
        vi.setSystemTime(new Date(2020, 1, 1, 12, 0, 1)); // Advance 1 second

        // Trigger another chunk to force update check loop
        mockResponse.emit('data', Buffer.alloc(0));

        const downloads = manager.getDownloads();
        expect(downloads[0].receivedBytes).toBe(100);
        expect(downloads[0].totalBytes).toBe(1000);
        expect(downloads[0].progress).toBe(10);
        expect(mockStream.write).toHaveBeenCalledWith(chunk);
    });

    it('should handle download completion', () => {
        const spy = vi.fn();
        manager.on('download-completed', spy);
        const id = manager.startDownload('http://test.com', '/tmp', 'test.zip');

        mockRequest.emit('response', mockResponse);
        mockResponse.emit('end');

        expect(spy).toHaveBeenCalledWith(id);
        const downloads = manager.getDownloads();
        expect(downloads[0].state).toBe('completed');
        expect(downloads[0].progress).toBe(100);
    });

    it('should handle download error', () => {
        const spy = vi.fn();
        manager.on('download-failed', spy);
        const id = manager.startDownload('http://test.com', '/tmp', 'test.zip');

        mockRequest.emit('error', new Error('Network Error'));

        expect(spy).toHaveBeenCalledWith(id, 'Network Error');
        const downloads = manager.getDownloads();
        expect(downloads[0].state).toBe('failed');
    });

    it('should ignore error if cancelled or paused', () => {
         const id = manager.startDownload('http://test.com', '/tmp', 'test.zip');
         manager.cancelDownload(id);

         const spy = vi.fn();
         manager.on('download-failed', spy);

         // Error occurs after cancel
         mockRequest.emit('error', new Error('Late Error'));

         // Should not emit failure
         expect(spy).not.toHaveBeenCalled();
    });

    it('should handle http error', () => {
        const id = manager.startDownload('http://test.com', '/tmp', 'test.zip');

        mockResponse.statusCode = 404;
        mockRequest.emit('response', mockResponse);

        const downloads = manager.getDownloads();
        expect(downloads[0].state).toBe('failed');
        expect(downloads[0].error).toContain('404');
    });

    it('should handle redirect', () => {
        const id = manager.startDownload('http://test.com', '/tmp', 'test.zip');

        // First request gets 302
        mockResponse.statusCode = 302;
        mockResponse.headers = { location: 'http://redirect.com' };

        mockRequest.emit('response', mockResponse);

        // Should trigger a second request
        expect(mockElectron.net.request).toHaveBeenCalledTimes(2);
        expect(mockElectron.net.request).toHaveBeenLastCalledWith(expect.objectContaining({ url: 'http://redirect.com' }));
    });

    it('should pause and resume download', () => {
        const id = manager.startDownload('http://test.com', '/tmp', 'test.zip');

        // Emit response and some data to increment bytes
        mockRequest.emit('response', mockResponse);
        mockResponse.emit('data', Buffer.alloc(100));

        manager.pauseDownload(id);
        let downloads = manager.getDownloads();
        expect(downloads[0].state).toBe('paused');
        expect(mockRequest.abort).toHaveBeenCalled();

        manager.resumeDownload(id);
        downloads = manager.getDownloads();
        expect(downloads[0].state).toBe('progressing');
        // Should resume with Range header
        expect(mockElectron.net.request).toHaveBeenLastCalledWith(expect.objectContaining({
            headers: { 'Range': 'bytes=100-' }
        }));
    });

    it('should cancel download', () => {
        const id = manager.startDownload('http://test.com', '/tmp', 'test.zip');

        manager.cancelDownload(id);
        const downloads = manager.getDownloads();
        expect(downloads[0].state).toBe('cancelled');
        expect(mockRequest.abort).toHaveBeenCalled();
        expect(fs.unlink).toHaveBeenCalled();
    });

    it('should clear completed downloads', () => {
        const id1 = manager.startDownload('http://test.com', '/tmp', '1.zip');
        mockRequest.emit('response', mockResponse);
        mockResponse.emit('end'); // Complete 1

        const id2 = manager.startDownload('http://test.com', '/tmp', '2.zip');
        manager.cancelDownload(id2); // Cancel 2

        const id3 = manager.startDownload('http://test.com', '/tmp', '3.zip');
        // 3 is progressing

        manager.clearCompleted();
        const downloads = manager.getDownloads();
        expect(downloads.length).toBe(1);
        expect(downloads[0].id).toBe(id3);
    });

    it('should open download folder', async () => {
        const id = manager.startDownload('http://test.com', '/tmp', 'test.zip');

        // Mock mainWindow check inside logic
        // It relies on manager.setWindow(mockWindow) called in beforeEach

        manager.openDownloadFolder(id);

        const { shell } = await import('electron');
        expect(shell.showItemInFolder).toHaveBeenCalledWith(expect.stringContaining('test.zip'));
    });

    it('should emit updates via IPC', () => {
         const id = manager.startDownload('http://test.com', '/tmp', 'test.zip');
         mockRequest.emit('response', mockResponse);
         mockResponse.emit('data', Buffer.alloc(10));

         // Should have called send multiple times
         expect(mockWindow.webContents.send).toHaveBeenCalledWith('downloads-update', expect.any(Array));
    });
});
