import { mockDownloadManager } from './mod-manager.fixture';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';
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
    describe('Deploy Fallbacks and Errors', () => {
        it('should fallback to copy if link fails', async () => {
            const mod = { id: '1', name: 'M', folderPath: '/mods/M' };
            (fs.readdir as any).mockResolvedValue(['file.pak']);
            (fs.stat as any).mockResolvedValue({ isDirectory: () => false });
            (fs.link as any).mockRejectedValue({ code: 'EXDEV' });
            (fs.copyFile as any).mockResolvedValue(undefined);
            await modManager.deployMod(mod as any);
            expect(fs.link).toHaveBeenCalled();
            expect(fs.copyFile).toHaveBeenCalled();
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
    describe('Deploy Fallbacks and Errors', () => {
        it('should log error if copy also fails', async () => {
            const mod = { id: '1', name: 'M', folderPath: '/mods/M' };
            (fs.readdir as any).mockResolvedValue(['file.pak']);
            (fs.stat as any).mockResolvedValue({ isDirectory: () => false });
            (fs.link as any).mockRejectedValue({ code: 'EXDEV' });
            (fs.copyFile as any).mockRejectedValue(new Error('CopyFail'));
            const consoleSpy = vi.spyOn(console, 'error');
            await modManager.deployMod(mod as any);
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Deployment failed'), expect.anything());
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
    describe('Deploy Fallbacks and Errors', () => {
        it('should handle undeploy errors', async () => {
            const mod = { id: '1', deployedFiles: ['/path/file.pak'] };
            (fs.unlink as any).mockRejectedValue(new Error('Fail'));
            await modManager.undeployMod(mod as any);
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
    describe('Install Online Mod', () => {
        it('should start download and install on complete', async () => {
            const { fetchModProfile } = await import('../../electron/gamebanana');
            (fetchModProfile as any).mockResolvedValue({
                _aFiles: [{ _idRow: 1, _sDownloadUrl: 'url' }],
                _sName: 'Mod',
                _sVersion: '1.0'
            });
            mockDownloadManager.startDownload.mockReturnValue('dl-mod');
            const result = await modManager.installOnlineMod({ gameBananaId: 1 } as any);
            expect(result.success).toBe(true);
            const install = vi.spyOn(modManager, 'installPackage').mockResolvedValue(undefined);
            mockDownloadManager.completeInstallation = vi.fn();
            const onComplete = mockDownloadManager.on.mock.calls.find((c: any) => c[0] === 'download-completed')[1];
            (fs.writeFile as any).mockResolvedValue(undefined);
            (fs.mkdir as any).mockResolvedValue(undefined);
            (fs.readdir as any).mockResolvedValue([]);
            await onComplete('dl-mod');
            expect(install).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ gameBananaId: 1, installedFileId: 1 }), expect.any(String));
            expect(mockDownloadManager.completeInstallation).toHaveBeenCalledWith('dl-mod');
        });
    });
});
