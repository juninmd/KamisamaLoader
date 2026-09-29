import { describe, it, expect, vi } from 'vitest';
import { startDownloadTransfer } from '../../electron/download-transfer';
import { net } from 'electron';
import fs from 'fs';

vi.mock('electron', () => ({
    net: { request: vi.fn() }
}));

describe('DownloadTransfer Additional Gaps 3', () => {
    it('covers non-200 non-206 status code', () => {
        const item = { url: 'http://test', savePath: 'test.zip', receivedBytes: 0, state: 'progressing' } as any;
        const callbacks = {
            onRequest: vi.fn(), onRedirect: vi.fn(), onProgress: vi.fn(), onFailure: vi.fn(), onComplete: vi.fn()
        };

        const mockResponse = {
            statusCode: 404,
            headers: {},
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
        expect(callbacks.onFailure).toHaveBeenCalledWith('HTTP Error: 404');
    });
});
