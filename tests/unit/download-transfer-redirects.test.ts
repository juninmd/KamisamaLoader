import { describe, it, expect, vi, beforeEach } from 'vitest';
import { net } from 'electron';
import fs from 'node:fs';
import { startDownloadTransfer } from '../../electron/download-transfer';
import type { Download } from '../../shared/types';

vi.mock('electron', () => ({ net: { request: vi.fn() } }));
vi.mock('node:fs', () => ({ default: { createWriteStream: vi.fn() } }));

describe('download-transfer redirects and resume', () => {
  let request: any;
  let stream: any;
  let callbacks: any;

  const respond = (statusCode: number, headers: Record<string, string> = {}) => {
    const response = { statusCode, headers, on: vi.fn() };
    request.on.mock.calls.find((c: any) => c[0] === 'response')[1](response);
    return response;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    request = { on: vi.fn(), end: vi.fn(), abort: vi.fn() };
    stream = { write: vi.fn(), end: vi.fn(), close: vi.fn(), on: vi.fn() };
    (net.request as any).mockReturnValue(request);
    (fs.createWriteStream as any).mockReturnValue(stream);
    callbacks = { onRequest: vi.fn(), onRedirect: vi.fn(), onProgress: vi.fn(), onComplete: vi.fn(), onFailure: vi.fn() };
  });

  it.each([303, 307, 308])('follows a %i redirect and resolves a relative Location', (status) => {
    const item = { url: 'https://example.com/a/file.zip', state: 'progressing', receivedBytes: 0 } as Download;
    startDownloadTransfer(item, callbacks);
    respond(status, { location: '/cdn/file.zip' });
    expect(item.url).toBe('https://example.com/cdn/file.zip');
    expect(callbacks.onRedirect).toHaveBeenCalledOnce();
    expect(callbacks.onFailure).not.toHaveBeenCalled();
  });

  it('fails after too many consecutive redirects instead of looping forever', () => {
    const item = { url: 'https://example.com/loop', state: 'progressing', receivedBytes: 0 } as Download;
    for (let i = 0; i < 11; i++) {
      startDownloadTransfer(item, callbacks);
      respond(302, { location: 'https://example.com/loop' });
    }
    expect(callbacks.onRedirect).toHaveBeenCalledTimes(10);
    expect(callbacks.onFailure).toHaveBeenCalledWith('Too many redirects');
  });

  it('restarts from zero when a Range request is answered with 200', () => {
    const item = { url: 'https://example.com/f.zip', state: 'progressing', receivedBytes: 500, totalBytes: 0 } as Download;
    startDownloadTransfer(item, callbacks);
    respond(200, { 'content-length': '1000' });
    expect(fs.createWriteStream).toHaveBeenCalledWith(item.savePath, { flags: 'w' });
    expect(item.receivedBytes).toBe(0);
    expect(item.totalBytes).toBe(1000);
  });

  it('keeps appending when the server answers 206', () => {
    const item = { url: 'https://example.com/f.zip', state: 'progressing', receivedBytes: 500 } as Download;
    startDownloadTransfer(item, callbacks);
    respond(206);
    expect(fs.createWriteStream).toHaveBeenCalledWith(item.savePath, { flags: 'a' });
    expect(item.receivedBytes).toBe(500);
  });
});
