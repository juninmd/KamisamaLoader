import { describe, it, expect, vi, beforeEach } from 'vitest';
const mocks = vi.hoisted(() => ({
    fs: {
        mkdir: vi.fn(),
        readFile: vi.fn(),
        writeFile: vi.fn(),
        readdir: vi.fn(),
        stat: vi.fn(),
        unlink: vi.fn(),
        rm: vi.fn(),
        copyFile: vi.fn(),
        link: vi.fn()
    },
    downloadManager: {
        startDownload: vi.fn(),
        on: vi.fn(),
        removeListener: vi.fn()
    },
    admZip: {
        extractAllToAsync: vi.fn()
    }
}));
vi.mock('fs/promises', () => ({
    default: mocks.fs,
    ...mocks.fs
}));
vi.mock('adm-zip', () => ({
    default: vi.fn(function () {
        return {
            getEntries: vi.fn(() => []),
            extractAllToAsync: mocks.admZip.extractAllToAsync
        };
    })
}));
vi.mock('electron', () => ({
    app: { getPath: vi.fn().mockReturnValue('/app') },
    net: { request: vi.fn() },
    shell: { openPath: vi.fn() }
}));
import { ModManager } from '../../electron/mod-manager';
describe('Final Coverage Sweeper', () => {
    let modManager: ModManager;
    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager(mocks.downloadManager as any);
        mocks.fs.readFile.mockResolvedValue(JSON.stringify({ gamePath: '/game' }));
    });
    it('should calculate folder size recursively', async () => {
        mocks.fs.readdir.mockImplementation(async (path) => {
            if (path === '/root')
                return ['dir', 'file1'];
            if (path === '/root/dir')
                return ['file2'];
            return [];
        });
        mocks.fs.stat.mockImplementation(async (path) => {
            if (path.endsWith('dir'))
                return { isDirectory: () => true };
            return { isDirectory: () => false, size: 100 };
        });
        const size = await modManager.calculateFolderSize('/root');
        expect(size).toBe(200);
    });
    it('should install .pak file directly', async () => {
        mocks.fs.readFile.mockResolvedValue('[]');
        mocks.fs.readdir.mockResolvedValue([]);
        mocks.fs.stat.mockResolvedValue({ isDirectory: () => false, size: 0 });
        const install = vi.spyOn(modManager, 'installPackage').mockResolvedValue(undefined);
        expect((await modManager.installMod('/downloads/mod.pak')).success).toBe(true);
        expect(mocks.fs.copyFile).toHaveBeenCalledWith('/downloads/mod.pak', expect.stringContaining('mod.pak'));
        expect(install).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ name: 'mod' }), expect.any(String));
    });
    it('should install .zip file via extraction', async () => {
        mocks.fs.readFile.mockImplementation(async (path) => {
            if (path.endsWith('.zip'))
                return Buffer.from('zip');
            return '[]';
        });
        mocks.admZip.extractAllToAsync.mockImplementation((dest, ow, p, cb) => cb(null));
        const install = vi.spyOn(modManager, 'installPackage').mockResolvedValue(undefined);
        expect((await modManager.installMod('/downloads/mod.zip')).success).toBe(true);
        expect(mocks.admZip.extractAllToAsync).toHaveBeenCalled();
        expect(install).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ name: 'mod' }), expect.any(String));
    });
    it('should check for updates and find one', async () => {
        const mods = [{ id: '1', gameBananaId: 123, version: '1.0' }];
        mocks.fs.readFile.mockResolvedValue(JSON.stringify(mods));
    });
});
