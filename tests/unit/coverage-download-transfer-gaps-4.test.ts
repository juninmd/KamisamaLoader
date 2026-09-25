import { describe, it, expect, vi } from 'vitest';
import { startDownloadTransfer } from '../../electron/download-transfer';
import { net } from 'electron';
import fs from 'fs';

vi.mock('electron', () => ({
    net: { request: vi.fn() }
}));

describe('DownloadTransfer Additional Gaps', () => {
    it('covers response array location', () => {
        const item = { url: 'http://test', savePath: 'test.zip', receivedBytes: 0, state: 'progressing' } as any;
        const callbacks = {
            onRequest: vi.fn(), onRedirect: vi.fn(), onProgress: vi.fn(), onFailure: vi.fn(), onComplete: vi.fn()
        };

        const mockResponse = {
            statusCode: 302,
            headers: { location: ['http://redirect'] },
            on: vi.fn()
        };

        const mockRequest = {
            on: vi.fn((event, cb) => {
                if (event === 'response') cb(mockResponse);
            }),
            setHeader: vi.fn(),
            end: vi.fn()
        };

        vi.spyOn(net, 'request').mockReturnValue(mockRequest as any);

        startDownloadTransfer(item, callbacks);
        expect(callbacks.onRedirect).toHaveBeenCalled();
        expect(item.url).toBe('http://redirect');
    });

    it('covers error closing stream', () => {
        const item = { url: 'http://test', savePath: 'test.zip', receivedBytes: 0, state: 'progressing' } as any;
        const callbacks = {
            onRequest: vi.fn(), onRedirect: vi.fn(), onProgress: vi.fn(), onFailure: vi.fn(), onComplete: vi.fn()
        };

        let responseErrorCb: any;
        const mockResponse = {
            statusCode: 200,
            headers: { 'content-length': '100' },
            on: vi.fn((event, cb) => {
                if (event === 'error') responseErrorCb = cb;
            })
        };

        const mockRequest = {
            on: vi.fn((event, cb) => {
                if (event === 'response') cb(mockResponse);
            }),
            setHeader: vi.fn(),
            end: vi.fn()
        };

        const mockStream = {
            on: vi.fn(),
            write: vi.fn(),
            close: vi.fn(),
            end: vi.fn()
        };

        vi.spyOn(net, 'request').mockReturnValue(mockRequest as any);
        vi.spyOn(fs, 'createWriteStream').mockReturnValue(mockStream as any);

        startDownloadTransfer(item, callbacks);
        responseErrorCb(new Error('fail2'));
        expect(callbacks.onFailure).toHaveBeenCalledWith('fail2');
    });
});
