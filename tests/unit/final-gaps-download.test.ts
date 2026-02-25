import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DownloadManager } from '../../electron/download-manager';
import { net } from 'electron';
import fs from 'fs';
import EventEmitter from 'events';

// Mock fs
vi.mock('fs', () => ({
    default: {
        createWriteStream: vi.fn(),
        unlink: vi.fn(),
    }
}));

// Mock electron
vi.mock('electron', () => ({
    net: {
        request: vi.fn(),
    },
    BrowserWindow: vi.fn(),
    app: {
        getPath: vi.fn().mockReturnValue('/temp'),
    },
    shell: {
        showItemInFolder: vi.fn()
    }
}));

describe('DownloadManager Gaps', () => {
    let downloadManager: DownloadManager;
    let mockRequest: any;
    let mockResponse: any;
    let mockWriteStream: any;

    beforeEach(() => {
        vi.clearAllMocks();
        downloadManager = new DownloadManager();

        // Setup mock Request
        mockRequest = new EventEmitter();
        mockRequest.end = vi.fn();
        mockRequest.abort = vi.fn();
        (net.request as any).mockReturnValue(mockRequest);

        // Setup mock Response
        mockResponse = new EventEmitter();
        mockResponse.statusCode = 200;
        mockResponse.headers = { 'content-length': '100' };

        // Setup mock WriteStream
        mockWriteStream = {
            write: vi.fn(),
            end: vi.fn(),
            close: vi.fn(),
            on: vi.fn(),
        };
        // fs is imported as default, which corresponds to the 'default' property in the mock factory
        (fs.createWriteStream as any).mockReturnValue(mockWriteStream);
    });

    it('should handle successful download flow', () => {
        const id = downloadManager.startDownload('http://test.com/file.zip', '/downloads', 'file.zip');

        // Trigger request response
        mockRequest.emit('response', mockResponse);

        // Emit data chunks
        mockResponse.emit('data', Buffer.from('chunk1'));
        mockResponse.emit('data', Buffer.from('chunk2'));

        expect(mockWriteStream.write).toHaveBeenCalledTimes(2);

        // Emit end
        mockResponse.emit('end');
        expect(mockWriteStream.end).toHaveBeenCalled();

        const downloads = downloadManager.getDownloads();
        expect(downloads[0].state).toBe('completed');
    });

    it('should handle download error event on response', () => {
        const id = downloadManager.startDownload('http://test.com/file.zip', '/downloads', 'file.zip');
        mockRequest.emit('response', mockResponse);

        mockResponse.emit('error', new Error('Stream failed'));

        expect(mockWriteStream.close).toHaveBeenCalled();
        const downloads = downloadManager.getDownloads();
        expect(downloads[0].state).toBe('failed');
        expect(downloads[0].error).toBe('Stream failed');
    });

    it('should handle request error event', () => {
        const id = downloadManager.startDownload('http://test.com/file.zip', '/downloads', 'file.zip');
        mockRequest.emit('error', new Error('Network failed'));

        const downloads = downloadManager.getDownloads();
        expect(downloads[0].state).toBe('failed');
        expect(downloads[0].error).toBe('Network failed');
    });

    it('should handle redirect', () => {
        const id = downloadManager.startDownload('http://test.com/file.zip', '/downloads', 'file.zip');

        const redirectResponse = new EventEmitter();
        (redirectResponse as any).statusCode = 302;
        (redirectResponse as any).headers = { location: 'http://new.com/file.zip' };

        mockRequest.emit('response', redirectResponse);

        // Should trigger a new request
        expect(net.request).toHaveBeenCalledTimes(2);
        expect(net.request).toHaveBeenLastCalledWith(expect.objectContaining({
            url: 'http://new.com/file.zip'
        }));
    });

    it('should handle HTTP error status', () => {
        const id = downloadManager.startDownload('http://test.com/file.zip', '/downloads', 'file.zip');

        const errorResponse = new EventEmitter();
        (errorResponse as any).statusCode = 404;

        mockRequest.emit('response', errorResponse);

        const downloads = downloadManager.getDownloads();
        expect(downloads[0].state).toBe('failed');
        expect(downloads[0].error).toContain('404');
    });

    it('should pause and resume download', () => {
        const id = downloadManager.startDownload('http://test.com/file.zip', '/downloads', 'file.zip');
        mockRequest.emit('response', mockResponse);
        mockResponse.emit('data', Buffer.from('part1')); // receivedBytes > 0

        downloadManager.pauseDownload(id);
        expect(mockRequest.abort).toHaveBeenCalled();
        expect(downloadManager.getDownloads()[0].state).toBe('paused');

        downloadManager.resumeDownload(id);
        // Expect new request with Range header
        expect(net.request).toHaveBeenCalledTimes(2);
        const lastCallArgs = (net.request as any).mock.calls[1][0];
        expect(lastCallArgs.headers['Range']).toBe('bytes=5-'); // 'part1'.length = 5
    });

    it('should cancel download', () => {
        const id = downloadManager.startDownload('http://test.com/file.zip', '/downloads', 'file.zip');
        downloadManager.cancelDownload(id);

        expect(mockRequest.abort).toHaveBeenCalled();
        expect(downloadManager.getDownloads()[0].state).toBe('cancelled');
        expect(fs.unlink).toHaveBeenCalled();
    });

    it('should clear completed downloads', () => {
         // Fix the implementation of this test to be robust
         vi.clearAllMocks();
         const req1 = new EventEmitter();
         (req1 as any).end = vi.fn();
         (req1 as any).abort = vi.fn();

         const req2 = new EventEmitter();
         (req2 as any).end = vi.fn();
         (req2 as any).abort = vi.fn();

         (net.request as any)
            .mockReturnValueOnce(req1)
            .mockReturnValueOnce(req2);

         const id1 = downloadManager.startDownload('http://test.com/1', '/d', '1');

         req1.emit('response', mockResponse);
         mockResponse.emit('end');

         expect(downloadManager.getDownloads().find(d => d.id === id1)!.state).toBe('completed');

         const id2 = downloadManager.startDownload('http://test.com/2', '/d', '2');

         downloadManager.clearCompleted();

         const downloads = downloadManager.getDownloads();
         expect(downloads.length).toBe(1);
         expect(downloads[0].id).toBe(id2);
    });
});
