import { net, BrowserWindow, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import EventEmitter from 'events';

export interface DownloadItem {
    id: string;
    url: string;
    filename: string;
    savePath: string;
    totalBytes: number;
    receivedBytes: number;
    state: 'progressing' | 'paused' | 'completed' | 'failed' | 'cancelled' | 'queued';
    speed: number; // bytes per second
    progress: number; // 0-100
    startTime: number;
    error?: string;
    context?: any; // Extra data (type: 'install' | 'update', modId, etc.)
}

export class DownloadManager extends EventEmitter {
    private downloads: Map<string, DownloadItem> = new Map();
    private activeRequests: Map<string, any> = new Map(); // Store net.ClientRequest
    private mainWindow: BrowserWindow | null = null;

    constructor() {
        super();
    }

    setWindow(window: BrowserWindow) {
        this.mainWindow = window;
    }

    private emitUpdate() {
        if (this.mainWindow) {
            this.mainWindow.webContents.send('downloads-update', Array.from(this.downloads.values()));
        }
    }

    getDownloads() {
        return Array.from(this.downloads.values());
    }

    startDownload(url: string, saveFolder: string, filename: string, context?: any): string {
        const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
        const savePath = path.join(saveFolder, filename);

        const item: DownloadItem = {
            id,
            url,
            filename,
            savePath,
            totalBytes: 0,
            receivedBytes: 0,
            state: 'queued',
            speed: 0,
            progress: 0,
            startTime: Date.now(),
            context
        };

        this.downloads.set(id, item);
        this.processDownload(id);
        return id;
    }

    private processDownload(id: string) {
        const item = this.downloads.get(id);
        if (!item || item.state === 'completed' || item.state === 'cancelled') return;

        item.state = 'progressing';
        item.startTime = Date.now(); // Reset start for speed calc window
        this.emitUpdate();

        const isResuming = item.receivedBytes > 0;
        const options: Electron.ClientRequestConstructorOptions = {
            url: item.url,
            method: 'GET'
        };

        if (isResuming) {
            options.headers = {
                'Range': `bytes=${item.receivedBytes}-`
            };
        }

        const request = net.request(options);
        this.activeRequests.set(id, request);

        request.on('response', (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                // Handle redirect
                const redirectUrl = Array.isArray(response.headers['location']) ? response.headers['location'][0] : response.headers['location'];
                if (redirectUrl) {
                    item.url = redirectUrl;
                    this.activeRequests.delete(id);
                    this.processDownload(id); // Restart with new URL
                    return;
                }
            }

            if (response.statusCode !== 200 && response.statusCode !== 206) {
                item.state = 'failed';
                item.error = `HTTP Error: ${response.statusCode}`;
                this.activeRequests.delete(id);
                this.emitUpdate();
                this.emit('download-failed', id, item.error);
                return;
            }

            if (!isResuming) {
                const len = response.headers['content-length'];
                item.totalBytes = len ? parseInt(Array.isArray(len) ? len[0] : len) : 0;
            }

            // Create write stream
            const stream = fs.createWriteStream(item.savePath, { flags: isResuming ? 'a' : 'w' });

            let lastUpdate = Date.now();
            let bytesSinceLastUpdate = 0;

            response.on('data', (chunk) => {
                if (item.state !== 'progressing') {
                    // Force close if state changed externally (pause/cancel)
                    stream.close();
                    return;
                }

                item.receivedBytes += chunk.length;
                bytesSinceLastUpdate += chunk.length;
                stream.write(chunk);

                const now = Date.now();
                if (now - lastUpdate > 500) {
                    const dt = (now - lastUpdate) / 1000;
                    item.speed = bytesSinceLastUpdate / dt;
                    item.progress = item.totalBytes > 0 ? (item.receivedBytes / item.totalBytes) * 100 : 0;

                    lastUpdate = now;
                    bytesSinceLastUpdate = 0;
                    this.emitUpdate();
                }
            });

            response.on('end', () => {
                stream.end();
                if (item.state === 'progressing') {
                    item.state = 'completed';
                    item.progress = 100;
                    item.speed = 0;
                    this.activeRequests.delete(id);
                    this.emitUpdate();
                    this.emit('download-completed', id);
                }
            });

            response.on('error', (err: any) => {
                stream.close();
                if (item.state !== 'cancelled' && item.state !== 'paused') {
                    item.state = 'failed';
                    item.error = err.message;
                    this.activeRequests.delete(id);
                    this.emitUpdate();
                    this.emit('download-failed', id, err.message);
                }
            });
        });

        request.on('error', (err: any) => {
            if (item.state !== 'cancelled' && item.state !== 'paused') {
                item.state = 'failed';
                item.error = err.message;
                this.activeRequests.delete(id);
                this.emitUpdate();
                this.emit('download-failed', id, err.message);
            }
        });

        request.end();
    }

    pauseDownload(id: string) {
        const item = this.downloads.get(id);
        if (item && item.state === 'progressing') {
            item.state = 'paused';
            item.speed = 0;
            const req = this.activeRequests.get(id);
            if (req) {
                req.abort(); // Verify if abort properly closes stream or if we need to destroy response
                this.activeRequests.delete(id);
            }
            this.emitUpdate();
        }
    }

    resumeDownload(id: string) {
        const item = this.downloads.get(id);
        if (item && item.state === 'paused') {
            this.processDownload(id);
        }
    }

    cancelDownload(id: string) {
        const item = this.downloads.get(id);
        if (item) {
            item.state = 'cancelled';
            item.speed = 0;
            const req = this.activeRequests.get(id);
            if (req) {
                req.abort();
                this.activeRequests.delete(id);
            }
            // Delete file
            fs.unlink(item.savePath, (err) => { });
            // Keep in list so user sees it was cancelled, use clear to remove
            this.emitUpdate();
        }
    }

    clearCompleted() {
        for (const [id, item] of this.downloads.entries()) {
            if (item.state === 'completed' || item.state === 'cancelled' || item.state === 'failed') {
                this.downloads.delete(id);
            }
        }
        this.emitUpdate();
    }

    openDownloadFolder(id: string) {
        const item = this.downloads.get(id);
        if (item && item.savePath && this.mainWindow) {
            shell.showItemInFolder(item.savePath);
        }
    }
}
