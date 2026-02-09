import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fsPromises from 'fs/promises';
import { app } from 'electron';
import path from 'path';

// Mocks
vi.mock('fs/promises');
vi.mock('fs', () => ({
    createWriteStream: vi.fn(),
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    default: {
        createWriteStream: vi.fn(),
        mkdir: vi.fn(),
        unlink: vi.fn(),
        link: vi.fn(),
        copyFile: vi.fn(),
        readFile: vi.fn(),
        writeFile: vi.fn(),
        stat: vi.fn(),
        access: vi.fn(),
        readdir: vi.fn(),
        rm: vi.fn(),
        cp: vi.fn()
    }
}));

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

// Use hoisted mock variable
const mockAdmZip = vi.hoisted(() => {
    return {
        default: vi.fn().mockImplementation(() => ({
            extractAllToAsync: vi.fn((dest, overwrite, keep, cb) => cb(null)),
            getEntries: vi.fn().mockReturnValue([])
        }))
    };
});

vi.mock('adm-zip', () => mockAdmZip);

// Mock GameBanana module locally to avoid import issues
vi.mock('../../electron/gamebanana.js', () => ({
    fetchModProfile: vi.fn(),
    searchOnlineMods: vi.fn(),
    getModChangelog: vi.fn(),
    fetchModDetails: vi.fn(),
    fetchLatestRelease: vi.fn()
}));

describe('ModManager Edge Cases Extended', () => {
  let modManager: ModManager;

  beforeEach(() => {
    vi.clearAllMocks();
    modManager = new ModManager();
    // @ts-ignore
    modManager.modsDir = '/mock/mods';
  });

  describe('toggleMod', () => {
      it('should detect conflicts when enabling a mod', async () => {
          const mods = [
              { id: '1', name: 'Mod A', category: 'Skin', isEnabled: true },
              { id: '2', name: 'Mod B', category: 'Skin', isEnabled: false }
          ];
          // @ts-ignore
          fsPromises.readFile.mockResolvedValue(JSON.stringify(mods));
          // @ts-ignore
          fsPromises.writeFile.mockResolvedValue(undefined);
          (modManager as any).deployMod = vi.fn().mockResolvedValue(true);
          (modManager as any).syncActiveProfile = vi.fn();

          const result = await modManager.toggleMod('2', true);

          expect(result.success).toBe(true);
          expect(result.conflict).toBeDefined();
          expect(result.conflict).toContain('conflicts with "Mod A"');
      });

      it('should not detect conflicts for generic categories', async () => {
          const mods = [
              { id: '1', name: 'Mod A', category: 'UI', isEnabled: true },
              { id: '2', name: 'Mod B', category: 'UI', isEnabled: false }
          ];
          // @ts-ignore
          fsPromises.readFile.mockResolvedValue(JSON.stringify(mods));
          (modManager as any).deployMod = vi.fn().mockResolvedValue(true);
          (modManager as any).syncActiveProfile = vi.fn();

          const result = await modManager.toggleMod('2', true);

          expect(result.success).toBe(true);
          expect(result.conflict).toBeNull();
      });
  });

  describe('updateMod', () => {
      it('should return false if download manager not initialized', async () => {
          modManager = new ModManager();
          const mods = [{ id: '1', name: 'Mod', latestFileUrl: 'http://url' }];
          // @ts-ignore
          fsPromises.readFile.mockResolvedValue(JSON.stringify(mods));

          const result = await modManager.updateMod('1');
          expect(result).toBe(false);
      });
  });

  describe('installOnlineMod', () => {
      it('should use default values if profile data missing', async () => {
          const mod: any = { gameBananaId: 123 };

          // Import mocked module to set implementation
          const { fetchModProfile } = await import('../../electron/gamebanana.js');

          vi.mocked(fetchModProfile).mockResolvedValue({
              _aFiles: [{ _sDownloadUrl: 'http://url', _idRow: 1 }]
          });

          const result = await modManager.installOnlineMod(mod);

          expect(result.success).toBe(false);
          expect(result.message).toBe('Download Manager not initialized.');
          // Logic: if (!mod.name || mod.name === 'Unknown') mod.name = profile._sName;
          // If profile._sName is missing, mod.name becomes undefined.
          expect(mod.name).toBeUndefined();
      });
  });

  describe('finalizeUpdate', () => {
      it('should handle extraction errors', async () => {
          // Use the hoisted mock variable to override implementation
          mockAdmZip.default.mockImplementationOnce(() => ({
              extractAllToAsync: vi.fn((dest, overwrite, keep, cb) => cb(new Error('Zip Error')))
          }));

          const mod = { id: '1', name: 'Mod', folderPath: '/path' };
          const result = await (modManager as any).finalizeUpdate(mod, '/temp', [], '/mods.json');

          expect(result).toBe(false);
      });
  });
});
