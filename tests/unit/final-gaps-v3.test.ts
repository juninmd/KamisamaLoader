import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import path from 'path';

// Hoist mocks
const { mockFs, mockNet, mockApp, mockShell } = vi.hoisted(() => {
    return {
        mockFs: {
            readFile: vi.fn(),
            writeFile: vi.fn(),
            mkdir: vi.fn(),
            unlink: vi.fn(),
            rm: vi.fn(),
            stat: vi.fn(),
            cp: vi.fn(),
            access: vi.fn(),
            readdir: vi.fn(),
            createWriteStream: vi.fn(),
            link: vi.fn(),
            copyFile: vi.fn(),
        },
        mockNet: {
            request: vi.fn(),
        },
        mockApp: {
            getPath: vi.fn((name) => {
                if (name === 'exe') return '/app/dist-electron/electron.exe';
                return '/tmp';
            }),
            isPackaged: false
        },
        mockShell: {
            showItemInFolder: vi.fn(),
            openPath: vi.fn()
        }
    };
});

// Mock fs
vi.mock('fs', async () => {
    return {
        default: {
            ...mockFs,
            createWriteStream: vi.fn(() => ({
                write: vi.fn(),
                close: vi.fn(),
                end: vi.fn(),
                on: vi.fn(),
                once: vi.fn(),
                emit: vi.fn(),
            })),
            unlink: vi.fn((p: any, cb: any) => cb(null)),
            mkdir: mockFs.mkdir,
            readFile: mockFs.readFile,
            writeFile: mockFs.writeFile,
            stat: mockFs.stat,
            readdir: mockFs.readdir,
            link: mockFs.link,
            copyFile: mockFs.copyFile,
            rm: mockFs.rm,
            cp: mockFs.cp
        },
        createWriteStream: vi.fn(() => ({
            write: vi.fn(),
            close: vi.fn(),
            end: vi.fn(),
            on: vi.fn(),
            once: vi.fn(),
            emit: vi.fn(),
        })),
    };
});

vi.mock('fs/promises', () => ({ default: mockFs }));

// Mock electron
vi.mock('electron', () => ({
    net: mockNet,
    app: mockApp,
    shell: mockShell,
    BrowserWindow: class { webContents = { send: vi.fn() } }
}));

// Import classes
import { DownloadManager } from '../../electron/download-manager';
import { ModManager } from '../../electron/mod-manager';

describe('Final Gaps V3', () => {

    // --- DownloadManager ---
    describe('DownloadManager Branches', () => {
        let downloadManager: DownloadManager;

        beforeEach(() => {
            downloadManager = new DownloadManager();
            vi.clearAllMocks();
        });

        it('should handle Resume with 206 Partial Content', () => {
            // First call to startDownload needs a mock too
            const mockRequestInit = new EventEmitter() as any;
            mockRequestInit.end = vi.fn();
            mockNet.request.mockReturnValueOnce(mockRequestInit);

            const id = downloadManager.startDownload('http://url.com', '/dl', 'file.zip');
            // Manually set state to paused to simulate resumption
            const dl = downloadManager.getDownloads().find(d => d.id === id);
            if (dl) {
                dl.state = 'paused';
                dl.receivedBytes = 50;
            }

            const mockRequestResume = new EventEmitter() as any;
            mockRequestResume.end = vi.fn();
            mockNet.request.mockReturnValueOnce(mockRequestResume);

            downloadManager.resumeDownload(id);

            expect(mockNet.request).toHaveBeenCalledWith(expect.objectContaining({
                headers: expect.objectContaining({ 'Range': 'bytes=50-' })
            }));

            // Verify state update on response
            const mockResponse = new EventEmitter() as any;
            mockResponse.statusCode = 206;
            mockResponse.headers = {};
            mockRequestResume.emit('response', mockResponse);

            expect(dl?.state).toBe('progressing');
        });

        it('should handle 301 Permanent Redirect', () => {
             const mockRequest1 = new EventEmitter() as any;
             mockRequest1.end = vi.fn();
             mockRequest1.abort = vi.fn();

             const mockResponse1 = new EventEmitter() as any;
             mockResponse1.statusCode = 301;
             mockResponse1.headers = { location: 'http://new.com/file.zip' };

             const mockRequest2 = new EventEmitter() as any;
             mockRequest2.end = vi.fn();

             mockNet.request
                 .mockReturnValueOnce(mockRequest1)
                 .mockReturnValueOnce(mockRequest2);

             downloadManager.startDownload('http://url.com', '/dl', 'file.zip');

             mockRequest1.emit('response', mockResponse1);

             expect(mockNet.request).toHaveBeenCalledTimes(2);
             expect(mockNet.request).toHaveBeenLastCalledWith(expect.objectContaining({
                 url: 'http://new.com/file.zip'
             }));
        });
    });

    // --- ModManager ---
    describe('ModManager Branches', () => {
        let modManager: ModManager;

        beforeEach(() => {
             vi.clearAllMocks();
             mockApp.isPackaged = false;
             modManager = new ModManager();
        });

        it('should use correct path when app.isPackaged is true', async () => {
             mockApp.isPackaged = true;
             // Re-instantiate to pick up isPackaged
             modManager = new ModManager();

             // Ensure Mods Dir
             await modManager.ensureModsDir();

             // Expected path relative to exe: ../Mods
             // Exe: /app/dist-electron/electron.exe
             // Dirname: /app/dist-electron
             // ../Mods: /app/Mods
             // Path join behavior might vary in test env, but let's check if it calls mkdir with something containing Mods
             expect(mockFs.mkdir).toHaveBeenCalledWith(expect.stringMatching(/Mods$/), expect.any(Object));
        });

        it('should ignore non-mod files during deployment', async () => {
             mockFs.readFile.mockResolvedValue(JSON.stringify({ gamePath: '/game' }));

             // Mock readdir for recursive getAllFiles
             mockFs.readdir.mockImplementation(async (dir: string) => {
                 if (dir.endsWith('mod1')) return ['readme.txt', 'mod.pak'];
                 return [];
             });

             mockFs.stat.mockResolvedValue({
                 isDirectory: () => false,
                 size: 100
             } as any);

             const mod = {
                 id: '1',
                 name: 'Mod1',
                 folderPath: '/mods/mod1',
                 priority: 1,
                 isEnabled: true
             };

             await modManager.deployMod(mod as any);

             // Expect .pak to be linked
             expect(mockFs.link).toHaveBeenCalledWith(
                 expect.stringMatching(/mod\.pak$/),
                 expect.stringMatching(/001_mod\.pak$/)
             );

             // Expect .txt NOT to be linked
             expect(mockFs.link).not.toHaveBeenCalledWith(
                 expect.stringMatching(/readme\.txt$/),
                 expect.any(String)
             );
        });

        it('should handle calculateFolderSize error', async () => {
             mockFs.readdir.mockRejectedValue(new Error('Access Denied'));
             const size = await modManager.calculateFolderSize('/root');
             expect(size).toBe(0);
        });
    });
});
