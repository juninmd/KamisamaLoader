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
    it('installUE4SS should ignore irrelevant download events', async () => {
        vi.spyOn(modManager, 'getSettings').mockResolvedValue({ gamePath: '/mock/game' });
        vi.spyOn(github, 'fetchLatestRelease').mockResolvedValue('http://ue4ss.com/dl.zip');
        (modManager as any).finalizeUE4SSInstall = vi.fn();
        modManager.installUE4SS();
        await new Promise(resolve => setTimeout(resolve, 200));
        mockDownloadManager.emit('download-completed', 'wrong-id');
        await new Promise(resolve => setTimeout(resolve, 10));
        expect((modManager as any).finalizeUE4SSInstall).not.toHaveBeenCalled();
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
    it('toggleMod should detect conflicts', async () => {
        const mockMods = [
            { id: '1', name: 'Mod A', category: 'Characters', isEnabled: false },
            { id: '2', name: 'Mod B', category: 'Characters', isEnabled: true }
        ];
        (fs.readFile as any).mockResolvedValue(JSON.stringify(mockMods));
        (modManager as any).deployMod = vi.fn().mockResolvedValue(true);
        (modManager as any).syncActiveProfile = vi.fn();
        const result = await modManager.toggleMod('1', true);
        expect(result.success).toBe(true);
        expect(result.conflict).toContain('shares the category');
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
    it('checkForUpdates should handle mixed results', async () => {
        const mockMods = [
            { id: '1', gameBananaId: 100, version: '1.0' },
            { id: '2', gameBananaId: 200, version: '1.0' }
        ];
        (fs.readFile as any).mockResolvedValue(JSON.stringify(mockMods));
        vi.spyOn(gamebanana, 'fetchModProfile')
            .mockResolvedValueOnce({ _sVersion: '2.0', _aFiles: [{ _idRow: 999, _sDownloadUrl: 'url' }] } as any)
            .mockRejectedValueOnce(new Error('API Error'));
        const updates = await modManager.checkForUpdates();
        expect(updates).toContain('1');
        expect(updates).not.toContain('2');
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
    it('deployModFiles should ignore unsupported file extensions in root', async () => {
        (fs.readdir as any).mockResolvedValue(['mod.pak', 'readme.txt', 'ignored.png']);
        (fs.stat as any).mockResolvedValue({ isDirectory: () => false });
        (modManager as any).deployFile = vi.fn().mockResolvedValue(true);
        vi.spyOn(modManager, 'getSettings').mockResolvedValue({ gamePath: '/mock/game' });
        const mod = { id: '1', name: 'M', folderPath: '/mods/M', isEnabled: true };
        const result = await (modManager as any).deployModFiles(mod, '/game/paks', '/game/logic', '/game/bin', '/game/content');
        const normalize = (value: string) => value.replace(/\\/g, '/');
        const deployedSources = ((modManager as any).deployFile as ReturnType<typeof vi.fn>)
            .mock.calls
            .map((call: [
            string,
            string
        ]) => normalize(call[0]));
        expect(deployedSources).toContain('/mods/M/mod.pak');
        expect(deployedSources).not.toContain('/mods/M/readme.txt');
        expect(deployedSources).not.toContain('/mods/M/ignored.png');
    });
});
