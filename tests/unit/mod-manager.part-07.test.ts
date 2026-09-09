import { mockDownloadManager } from './mod-manager.fixture';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';
import path from 'path';
describe('ModManager', () => {
    let modManager: ModManager;
    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager(mockDownloadManager as any);
        modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/mock/game/path', activeProfileId: 'p1' });
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.readFile as any).mockResolvedValue('[]');
        (fs.writeFile as any).mockResolvedValue(undefined);
        (fs.stat as any).mockImplementation(() => Promise.resolve({
            isDirectory: () => false,
            size: 100
        }));
        (fs.readdir as any).mockResolvedValue([]);
        (fs.unlink as any).mockResolvedValue(undefined);
        (fs.rm as any).mockResolvedValue(undefined);
        (fs.rename as any).mockResolvedValue(undefined);
        (fs.copyFile as any).mockResolvedValue(undefined);
        (fs.link as any).mockResolvedValue(undefined);
    });
    describe('Priority & Deploy', () => {
        it('fixPriorities should normalize priorities', async () => {
            const mockMods = [
                { id: '1', priority: 10, name: 'A' },
                { id: '2', priority: 10, name: 'B' }
            ];
            (fs.readFile as any).mockResolvedValue(JSON.stringify(mockMods));
            await modManager.fixPriorities();
            expect(fs.writeFile).toHaveBeenCalled();
            const written = JSON.parse((fs.writeFile as any).mock.calls[0][1]);
            expect(written[0].priority).not.toBe(written[1].priority);
        });
    });
});
describe('ModManager', () => {
    let modManager: ModManager;
    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager(mockDownloadManager as any);
        modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/mock/game/path', activeProfileId: 'p1' });
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.readFile as any).mockResolvedValue('[]');
        (fs.writeFile as any).mockResolvedValue(undefined);
        (fs.stat as any).mockImplementation(() => Promise.resolve({
            isDirectory: () => false,
            size: 100
        }));
        (fs.readdir as any).mockResolvedValue([]);
        (fs.unlink as any).mockResolvedValue(undefined);
        (fs.rm as any).mockResolvedValue(undefined);
        (fs.rename as any).mockResolvedValue(undefined);
        (fs.copyFile as any).mockResolvedValue(undefined);
        (fs.link as any).mockResolvedValue(undefined);
    });
    describe('Priority & Deploy', () => {
        it('deployMod should deploy files', async () => {
            const mod = { id: '1', name: 'M', folderPath: '/mods/M', isEnabled: true };
            (fs.readdir as any).mockResolvedValue(['file.pak']);
            (fs.stat as any).mockImplementation((p: string) => Promise.resolve({
                isDirectory: () => false
            }));
            await modManager.deployMod(mod as any);
            expect(fs.link).toHaveBeenCalled();
        });
    });
});
describe('ModManager', () => {
    let modManager: ModManager;
    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager(mockDownloadManager as any);
        modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/mock/game/path', activeProfileId: 'p1' });
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.readFile as any).mockResolvedValue('[]');
        (fs.writeFile as any).mockResolvedValue(undefined);
        (fs.stat as any).mockImplementation(() => Promise.resolve({
            isDirectory: () => false,
            size: 100
        }));
        (fs.readdir as any).mockResolvedValue([]);
        (fs.unlink as any).mockResolvedValue(undefined);
        (fs.rm as any).mockResolvedValue(undefined);
        (fs.rename as any).mockResolvedValue(undefined);
        (fs.copyFile as any).mockResolvedValue(undefined);
        (fs.link as any).mockResolvedValue(undefined);
    });
    describe('Priority & Deploy', () => {
        it('deployMod should handle various file types and errors', async () => {
            const mod = { id: '1', name: 'M', folderPath: '/mods/M', isEnabled: true };
            (fs.readdir as any).mockResolvedValue(['file.pak', 'readme.txt', 'file.sig']);
            (fs.stat as any).mockResolvedValue({ isDirectory: () => false });
            await modManager.deployMod(mod as any);
            expect(fs.link).toHaveBeenCalledTimes(2);
        });
    });
});
describe('ModManager', () => {
    let modManager: ModManager;
    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager(mockDownloadManager as any);
        modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/mock/game/path', activeProfileId: 'p1' });
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.readFile as any).mockResolvedValue('[]');
        (fs.writeFile as any).mockResolvedValue(undefined);
        (fs.stat as any).mockImplementation(() => Promise.resolve({
            isDirectory: () => false,
            size: 100
        }));
        (fs.readdir as any).mockResolvedValue([]);
        (fs.unlink as any).mockResolvedValue(undefined);
        (fs.rm as any).mockResolvedValue(undefined);
        (fs.rename as any).mockResolvedValue(undefined);
        (fs.copyFile as any).mockResolvedValue(undefined);
        (fs.link as any).mockResolvedValue(undefined);
    });
    describe('Priority & Deploy', () => {
        it('should deploy Movies (audio/video) correctly', async () => {
            const mod = { id: '1', name: 'MovieMod', folderPath: '/mods/MovieMod', isEnabled: true };
            const moviesDir = '/mods/MovieMod/Movies';
            const movieFile = '/mods/MovieMod/Movies/intro.usm';
            (fs.readdir as any).mockImplementation((dir) => {
                if (dir === mod.folderPath)
                    return Promise.resolve(['Movies']);
                if (dir === moviesDir)
                    return Promise.resolve(['intro.usm']);
                return Promise.resolve([]);
            });
            (fs.stat as any).mockImplementation((p) => {
                if (p === mod.folderPath || p === moviesDir)
                    return Promise.resolve({ isDirectory: () => true });
                return Promise.resolve({ isDirectory: () => false });
            });
            await modManager.deployMod(mod as any);
            expect(fs.link).toHaveBeenCalledWith(movieFile, expect.stringContaining(path.join('Content', 'Movies', 'intro.usm')));
        });
    });
});
