import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requestFactory: vi.fn(),
  createWriteStream: vi.fn(),
}));

vi.mock('electron', () => ({
  net: { request: mocks.requestFactory },
  shell: { showItemInFolder: vi.fn() },
  BrowserWindow: class {},
}));

vi.mock('fs', () => ({
  default: { createWriteStream: mocks.createWriteStream, unlink: vi.fn() },
}));

import { DownloadManager } from '../../electron/download-manager';

describe('download completion durability', () => {
  let request: EventEmitter & { end: ReturnType<typeof vi.fn> };
  let stream: EventEmitter & {
    write: ReturnType<typeof vi.fn>;
    end: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    request = Object.assign(new EventEmitter(), { end: vi.fn() });
    stream = Object.assign(new EventEmitter(), {
      write: vi.fn(),
      close: vi.fn(),
      end: vi.fn((callback?: () => void) => queueMicrotask(() => {
        stream.emit('finish');
        callback?.();
      })),
    });
    mocks.requestFactory.mockReturnValue(request);
    mocks.createWriteStream.mockReturnValue(stream);
  });

  it('emits completed only after the archive is flushed', async () => {
    const response = new EventEmitter() as EventEmitter & {
      statusCode: number;
      headers: Record<string, string>;
    };
    response.statusCode = 200;
    response.headers = { 'content-length': '3' };
    let flushed = false;
    stream.once('finish', () => { flushed = true; });

    const manager = new DownloadManager();
    const completed = new Promise<boolean>((resolve) => {
      manager.once('download-completed', () => resolve(flushed));
    });
    manager.startDownload('https://example.test/mod.zip', 'C:\\temp', 'mod.zip');
    request.emit('response', response);
    response.emit('data', Buffer.from('zip'));
    response.emit('end');

    expect(await completed).toBe(true);
  });
});
