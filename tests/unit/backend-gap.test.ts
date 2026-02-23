import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import * as fs from 'fs/promises';
import { execFile } from 'child_process';
import * as gamebanana from '../../electron/gamebanana';

vi.mock('fs/promises');
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/mock/app/path'),
    isPackaged: false
  },
  net: { request: vi.fn() },
  shell: { openPath: vi.fn() }
}));
vi.mock('child_process', () => ({
  execFile: vi.fn()
}));
vi.mock('../../electron/gamebanana', () => ({
  fetchModDetails: vi.fn(),
  fetchLatestRelease: vi.fn(),
  fetchModUpdates: vi.fn()
}));

describe('ModManager Backend Gaps', () => {
  let modManager: ModManager;

  beforeEach(() => {
    vi.clearAllMocks();
    modManager = new ModManager();
    // Default mock implementation
    (fs.readFile as any).mockResolvedValue(JSON.stringify([]));
    (fs.stat as any).mockResolvedValue({ isDirectory: () => true });
    (fs.mkdir as any).mockResolvedValue(undefined);
  });

  it('should return false if deployMod fails (e.g. mkdir fails)', async () => {
    vi.spyOn(modManager, 'getSettings').mockResolvedValue({ gamePath: '/game/path' });
    (fs.mkdir as any).mockRejectedValueOnce(new Error('mkdir failed'));

    const mod = { id: '1', name: 'Test', folderPath: '/mods/Test', isEnabled: false };
    const result = await modManager.deployMod(mod as any);
    expect(result).toBe(false);
  });

  it('should handle undeployMod gracefully when deployedFiles is missing', async () => {
     const mod = { id: '1', deployedFiles: null };
     const result = await modManager.undeployMod(mod as any);
     expect(result).toBe(true);
  });

  it('should handle undeployMod error propagation if something catastrophic happens', async () => {
    const mod = {
        id: '1',
        deployedFiles: ['/path/to/file'],
        ue4ssModName: 'UE4SSMod'
    };

    vi.spyOn(modManager, 'getSettings').mockRejectedValue(new Error('Settings failed'));
    const result = await modManager.undeployMod(mod as any);
    expect(result).toBe(true);
  });

  it('should throw error if launchGame fails to find exe', async () => {
      vi.spyOn(modManager, 'getSettings').mockResolvedValue({ gamePath: '/game/path' });
      (fs.stat as any).mockResolvedValue({ isDirectory: () => true });
      (fs.access as any).mockRejectedValue(new Error('ENOENT'));

      await expect(modManager.launchGame()).rejects.toThrow('Could not find SparkingZERO.exe');
  });

  it('should return null if getModDetails fails', async () => {
    (gamebanana.fetchModDetails as any).mockRejectedValue(new Error('Fetch failed'));
    const result = await modManager.getModDetails(123);
    expect(result).toBeNull();
  });

  it('should return false if setModPriority fails', async () => {
    vi.spyOn(modManager, 'getModsFilePath').mockRejectedValue(new Error('Path failed'));
    const result = await modManager.setModPriority('1', 'up');
    expect(result).toBe(false);
  });
});
