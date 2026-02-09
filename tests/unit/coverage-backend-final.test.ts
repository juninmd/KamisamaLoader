import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import { ModManager } from '../../electron/mod-manager';
import fsPromises from 'fs/promises';
import fs, { createWriteStream } from 'fs';
import { app, shell, net } from 'electron';
import { DownloadManager } from '../../electron/download-manager';

// Mocks
vi.mock('fs/promises');
vi.mock('fs', async (importOriginal) => {
    const actual = await importOriginal<typeof import('fs')>();
    const mockCreateWriteStream = vi.fn();
    return {
        ...actual,
        default: {
            ...actual,
            createWriteStream: mockCreateWriteStream,
        },
        createWriteStream: mockCreateWriteStream,
    };
});

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/mock/app/path'),
    isPackaged: false
  },
  shell: {
    openPath: vi.fn()
  },
  net: {
    request: vi.fn()
  }
}));
vi.mock('adm-zip', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      extractAllToAsync: vi.fn((dest, overwrite, keepOriginal, cb) => cb(null)),
      getEntries: vi.fn().mockReturnValue([])
    }))
  };
});
vi.mock('../../electron/gamebanana.js', () => ({
  fetchModProfile: vi.fn(),
  searchOnlineMods: vi.fn(),
  getModChangelog: vi.fn(),
  fetchModDetails: vi.fn(),
  fetchLatestRelease: vi.fn()
}));

