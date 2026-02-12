import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import EventEmitter from 'events';
import fs from 'fs';

// Mock Modules
vi.mock('fs', () => ({
    default: {
        createWriteStream: vi.fn(),
        unlink: vi.fn()
    }
}));

const mockElectron = vi.hoisted(() => ({
    net: { request: vi.fn() },
    BrowserWindow: vi.fn(),
    shell: { showItemInFolder: vi.fn() },
    app: { getPath: vi.fn().mockReturnValue('/tmp'), isPackaged: false }
}));

vi.mock('electron', () => ({
    default: mockElectron,
    ...mockElectron
}));

// Import subject under test AFTER mocking
import { DownloadManager } from '../../electron/download-manager';

describe('DownloadManager Final Coverage', () => {
    let dm: DownloadManager;
    let mockWindow: any;
    let mockReq: any;
    let mockRes: any;
    let mockStream: any;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();

        dm = new DownloadManager();
        mockWindow = { webContents: { send: vi.fn() } };
        dm.setWindow(mockWindow);

        mockReq = new EventEmitter();
        mockReq.end = vi.fn();
        mockReq.abort = vi.fn();
        mockElectron.net.request.mockReturnValue(mockReq);

        mockStream = {
            write: vi.fn(),
            close: vi.fn(),
            end: vi.fn(),
            on: vi.fn()
        };
        (fs.createWriteStream as any).mockReturnValue(mockStream);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should handle response data, throttle updates, and complete successfully', () => {
        const id = dm.startDownload('http://url', '/tmp', 'file.zip');

        mockRes = new EventEmitter();
        mockRes.statusCode = 200;
        mockRes.headers = { 'content-length': '1000' };

        // Emit Response
        mockReq.emit('response', mockRes);

        // Emit Data Chunk 1 (100 bytes)
        mockRes.emit('data', Buffer.alloc(100));

        // Check initial state
        let dl = dm.getDownloads().find(d => d.id === id);
        expect(dl?.receivedBytes).toBe(100);

        // Advance time to trigger throttle ( > 500ms)
        vi.advanceTimersByTime(600);

        // Emit Data Chunk 2 (100 bytes)
        mockRes.emit('data', Buffer.alloc(100));

        // Check update
        expect(mockWindow.webContents.send).toHaveBeenCalledWith('downloads-update', expect.any(Array));
        dl = dm.getDownloads().find(d => d.id === id);
        expect(dl?.receivedBytes).toBe(200);
        expect(dl?.progress).toBe(20); // 200 / 1000 * 100

        // Complete
        mockRes.emit('end');
        expect(dl?.state).toBe('completed');
        expect(mockStream.end).toHaveBeenCalled();
    });

    it('should handle response error event', () => {
        const id = dm.startDownload('http://url', '/tmp', 'file.zip');
        mockRes = new EventEmitter();
        mockRes.statusCode = 200;
        mockRes.headers = {};

        mockReq.emit('response', mockRes);

        // Emit error during stream
        mockRes.emit('error', new Error('Stream Error'));

        const dl = dm.getDownloads().find(d => d.id === id);
        expect(dl?.state).toBe('failed');
        expect(dl?.error).toBe('Stream Error');
        expect(mockStream.close).toHaveBeenCalled();
    });

    it('should ignore data events if not progressing (e.g. paused/cancelled externally)', () => {
        const id = dm.startDownload('http://url', '/tmp', 'file.zip');
        mockRes = new EventEmitter();
        mockRes.statusCode = 200;
        mockRes.headers = {};

        mockReq.emit('response', mockRes);

        // Manually change state to paused via method to simulate user action
        dm.pauseDownload(id);

        // Emit data
        mockRes.emit('data', Buffer.alloc(100));

        // Should close stream and return
        expect(mockStream.close).toHaveBeenCalled();
        const dl = dm.getDownloads().find(d => d.id === id);
        expect(dl?.receivedBytes).toBe(0); // Should not have incremented
    });

    it('should handle redirect (302)', () => {
        const id = dm.startDownload('http://url', '/tmp', 'file.zip');
        mockRes = new EventEmitter();
        mockRes.statusCode = 302;
        mockRes.headers = { 'location': 'http://new-url' };

        mockReq.emit('response', mockRes);

        // Should restart download with new URL
        expect(mockElectron.net.request).toHaveBeenCalledTimes(2);
        expect(mockElectron.net.request).toHaveBeenLastCalledWith(expect.objectContaining({ url: 'http://new-url' }));
    });

     it('should handle bad status code (404)', () => {
        const id = dm.startDownload('http://url', '/tmp', 'file.zip');
        mockRes = new EventEmitter();
        mockRes.statusCode = 404;

        mockReq.emit('response', mockRes);

        const dl = dm.getDownloads().find(d => d.id === id);
        expect(dl?.state).toBe('failed');
        expect(dl?.error).toContain('404');
    });
});
