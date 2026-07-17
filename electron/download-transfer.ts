import { net } from 'electron';
import fs from 'node:fs';
import type { Download } from '../shared/types.js';

interface TransferCallbacks {
  onRequest: (request: Electron.ClientRequest) => void;
  onRedirect: () => void;
  onProgress: () => void;
  onComplete: () => void;
  onFailure: (message: string) => void;
}

export function startDownloadTransfer(item: Download, callbacks: TransferCallbacks) {
  const resuming = item.receivedBytes > 0;
  const options: Electron.ClientRequestConstructorOptions = {
    url: item.url,
    method: 'GET',
    headers: resuming ? { Range: `bytes=${item.receivedBytes}-` } : undefined,
  };
  const request = net.request(options);
  callbacks.onRequest(request);

  request.on('response', (response) => {
    if (response.statusCode === 301 || response.statusCode === 302) {
      const location = response.headers.location;
      const redirect = Array.isArray(location) ? location[0] : location;
      if (redirect) {
        item.url = redirect;
        callbacks.onRedirect();
        return;
      }
    }

    if (response.statusCode !== 200 && response.statusCode !== 206) {
      callbacks.onFailure(`HTTP Error: ${response.statusCode}`);
      return;
    }

    if (!resuming) {
      const length = response.headers['content-length'];
      const value = Array.isArray(length) ? length[0] : length;
      item.totalBytes = value ? Number.parseInt(value, 10) : 0;
    }

    const stream = fs.createWriteStream(item.savePath, { flags: resuming ? 'a' : 'w' });
    let lastUpdate = Date.now();
    let bytesSinceUpdate = 0;
    let settled = false;
    const fail = (error: Error) => {
      if (settled || item.state === 'cancelled' || item.state === 'paused') return;
      settled = true;
      stream.close();
      callbacks.onFailure(error.message);
    };

    stream.on('error', fail);
    response.on('error', fail);
    response.on('data', (chunk: Buffer) => {
      if (item.state !== 'progressing') {
        stream.close();
        return;
      }
      item.receivedBytes += chunk.length;
      bytesSinceUpdate += chunk.length;
      stream.write(chunk);
      const now = Date.now();
      if (now - lastUpdate <= 500) return;
      item.speed = bytesSinceUpdate / ((now - lastUpdate) / 1000);
      item.progress = item.totalBytes ? (item.receivedBytes / item.totalBytes) * 100 : 0;
      lastUpdate = now;
      bytesSinceUpdate = 0;
      callbacks.onProgress();
    });
    response.on('end', () => {
      if (item.state !== 'progressing' || settled) {
        stream.end();
        return;
      }
      stream.end(() => {
        if (settled || item.state !== 'progressing') return;
        settled = true;
        callbacks.onComplete();
      });
    });
  });

  request.on('error', (error) => callbacks.onFailure(error.message));
  request.end();
  return request;
}
