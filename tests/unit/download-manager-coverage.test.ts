import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import EventEmitter from 'events';
import path from 'path';
import fs from 'fs';
import { net } from 'electron'; // Mocked

// Mock electron net
const mocks = vi.hoisted(() => ({
    request: {
        on: vi.fn(),
        end: vi.fn(),
        abort: vi.fn()
    },
    response: {
        statusCode: 200,
        headers: {},
        on: vi.fn()
    }
}));

vi.mock('electron', () => ({
    net: {
        request: vi.fn(() => mocks.request)
    },
    app: {
        getPath: vi.fn().mockReturnValue('/temp')
    },
    shell: {
        showItemInFolder: vi.fn()
    },
    BrowserWindow: class {}
}));

// Mock fs
vi.mock('fs', () => ({
    default: {
        createWriteStream: vi.fn().mockReturnValue({
            write: vi.fn(),
            end: vi.fn(),
            close: vi.fn(),
            on: vi.fn()
        }),
        unlink: vi.fn((p, cb) => cb(null))
    }
}));

import { DownloadManager } from '../../electron/download-manager';

describe('DownloadManager Coverage Gaps', () => {
    let downloadManager: DownloadManager;

    beforeEach(() => {
        vi.clearAllMocks();
        downloadManager = new DownloadManager();

        // Reset request mock
        mocks.request.on.mockImplementation((event, cb) => {
            if (event === 'response') {
                // Store callback to trigger manually if needed, or let test trigger it
            }
        });
        mocks.response.on.mockReset();
        mocks.response.statusCode = 200;
        mocks.response.headers = {};
    });

    it('should handle 302 redirect', () => {
        const url = 'http://example.com/file.zip';
        const redirectUrl = 'http://example.com/redirect/file.zip';

        // Setup request to mock redirect first, then success
        let callCount = 0;
        vi.mocked(net.request).mockImplementation((opts: any) => {
            callCount++;
            const req = { ...mocks.request, on: vi.fn(), end: vi.fn() };

            req.on.mockImplementation((event: string, cb: any) => {
                if (event === 'response') {
                    if (callCount === 1) {
                         // First call: Redirect
                         cb({
                             statusCode: 302,
                             headers: { location: [redirectUrl] },
                             on: vi.fn()
                         });
                    } else {
                         // Second call: Success
                         cb({
                             statusCode: 200,
                             headers: { 'content-length': ['100'] },
                             on: vi.fn()
                         });
                    }
                }
            });
            return req as any;
        });

        downloadManager.startDownload(url, '/downloads', 'file.zip');

        // Should have called net.request twice
        expect(callCount).toBe(2);
    });

    it('should resume download with Range header', () => {
        // Manually inject a paused download state
        const id = 'test-id';
        const item = {
            id,
            url: 'http://example.com/file.zip',
            filename: 'file.zip',
            savePath: '/downloads/file.zip',
            totalBytes: 100,
            receivedBytes: 50,
            state: 'paused',
            speed: 0,
            progress: 50,
            startTime: Date.now(),
            context: {}
        };
        (downloadManager as any).downloads.set(id, item);

        vi.mocked(net.request).mockReturnValue(mocks.request as any);

        downloadManager.resumeDownload(id);

        expect(net.request).toHaveBeenCalledWith(expect.objectContaining({
            headers: { 'Range': 'bytes=50-' }
        }));
    });

    it('should handle request error', () => {
        vi.mocked(net.request).mockReturnValue(mocks.request as any);

        mocks.request.on.mockImplementation((event, cb) => {
            if (event === 'error') {
                cb(new Error('Network Error'));
            }
        });

        const listener = vi.fn();
        downloadManager.on('download-failed', listener);

        downloadManager.startDownload('http://fail.com', '/dl', 'fail.zip');

        expect(listener).toHaveBeenCalledWith(expect.any(String), 'Network Error');
    });

    it('should handle response error', () => {
        vi.mocked(net.request).mockReturnValue(mocks.request as any);

        mocks.request.on.mockImplementation((event, cb) => {
            if (event === 'response') {
                const res = { ...mocks.response, statusCode: 500, headers: {} };
                cb(res);
            }
        });

        const listener = vi.fn();
        downloadManager.on('download-failed', listener);

        downloadManager.startDownload('http://fail.com', '/dl', 'fail.zip');

        expect(listener).toHaveBeenCalledWith(expect.any(String), 'HTTP Error: 500');
    });

    it('should handle data stream and completion', () => {
        vi.mocked(net.request).mockReturnValue(mocks.request as any);

        const mockStream = {
            write: vi.fn(),
            end: vi.fn(),
            close: vi.fn(),
            on: vi.fn()
        };
        // @ts-ignore
        fs.createWriteStream.mockReturnValue(mockStream);

        mocks.request.on.mockImplementation((event, cb) => {
            if (event === 'response') {
                const response = {
                    ...mocks.response,
                    headers: { 'content-length': ['100'] },
                    on: vi.fn()
                };

                // Simulate data flow
                response.on.mockImplementation((evt, handler) => {
                    if (evt === 'data') {
                        // Emit two chunks
                        handler(Buffer.from('chunk1'));
                        handler(Buffer.from('chunk2'));
                    }
                    if (evt === 'end') {
                        handler();
                    }
                });

                cb(response);
            }
        });

        const completedListener = vi.fn();
        downloadManager.on('download-completed', completedListener);

        downloadManager.startDownload('http://test.com', '/dl', 'file.zip');

        expect(mockStream.write).toHaveBeenCalledTimes(2);
        expect(mockStream.end).toHaveBeenCalled();
        expect(completedListener).toHaveBeenCalled();
    });
});
