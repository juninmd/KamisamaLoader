import { BrowserWindow, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import EventEmitter from 'node:events';
import type { Download } from '../shared/types.js';
import { startDownloadTransfer } from './download-transfer.js';

export class DownloadManager extends EventEmitter {
  private downloads = new Map<string, Download>();
  private activeRequests = new Map<string, Electron.ClientRequest>();
  private mainWindow: BrowserWindow | null = null;

  setWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  private emitUpdate() {
    this.mainWindow?.webContents.send('downloads-update', this.getDownloads());
  }

  getDownloads() {
    return Array.from(this.downloads.values());
  }

  startDownload(url: string, saveFolder: string, filename: string, context?: Record<string, unknown>) {
    const id = `${Date.now()}${Math.random().toString(36).slice(2, 5)}`;
    this.downloads.set(id, {
      id,
      url,
      filename,
      savePath: path.join(saveFolder, filename),
      totalBytes: 0,
      receivedBytes: 0,
      state: 'queued',
      speed: 0,
      progress: 0,
      startTime: Date.now(),
      context,
    });
    this.processDownload(id);
    return id;
  }

  private processDownload(id: string) {
    const item = this.downloads.get(id);
    if (!item || item.state === 'completed' || item.state === 'cancelled') return;
    item.state = 'progressing';
    item.startTime = Date.now();
    this.emitUpdate();

    const cleanup = () => this.activeRequests.delete(id);
    const fail = (message: string) => {
      if (item.state === 'cancelled' || item.state === 'paused' || item.state === 'failed') return;
      item.state = 'failed';
      item.error = message;
      cleanup();
      this.emitUpdate();
      this.emit('download-failed', id, message);
    };
    startDownloadTransfer(item, {
      onRequest: (request) => this.activeRequests.set(id, request),
      onRedirect: () => { cleanup(); this.processDownload(id); },
      onProgress: () => this.emitUpdate(),
      onFailure: fail,
      onComplete: () => {
        item.state = 'completed';
        item.progress = 100;
        item.speed = 0;
        cleanup();
        this.emitUpdate();
        this.emit('download-completed', id);
      },
    });
  }

  pauseDownload(id: string) {
    const item = this.downloads.get(id);
    if (!item || item.state !== 'progressing') return;
    item.state = 'paused';
    item.speed = 0;
    this.activeRequests.get(id)?.abort();
    this.activeRequests.delete(id);
    this.emitUpdate();
  }

  resumeDownload(id: string) {
    if (this.downloads.get(id)?.state === 'paused') this.processDownload(id);
  }

  failDownload(id: string, message: string) {
    const item = this.downloads.get(id);
    if (!item) return;
    item.state = 'failed';
    item.error = message;
    item.speed = 0;
    this.activeRequests.delete(id);
    this.emitUpdate();
    this.emit('download-failed', id, message);
  }

  cancelDownload(id: string) {
    const item = this.downloads.get(id);
    if (!item) return;
    item.state = 'cancelled';
    item.speed = 0;
    this.activeRequests.get(id)?.abort();
    this.activeRequests.delete(id);
    fs.unlink(item.savePath, () => undefined);
    this.emitUpdate();
  }

  clearCompleted() {
    for (const [id, item] of this.downloads) {
      if (['completed', 'cancelled', 'failed'].includes(item.state)) this.downloads.delete(id);
    }
    this.emitUpdate();
  }

  openDownloadFolder(id: string) {
    const item = this.downloads.get(id);
    if (item?.savePath && this.mainWindow) shell.showItemInFolder(item.savePath);
  }
}
