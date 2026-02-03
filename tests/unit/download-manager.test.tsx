import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DownloadManager } from '../../electron/download-manager';
import fs from 'fs';
import { net, BrowserWindow, shell } from 'electron';
import EventEmitter from 'events';

// Mocks
vi.mock('fs', () => ({
    default: {
        createWriteStream: vi.fn(),
        unlink: vi.fn(),
    }
}));

vi.mock('electron', () => ({
    net: {
        request: vi.fn()
    },
    BrowserWindow: vi.fn(),
    shell: {
        showItemInFolder: vi.fn()
    },
    app: {
        getPath: vi.fn().mockReturnValue('/tmp'),
        isPackaged: false
    }
}));

// Mock Request/Response classes
class MockRequest extends EventEmitter {
    abort = vi.fn();
    end = vi.fn();
}

class MockResponse extends EventEmitter {
    statusCode: number;
    headers: any;
    constructor(statusCode = 200, headers = {}) {
        super();
        this.statusCode = statusCode;
        this.headers = headers;
    }
}

describe('DownloadManager', () => {
    let dm: DownloadManager;
    let mockWindow: any;

    beforeEach(() => {
        vi.clearAllMocks();
        dm = new DownloadManager();
        mockWindow = {
            webContents: {
                send: vi.fn()
            }
        };
        dm.setWindow(mockWindow);

        // Setup default FS stream mock
        const mockStream = {
            write: vi.fn(),
            close: vi.fn(),
            end: vi.fn(),
            on: vi.fn() // critical for 'error' handling on stream if implemented
        };
        (fs.createWriteStream as any).mockReturnValue(mockStream);
    });

    it('should start a download and handle progress', async () => {
        const mockReq = new MockRequest();
        (net.request as any).mockReturnValue(mockReq);

        const id = dm.startDownload('http://test.com/file.zip', '/downloads', 'file.zip');

        // Check Queued/Progressing
        expect(dm.getDownloads().find(d => d.id === id)).toBeDefined();

        // Simulate Response
        const mockRes = new MockResponse(200, { 'content-length': '100' });
        mockReq.emit('response', mockRes);

        // Simulate Data
        const chunk = Buffer.from('1234567890'); // 10 bytes
        mockRes.emit('data', chunk);

        const dl = dm.getDownloads().find(d => d.id === id);
        expect(dl?.receivedBytes).toBe(10);
        expect(dl?.totalBytes).toBe(100);

        // Simulate End
        mockRes.emit('end');
        expect(dl?.state).toBe('completed');
        expect(mockWindow.webContents.send).toHaveBeenCalledWith('downloads-update', expect.any(Array));
    });

    it('should handle redirects (302)', () => {
        const mockReq1 = new MockRequest();
        const mockReq2 = new MockRequest();

        (net.request as any)
            .mockReturnValueOnce(mockReq1)
            .mockReturnValueOnce(mockReq2);

        const id = dm.startDownload('http://test.com/redirect', '/downloads', 'file.zip');
        const dl = dm.getDownloads().find(d => d.id === id)!;

        // First Response: 302
        const mockRes1 = new MockResponse(302, { 'location': 'http://test.com/real.zip' });
        mockReq1.emit('response', mockRes1);

        expect(dl.url).toBe('http://test.com/real.zip');
        expect(net.request).toHaveBeenCalledTimes(2);

        // Second Response: 200
        const mockRes2 = new MockResponse(200, { 'content-length': '50' });
        mockReq2.emit('response', mockRes2);

        mockRes2.emit('end');
        expect(dl.state).toBe('completed');
    });

    it('should handle HTTP errors (404)', () => {
        const mockReq = new MockRequest();
        (net.request as any).mockReturnValue(mockReq);

        const id = dm.startDownload('http://test.com/404', '/downloads', 'file.zip');
        const mockRes = new MockResponse(404);

        // Listen for failure event
        const failSpy = vi.fn();
        dm.on('download-failed', failSpy);

        mockReq.emit('response', mockRes);

        const dl = dm.getDownloads().find(d => d.id === id)!;
        expect(dl.state).toBe('failed');
        expect(dl.error).toContain('404');
        expect(failSpy).toHaveBeenCalled();
    });

    it('should handle network errors', () => {
        const mockReq = new MockRequest();
        (net.request as any).mockReturnValue(mockReq);

        const id = dm.startDownload('http://test.com/err', '/downloads', 'file.zip');

        mockReq.emit('error', new Error('Network Error'));

        const dl = dm.getDownloads().find(d => d.id === id)!;
        expect(dl.state).toBe('failed');
        expect(dl.error).toBe('Network Error');
    });

    it('should pause and resume', () => {
        const mockReq1 = new MockRequest();
        const mockReq2 = new MockRequest();
        (net.request as any)
            .mockReturnValueOnce(mockReq1)
            .mockReturnValueOnce(mockReq2);

        const id = dm.startDownload('http://test.com/pause', '/downloads', 'file.zip');

        // Start
        const mockRes1 = new MockResponse(200, { 'content-length': '100' });
        mockReq1.emit('response', mockRes1);
        mockRes1.emit('data', Buffer.from('12345')); // 5 bytes

        // Pause
        dm.pauseDownload(id);
        const dl = dm.getDownloads().find(d => d.id === id)!;
        expect(dl.state).toBe('paused');
        expect(mockReq1.abort).toHaveBeenCalled();

        // Resume
        dm.resumeDownload(id);
        expect(net.request).toHaveBeenCalledTimes(2);

        // Check Range Header (Resuming)
        expect(net.request).toHaveBeenLastCalledWith(expect.objectContaining({
            headers: { 'Range': 'bytes=5-' }
        }));
    });

    it('should cancel download and delete file', () => {
        const mockReq = new MockRequest();
        (net.request as any).mockReturnValue(mockReq);

        const id = dm.startDownload('http://test.com/cancel', '/downloads', 'file.zip');
        const mockRes = new MockResponse(200);
        mockReq.emit('response', mockRes);

        dm.cancelDownload(id);

        const dl = dm.getDownloads().find(d => d.id === id)!;
        expect(dl.state).toBe('cancelled');
        expect(mockReq.abort).toHaveBeenCalled();
        expect(fs.unlink).toHaveBeenCalledWith(dl.savePath, expect.any(Function));
    });

    it('should clear completed downloads', () => {
        const mockReq = new MockRequest();
        (net.request as any).mockReturnValue(mockReq);

        const id = dm.startDownload('http://test.com/done', '/downloads', 'file.zip');
        const mockRes = new MockResponse(200);
        mockReq.emit('response', mockRes);
        mockRes.emit('end');

        expect(dm.getDownloads().length).toBe(1);
        dm.clearCompleted();
        expect(dm.getDownloads().length).toBe(0);
    });

    it('should open download folder', () => {
        const mockReq = new MockRequest();
        (net.request as any).mockReturnValue(mockReq);
        const id = dm.startDownload('http://test.com/file', '/tmp', 'file');

        dm.openDownloadFolder(id);
        expect(shell.showItemInFolder).toHaveBeenCalledWith(expect.stringContaining('file'));
    });
});
