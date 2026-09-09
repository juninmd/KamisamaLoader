import './backend-sweep.fixture';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager.js';
import { DownloadManager } from '../../electron/download-manager.js';
import fs from 'fs/promises';
import { EventEmitter } from 'events';
import * as gamebanana from '../../electron/gamebanana.js';
import * as github from '../../electron/github.js';
describe('Backend Sweep - ModManager', () => {
    let modManager: ModManager;
    let mockDownloadManager: any;
    beforeEach(() => {
        vi.clearAllMocks();
        mockDownloadManager = new EventEmitter();
        mockDownloadManager.startDownload = vi.fn().mockReturnValue('dl-123');
        mockDownloadManager.failDownload = vi.fn();
        modManager = new ModManager(mockDownloadManager as unknown as DownloadManager);
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.readFile as any).mockResolvedValue(JSON.stringify([]));
        (fs.writeFile as any).mockResolvedValue(undefined);
        (fs.unlink as any).mockResolvedValue(undefined);
        (fs.cp as any).mockResolvedValue(undefined);
        (fs.rm as any).mockResolvedValue(undefined);
        (fs.readdir as any).mockResolvedValue([]);
        (fs.stat as any).mockResolvedValue({ isDirectory: () => true });
    });
    it('installOnlineMod should ignore irrelevant download completion events', async () => {
        const mod = { gameBananaId: 123, name: 'TestMod' };
        vi.spyOn(gamebanana, 'fetchModProfile').mockResolvedValue({
            _aFiles: [{ _idRow: 1, _sDownloadUrl: 'http://dl.com' }]
        } as any);
        (modManager as any).deployMod = vi.fn();
        await modManager.installOnlineMod(mod as any);
        mockDownloadManager.emit('download-completed', 'other-id');
        await new Promise(resolve => setTimeout(resolve, 10));
        expect((modManager as any).deployMod).not.toHaveBeenCalled();
    });
});
describe('Backend Sweep - ModManager', () => {
    let modManager: ModManager;
    let mockDownloadManager: any;
    beforeEach(() => {
        vi.clearAllMocks();
        mockDownloadManager = new EventEmitter();
        mockDownloadManager.startDownload = vi.fn().mockReturnValue('dl-123');
        mockDownloadManager.failDownload = vi.fn();
        modManager = new ModManager(mockDownloadManager as unknown as DownloadManager);
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.readFile as any).mockResolvedValue(JSON.stringify([]));
        (fs.writeFile as any).mockResolvedValue(undefined);
        (fs.unlink as any).mockResolvedValue(undefined);
        (fs.cp as any).mockResolvedValue(undefined);
        (fs.rm as any).mockResolvedValue(undefined);
        (fs.readdir as any).mockResolvedValue([]);
        (fs.stat as any).mockResolvedValue({ isDirectory: () => true });
    });
    it('installOnlineMod should remove its completion listener on download failure', async () => {
        vi.spyOn(gamebanana, 'fetchModProfile').mockResolvedValue({
            _aFiles: [{ _idRow: 1, _sDownloadUrl: 'http://dl.com' }]
        } as any);
        await modManager.installOnlineMod({ gameBananaId: 123, name: 'TestMod' } as any);
        expect(mockDownloadManager.listenerCount('download-completed')).toBe(1);
        mockDownloadManager.emit('download-failed', 'dl-123', 'Network Error');
        expect(mockDownloadManager.listenerCount('download-completed')).toBe(0);
    });
});
describe('Backend Sweep - ModManager', () => {
    let modManager: ModManager;
    let mockDownloadManager: any;
    beforeEach(() => {
        vi.clearAllMocks();
        mockDownloadManager = new EventEmitter();
        mockDownloadManager.startDownload = vi.fn().mockReturnValue('dl-123');
        mockDownloadManager.failDownload = vi.fn();
        modManager = new ModManager(mockDownloadManager as unknown as DownloadManager);
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.readFile as any).mockResolvedValue(JSON.stringify([]));
        (fs.writeFile as any).mockResolvedValue(undefined);
        (fs.unlink as any).mockResolvedValue(undefined);
        (fs.cp as any).mockResolvedValue(undefined);
        (fs.rm as any).mockResolvedValue(undefined);
        (fs.readdir as any).mockResolvedValue([]);
        (fs.stat as any).mockResolvedValue({ isDirectory: () => true });
    });
    it('installOnlineMod should handle extraction failure in callback', async () => {
        const mod = { gameBananaId: 123, name: 'TestMod' };
        vi.spyOn(gamebanana, 'fetchModProfile').mockResolvedValue({
            _aFiles: [{ _idRow: 1, _sDownloadUrl: 'http://dl.com' }]
        } as any);
        (modManager as any).extractZip = vi.fn().mockRejectedValue(new Error('Zip Fail'));
        await modManager.installOnlineMod(mod as any);
        mockDownloadManager.emit('download-completed', 'dl-123');
        await new Promise(resolve => setTimeout(resolve, 10));
        expect((modManager as any).extractZip).toHaveBeenCalled();
    });
});
describe('Backend Sweep - ModManager', () => {
    let modManager: ModManager;
    let mockDownloadManager: any;
    beforeEach(() => {
        vi.clearAllMocks();
        mockDownloadManager = new EventEmitter();
        mockDownloadManager.startDownload = vi.fn().mockReturnValue('dl-123');
        mockDownloadManager.failDownload = vi.fn();
        modManager = new ModManager(mockDownloadManager as unknown as DownloadManager);
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.readFile as any).mockResolvedValue(JSON.stringify([]));
        (fs.writeFile as any).mockResolvedValue(undefined);
        (fs.unlink as any).mockResolvedValue(undefined);
        (fs.cp as any).mockResolvedValue(undefined);
        (fs.rm as any).mockResolvedValue(undefined);
        (fs.readdir as any).mockResolvedValue([]);
        (fs.stat as any).mockResolvedValue({ isDirectory: () => true });
    });
    it('installUE4SS should handle download completion via DownloadManager', async () => {
        vi.spyOn(modManager, 'getSettings').mockResolvedValue({ gamePath: '/mock/game' });
        vi.spyOn(github, 'fetchLatestRelease').mockResolvedValue('http://ue4ss.com/dl.zip');
        (modManager as any).finalizeUE4SSInstall = vi.fn().mockResolvedValue({ success: true, message: 'OK' });
        const promise = modManager.installUE4SS();
        await new Promise(resolve => setTimeout(resolve, 200));
        mockDownloadManager.emit('download-completed', 'dl-123');
        const result = await promise;
        expect(result.success).toBe(true);
        expect((modManager as any).finalizeUE4SSInstall).toHaveBeenCalled();
    });
});