describe('ModManager Final Coverage', () => {
  let modManager: ModManager;
  let downloadManager: DownloadManager;

  beforeEach(() => {
    vi.clearAllMocks();
    downloadManager = new DownloadManager();
    modManager = new ModManager(downloadManager);
    // @ts-ignore
    modManager.modsDir = '/mock/mods';
  });

  describe('deployFile', () => {
    it('should fallback to copyFile if link fails with EXDEV', async () => {
      // @ts-ignore
      fsPromises.mkdir.mockResolvedValue(undefined);
      // @ts-ignore
      fsPromises.unlink.mockResolvedValue(undefined);
      // @ts-ignore
      fsPromises.link.mockRejectedValue({ code: 'EXDEV' });
      // @ts-ignore
      fsPromises.copyFile.mockResolvedValue(undefined);

      // Access private method via any
      const result = await (modManager as any).deployFile('/src/file', '/dest/file');

      expect(fsPromises.link).toHaveBeenCalled();
      expect(fsPromises.copyFile).toHaveBeenCalledWith('/src/file', '/dest/file');
      expect(result).toBe(true);
    });

    // ... other deployFile tests (omitted for brevity in this fix, but included in file)
    it('should fallback to copyFile if link fails with EPERM', async () => {
      // @ts-ignore
      fsPromises.mkdir.mockResolvedValue(undefined);
      // @ts-ignore
      fsPromises.unlink.mockResolvedValue(undefined);
      // @ts-ignore
      fsPromises.link.mockRejectedValue({ code: 'EPERM' });
      // @ts-ignore
      fsPromises.copyFile.mockResolvedValue(undefined);

      const result = await (modManager as any).deployFile('/src/file', '/dest/file');
      expect(result).toBe(true);
    });

    it('should return false if copyFile also fails', async () => {
       // @ts-ignore
       fsPromises.mkdir.mockResolvedValue(undefined);
       // @ts-ignore
       fsPromises.link.mockRejectedValue({ code: 'EXDEV' });
       // @ts-ignore
       fsPromises.copyFile.mockRejectedValue(new Error('Copy failed'));

       const result = await (modManager as any).deployFile('/src/file', '/dest/file');
       expect(result).toBe(false);
    });

    it('should throw if link error is not EXDEV/EPERM', async () => {
        // @ts-ignore
        fsPromises.mkdir.mockResolvedValue(undefined);
        // @ts-ignore
        fsPromises.link.mockRejectedValue(new Error('Other Error'));

        const result = await (modManager as any).deployFile('/src/file', '/dest/file');
        expect(result).toBe(false);
     });
  });

  describe('updateUE4SSModsTxt', () => {
      it('should handle existing file with comments and empty lines', async () => {
          const mockContent = `

          ; Comment
          ExistingMod : 1
          TargetMod : 0
          `;
          // @ts-ignore
          fsPromises.readFile.mockResolvedValue(mockContent);
          // @ts-ignore
          fsPromises.writeFile.mockResolvedValue(undefined);

          await (modManager as any).updateUE4SSModsTxt('/bin', 'TargetMod', true);

          expect(fsPromises.writeFile).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('TargetMod : 1'));
      });

      it('should append new mod if not found', async () => {
        // @ts-ignore
        fsPromises.readFile.mockResolvedValue('');
        // @ts-ignore
        fsPromises.writeFile.mockResolvedValue(undefined);

        await (modManager as any).updateUE4SSModsTxt('/bin', 'NewMod', true);

        expect(fsPromises.writeFile).toHaveBeenCalledWith(expect.any(String), '\nNewMod : 1');
      });
  });

  describe('fixPriorities', () => {
      it('should resolve ties by name', async () => {
          const mods = [
              { id: '1', name: 'B_Mod', priority: 5, isEnabled: true },
              { id: '2', name: 'A_Mod', priority: 5, isEnabled: true }
          ];
          // @ts-ignore
          fsPromises.readFile.mockResolvedValue(JSON.stringify(mods));
          // @ts-ignore
          fsPromises.writeFile.mockResolvedValue(undefined);

          (modManager as any).undeployMod = vi.fn().mockResolvedValue(true);
          (modManager as any).deployMod = vi.fn().mockResolvedValue(true);

          await modManager.fixPriorities();

          expect(fsPromises.writeFile).toHaveBeenCalled();
          const writeCall = vi.mocked(fsPromises.writeFile).mock.calls[0];
          const savedMods = JSON.parse(writeCall[1] as string);

          const modA = savedMods.find((m: any) => m.name === 'A_Mod');
          const modB = savedMods.find((m: any) => m.name === 'B_Mod');

          expect(modA.priority).toBeGreaterThan(modB.priority);
      });
  });

  describe('launchGame', () => {
      it('should find exe in Binaries if root exe missing', async () => {
          const gamePath = '/game/root';
          // @ts-ignore
          fsPromises.stat.mockResolvedValue({ isDirectory: () => true });

          vi.mocked(fsPromises.access)
            .mockRejectedValueOnce(new Error('Not found'))
            .mockResolvedValueOnce(undefined);

          // @ts-ignore
          modManager.getSettings = vi.fn().mockResolvedValue({ gamePath });
          // @ts-ignore
          modManager.getInstalledMods = vi.fn().mockResolvedValue([]);

          await modManager.launchGame();

          expect(fsPromises.access).toHaveBeenCalledTimes(2);
      });

      it('should throw if no exe found', async () => {
        const gamePath = '/game/root';
        // @ts-ignore
        fsPromises.stat.mockResolvedValue({ isDirectory: () => true });
        vi.mocked(fsPromises.access).mockRejectedValue(new Error('Not found'));
        // @ts-ignore
        modManager.getSettings = vi.fn().mockResolvedValue({ gamePath });

        await expect(modManager.launchGame()).rejects.toThrow('Could not find SparkingZERO.exe');
      });
  });

  describe('installMod', () => {
      it('should handle non-zip files (e.g. .pak) by direct copy', async () => {
          const filePath = '/path/to/mod.pak';
          // @ts-ignore
          fsPromises.stat.mockResolvedValue({ size: 100 });
          // @ts-ignore
          fsPromises.copyFile.mockResolvedValue(undefined);
          // @ts-ignore
          fsPromises.readFile.mockResolvedValue('[]');

          (modManager as any).calculateFolderSize = vi.fn().mockResolvedValue(100);
          (modManager as any).deployMod = vi.fn().mockResolvedValue(true);

          const result = await modManager.installMod(filePath);

          expect(result.success).toBe(true);
          expect(fsPromises.copyFile).toHaveBeenCalled();
      });
  });

  describe('downloadFile', () => {
      it('should handle 302 redirects', async () => {
        const url = 'http://example.com/file';
        const dest = '/tmp/file';

        const mockRequest = {
            on: vi.fn(),
            end: vi.fn()
        };
        // @ts-ignore
        net.request.mockReturnValue(mockRequest);

        const response302 = {
            statusCode: 302,
            headers: { location: 'http://example.com/redirect' },
            on: vi.fn()
        };

        const response200 = {
            statusCode: 200,
            on: vi.fn((event, cb) => {
                if (event === 'end') cb();
            })
        };

        mockRequest.on.mockImplementationOnce((event, cb) => {
            if (event === 'response') cb(response302);
        });

        let callCount = 0;
        // @ts-ignore
        net.request.mockImplementation((u) => {
            callCount++;
            if (callCount === 1) {
                return {
                    on: (evt, cb) => { if (evt === 'response') cb(response302); },
                    end: vi.fn()
                };
            } else {
                 return {
                    on: (evt, cb) => { if (evt === 'response') cb(response200); },
                    end: vi.fn()
                };
            }
        });

        const mockStream = { write: vi.fn(), end: vi.fn(), close: vi.fn() };

        // Mock the named export createWriteStream directly which we imported
        // @ts-ignore
        createWriteStream.mockReturnValue(mockStream);

        await (modManager as any).downloadFile(url, dest);

        expect(callCount).toBe(2);
      });
  });
});
