import { describe, it, expect, vi } from 'vitest';
import { startDownloadTransfer } from '../../electron/download-transfer';
import { net } from 'electron';
import fs from 'fs';

vi.mock('electron', () => ({
    net: { request: vi.fn() }
}));

describe('DownloadTransfer Additional Gaps', () => {
    it('covers non-array length, error before stream is defined', () => {
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

        expect(item.totalBytes).toBe(100);

        item.state = 'cancelled';
        responseErrorCb(new Error('fail'));
        expect(callbacks.onFailure).not.toHaveBeenCalled();

        item.state = 'progressing';
        responseErrorCb(new Error('fail2'));
        expect(callbacks.onFailure).toHaveBeenCalledWith('fail2');
    });

    it('covers response end error branch when not progressing', () => {
        const item = { url: 'http://test', savePath: 'test.zip', receivedBytes: 50, totalBytes: 100, state: 'cancelled' } as any;
        const callbacks = {
            onRequest: vi.fn(), onRedirect: vi.fn(), onProgress: vi.fn(), onFailure: vi.fn(), onComplete: vi.fn()
        };

        let responseEndCb: any;
        const mockResponse = {
            statusCode: 200,
            headers: { 'content-length': '100' },
            on: vi.fn((event, cb) => {
                if (event === 'end') responseEndCb = cb;
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
        responseEndCb();
        expect(mockStream.end).toHaveBeenCalled();
    });

    it('covers response end with success when progressing but aborted late', () => {
        const item = { url: 'http://test', savePath: 'test.zip', receivedBytes: 100, totalBytes: 100, state: 'progressing' } as any;
        const callbacks = {
            onRequest: vi.fn(), onRedirect: vi.fn(), onProgress: vi.fn(), onFailure: vi.fn(), onComplete: vi.fn()
        };

        let responseEndCb: any;
        const mockResponse = {
            statusCode: 200,
            headers: { 'content-length': '100' },
            on: vi.fn((event, cb) => {
                if (event === 'end') responseEndCb = cb;
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
            end: vi.fn((cb: any) => {
                item.state = 'cancelled'; // change state before cb fires
                if (cb) cb();
            })
        };

        vi.spyOn(net, 'request').mockReturnValue(mockRequest as any);
        vi.spyOn(fs, 'createWriteStream').mockReturnValue(mockStream as any);

        startDownloadTransfer(item, callbacks);

        responseEndCb();
        expect(callbacks.onComplete).not.toHaveBeenCalled();
    });

    it('covers download stream write progressing to completed properly', () => {
        const item = { url: 'http://test', savePath: 'test.zip', receivedBytes: 100, totalBytes: 100, state: 'progressing' } as any;
        const callbacks = {
            onRequest: vi.fn(), onRedirect: vi.fn(), onProgress: vi.fn(), onFailure: vi.fn(), onComplete: vi.fn()
        };

        let responseEndCb: any;
        const mockResponse = {
            statusCode: 200,
            headers: { 'content-length': '100' },
            on: vi.fn((event, cb) => {
                if (event === 'end') responseEndCb = cb;
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
            end: vi.fn((cb: any) => {
                if (cb) cb();
            })
        };

        vi.spyOn(net, 'request').mockReturnValue(mockRequest as any);
        vi.spyOn(fs, 'createWriteStream').mockReturnValue(mockStream as any);

        startDownloadTransfer(item, callbacks);

        responseEndCb();
        expect(callbacks.onComplete).toHaveBeenCalled();

        // Call it again to hit the early return branch when settled
        callbacks.onComplete.mockClear();
        responseEndCb();
        expect(callbacks.onComplete).not.toHaveBeenCalled();
    });
});
