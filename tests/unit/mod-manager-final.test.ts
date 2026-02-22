import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';

// Hoist mocks
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/app-data'),
    isPackaged: false
  },
  shell: { openPath: vi.fn() },
  net: { request: vi.fn() }
}));

vi.mock('fs/promises', async () => {
  return {
    default: {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      mkdir: vi.fn(),
      stat: vi.fn(),
      access: vi.fn(),
      rm: vi.fn(),
      cp: vi.fn(),
      unlink: vi.fn()
    }
  };
});

vi.mock('child_process', () => ({
  execFile: vi.fn()
}));

vi.mock('../../electron/github.js', () => ({
  fetchLatestRelease: vi.fn()
}));

// Import after mocks
import { ModManager } from '../../electron/mod-manager.js';
import fs from 'fs/promises';
import { execFile } from 'child_process';
import { fetchLatestRelease } from '../../electron/github.js';

describe('ModManager Final Gaps', () => {
  let modManager: ModManager;

  beforeEach(() => {
    vi.clearAllMocks();
    modManager = new ModManager();
    // Mock ensureModsDir
    vi.spyOn(modManager as any, 'ensureModsDir').mockResolvedValue('/mods');
    // Mock getSettings to return a valid path
    vi.spyOn(modManager, 'getSettings').mockResolvedValue({
      gamePath: '/game/SparkingZERO.exe'
    });
  });

  describe('launchGame', () => {
    it('should handle execFile error callback', async () => {
      // Setup fs.stat to confirm exe is a file
      (fs.stat as any).mockResolvedValue({ isDirectory: () => false });

      // Mock execFile to call callback with error
      (execFile as any).mockImplementation((file: string, args: string[], options: any, cb: any) => {
        cb(new Error('Launch failed'));
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await modManager.launchGame();

      expect(execFile).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to launch game:', expect.any(Error));
    });
  });

  describe('installUE4SS', () => {
    it('should return failure if fetchLatestRelease returns null', async () => {
        // Mock binaries dir resolution
        // We need getSettings to return a path that resolves correctly.
        // resolveGamePaths uses path.join and assumes structure.
        // If gamePath is /game/SparkingZERO.exe
        // root -> /game
        // binariesDir -> /game/SparkingZERO/Binaries/Win64

        // Mock mkdir to succeed
        (fs.mkdir as any).mockResolvedValue(undefined);

        // Mock fetchLatestRelease to fail
        (fetchLatestRelease as any).mockResolvedValue(null);

        const result = await modManager.installUE4SS();

        expect(result).toEqual({ success: false, message: 'Failed to fetch UE4SS release.' });
    });
  });
});
