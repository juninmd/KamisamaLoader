import { describe, it, expect, vi } from 'vitest';
import { startDownloadTransfer } from '../../electron/download-transfer';
import { net } from 'electron';
import fs from 'fs';

vi.mock('electron', () => ({
    net: { request: vi.fn() }
}));

describe('DownloadTransfer Gaps', () => {
    it('covers array headers and error early returns', () => {
        const item = { url: 'http://test', savePath: 'test.zip', receivedBytes: 0, state: 'progressing' } as any;
        const callbacks = {
            onRequest: vi.fn(), onRedirect: vi.fn(), onProgress: vi.fn(), onFailure: vi.fn(), onComplete: vi.fn()
        };

        const mockResponse = {
            statusCode: 302,
            headers: { location: ['http://redirected'] },
            on: vi.fn()
        };

        const mockRequest = {
            on: vi.fn((event, cb) => {
                if (event === 'response') cb(mockResponse);
                if (event === 'error') cb(new Error('req err'));
            }),
            setHeader: vi.fn(),
            end: vi.fn()
        };

        vi.spyOn(net, 'request').mockReturnValue(mockRequest as any);
        startDownloadTransfer(item, callbacks);

        expect(item.url).toBe('http://redirected');
        expect(callbacks.onRedirect).toHaveBeenCalled();
    });

    it('covers array content-length and error callbacks', () => {
        const item = { url: 'http://test', savePath: 'test.zip', receivedBytes: 0, state: 'progressing' } as any;
        const callbacks = {
            onRequest: vi.fn(), onRedirect: vi.fn(), onProgress: vi.fn(), onFailure: vi.fn(), onComplete: vi.fn()
        };

        let responseDataCb: any;
        let responseErrorCb: any;
        const mockResponse = {
            statusCode: 200,
            headers: { 'content-length': ['100'] },
            on: vi.fn((event, cb) => {
                if (event === 'data') responseDataCb = cb;
                if (event === 'error') responseErrorCb = cb;
                if (event === 'end') cb();
            })
        };

        const mockRequest = {
            on: vi.fn((event, cb) => {
                if (event === 'response') cb(mockResponse);
            }),
            setHeader: vi.fn(),
            end: vi.fn()
        };

        let streamErrorCb: any;
        const mockStream = {
            on: vi.fn((event, cb) => { if (event === 'error') streamErrorCb = cb; }),
            write: vi.fn(),
            close: vi.fn(),
            end: vi.fn()
        };

        vi.spyOn(net, 'request').mockReturnValue(mockRequest as any);
        vi.spyOn(fs, 'createWriteStream').mockReturnValue(mockStream as any);

        startDownloadTransfer(item, callbacks);

        expect(item.totalBytes).toBe(100);

        // trigger data callback while not progressing
        item.state = 'paused';
        responseDataCb(Buffer.from('test'));
        expect(mockStream.close).toHaveBeenCalled();

        // trigger error callback
        item.state = 'progressing';
        streamErrorCb(new Error('stream err'));
        expect(callbacks.onFailure).toHaveBeenCalledWith('stream err');
    });
});
