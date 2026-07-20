import { describe, it, expect, vi, beforeEach } from 'vitest';
import { startDownloadTransfer } from '../../electron/download-transfer';
import { net } from 'electron';
import fs from 'node:fs';
import type { Download } from '../../shared/types';

vi.mock('electron', () => ({
    net: {
        request: vi.fn()
    }
}));

vi.mock('node:fs', () => ({
    default: {
        createWriteStream: vi.fn()
    }
}));

describe('Download Transfer Gaps', () => {
    let mockRequest: any;
    let mockResponse: any;
    let mockStream: any;
    let callbacks: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockRequest = {
            on: vi.fn(),
            end: vi.fn(),
            abort: vi.fn()
        };

        mockResponse = {
            statusCode: 200,
            headers: {},
            on: vi.fn()
        };

        mockStream = {
            write: vi.fn(),
            end: vi.fn(),
            close: vi.fn(),
            on: vi.fn()
        };

        (net.request as any).mockReturnValue(mockRequest);
        (fs.createWriteStream as any).mockReturnValue(mockStream);

        callbacks = {
            onRequest: vi.fn(),
            onRedirect: vi.fn(),
            onProgress: vi.fn(),
            onComplete: vi.fn(),
            onFailure: vi.fn()
        };
    });

    it('should ignore data chunks if settled/cancelled state', () => {
        const item = { state: 'cancelled', receivedBytes: 0 } as Download;
        startDownloadTransfer(item, callbacks);
        const resHandler = mockRequest.on.mock.calls.find((c: any) => c[0] === 'response')[1];
        resHandler(mockResponse);
        const dataHandler = mockResponse.on.mock.calls.find((c: any) => c[0] === 'data')[1];
        dataHandler(Buffer.from('chunk'));
        expect(mockStream.close).toHaveBeenCalled();
    });

    it('should ignore response end if state is not progressing', () => {
        const item = { state: 'cancelled', receivedBytes: 0 } as Download;
        startDownloadTransfer(item, callbacks);
        const resHandler = mockRequest.on.mock.calls.find((c: any) => c[0] === 'response')[1];
        resHandler(mockResponse);
        const endHandler = mockResponse.on.mock.calls.find((c: any) => c[0] === 'end')[1];
        endHandler();
        expect(mockStream.end).toHaveBeenCalledWith(); // called with no callback because it's cancelled
    });

    it('should catch stream error and not fail twice', () => {
        const item = { state: 'progressing', receivedBytes: 0 } as Download;
        startDownloadTransfer(item, callbacks);
        const resHandler = mockRequest.on.mock.calls.find((c: any) => c[0] === 'response')[1];
        resHandler(mockResponse);
        const streamErrHandler = mockStream.on.mock.calls.find((c: any) => c[0] === 'error')[1];
        streamErrHandler(new Error('fail 1'));
        expect(callbacks.onFailure).toHaveBeenCalledWith('fail 1');
        // Second call should be ignored due to `settled` flag
        streamErrHandler(new Error('fail 2'));
        expect(callbacks.onFailure).toHaveBeenCalledTimes(1);
    });

    it('should catch response error and close stream', () => {
        const item = { state: 'progressing', receivedBytes: 0 } as Download;
        startDownloadTransfer(item, callbacks);
        const resHandler = mockRequest.on.mock.calls.find((c: any) => c[0] === 'response')[1];
        resHandler(mockResponse);
        const responseErrHandler = mockResponse.on.mock.calls.find((c: any) => c[0] === 'error')[1];
        responseErrHandler(new Error('res fail'));
        expect(callbacks.onFailure).toHaveBeenCalledWith('res fail');
        expect(mockStream.close).toHaveBeenCalled();
    });

    it('should handle end callback and prevent double completion', () => {
        const item = { state: 'progressing', receivedBytes: 0 } as Download;
        startDownloadTransfer(item, callbacks);
        const resHandler = mockRequest.on.mock.calls.find((c: any) => c[0] === 'response')[1];
        resHandler(mockResponse);
        const endHandler = mockResponse.on.mock.calls.find((c: any) => c[0] === 'end')[1];
        endHandler();
        const streamEndCb = mockStream.end.mock.calls[0][0];
        streamEndCb();
        expect(callbacks.onComplete).toHaveBeenCalled();
        streamEndCb();
        expect(callbacks.onComplete).toHaveBeenCalledTimes(1);
    });

    it('should handle redirect when location is string', () => {
        const item = { state: 'progressing', receivedBytes: 0 } as Download;
        mockResponse.statusCode = 301;
        mockResponse.headers = { location: 'http://redirect.com' };
        startDownloadTransfer(item, callbacks);
        const resHandler = mockRequest.on.mock.calls.find((c: any) => c[0] === 'response')[1];
        resHandler(mockResponse);
        expect(callbacks.onRedirect).toHaveBeenCalled();
    });

    it('should handle length parsing from string instead of array', () => {
        const item = { state: 'progressing', receivedBytes: 0 } as Download;
        mockResponse.headers = { 'content-length': '100' };
        startDownloadTransfer(item, callbacks);
        const resHandler = mockRequest.on.mock.calls.find((c: any) => c[0] === 'response')[1];
        resHandler(mockResponse);
        expect(item.totalBytes).toBe(100);
    });

    it('should ignore if length is missing completely', () => {
        const item = { state: 'progressing', receivedBytes: 0 } as Download;
        startDownloadTransfer(item, callbacks);
        const resHandler = mockRequest.on.mock.calls.find((c: any) => c[0] === 'response')[1];
        resHandler(mockResponse);
        expect(item.totalBytes).toBe(0);
    });
});
