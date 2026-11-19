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

const REDIRECT_STATUS = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 10;
const redirectCounts = new WeakMap<Download, number>();

function resolveRedirect(location: string, base: string | undefined) {
  if (/^https?:\/\//i.test(location)) return location;
  try {
    return new URL(location, base).toString();
  } catch {
    return location;
  }
}

export function startDownloadTransfer(item: Download, callbacks: TransferCallbacks) {
  let resuming = item.receivedBytes > 0;
  const options: Electron.ClientRequestConstructorOptions = {
    url: item.url,
    method: 'GET',
    headers: resuming ? { Range: `bytes=${item.receivedBytes}-` } : undefined,
  };
  const request = net.request(options);
  callbacks.onRequest(request);

  request.on('response', (response) => {
    if (REDIRECT_STATUS.has(response.statusCode)) {
      const location = response.headers.location;
      const redirect = Array.isArray(location) ? location[0] : location;
      if (redirect) {
        const count = (redirectCounts.get(item) ?? 0) + 1;
        if (count > MAX_REDIRECTS) {
          redirectCounts.delete(item);
          callbacks.onFailure('Too many redirects');
          return;
        }
        redirectCounts.set(item, count);
        item.url = resolveRedirect(redirect, item.url);
        callbacks.onRedirect();
        return;
      }
    }
    redirectCounts.delete(item);

    if (response.statusCode !== 200 && response.statusCode !== 206) {
      callbacks.onFailure(`HTTP Error: ${response.statusCode}`);
      return;
    }

    // A 200 to a Range request means the server ignored it: restart instead of appending the full body to the partial file.
    if (resuming && response.statusCode === 200) {
      resuming = false;
      item.receivedBytes = 0;
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
