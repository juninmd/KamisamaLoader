import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import AdmZip from 'adm-zip';
import fs from 'fs/promises';

vi.mock('adm-zip', () => {
    const MockAdmZip = vi.fn(function() {
        return {
            addLocalFile: vi.fn(),
            writeZip: vi.fn((path, callback) => callback(null)),
            getEntries: vi.fn().mockReturnValue([
                { name: 'mods.json', isDirectory: false },
                { name: 'settings.json', isDirectory: false },
                { name: 'random.txt', isDirectory: false }
            ]),
            readAsText: vi.fn((entry) => `{"mock": "${entry.name}"}`)
        };
    });
    return { default: MockAdmZip };
});

vi.mock('fs/promises', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...(actual as any),
        default: {
            mkdir: vi.fn().mockResolvedValue(undefined),
            writeFile: vi.fn().mockResolvedValue(undefined),
            readFile: vi.fn().mockResolvedValue(JSON.stringify([])),
            stat: vi.fn().mockResolvedValue({ isDirectory: () => true })
        },
        mkdir: vi.fn().mockResolvedValue(undefined),
        writeFile: vi.fn().mockResolvedValue(undefined),
        readFile: vi.fn().mockResolvedValue(JSON.stringify([])),
        stat: vi.fn().mockResolvedValue({ isDirectory: () => true })
    }
});

vi.mock('electron', () => ({
  app: { getPath: vi.fn().mockReturnValue('/mock/app/path'), isPackaged: false }
}));

describe('Cloud Sync (Export / Import)', () => {
  let modManager: ModManager;

  beforeEach(() => {
    vi.clearAllMocks();
    modManager = new ModManager();
    vi.spyOn(modManager, 'ensureModsDir').mockResolvedValue('/mock/mods');
    vi.spyOn(modManager as any, 'getProfilesFilePath').mockResolvedValue('/mock/mods/profiles.json');
    vi.spyOn(modManager as any, 'getModsFilePath').mockResolvedValue('/mock/mods/mods.json');
    vi.spyOn(modManager, 'fixPriorities').mockResolvedValue(undefined);
  });

  it('should export settings, profiles and mods successfully', async () => {
      const result = await modManager.exportCloudSync('/test/export.zip');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Exported successfully.');
  });

  it('should handle export failures gracefully', async () => {
      vi.spyOn(modManager as any, 'getProfilesFilePath').mockRejectedValue(new Error('path error'));
      const result = await modManager.exportCloudSync('/test/export.zip');
      expect(result.success).toBe(false);
  });

  it('should import specific json files safely', async () => {
      const result = await modManager.importCloudSync('/test/import.zip');
      expect(result.success).toBe(true);
      expect(result.message).toContain('Imported successfully');

      // Ensure only allowed files were written (mods.json and settings.json were in the mock entries)
      expect(fs.writeFile).toHaveBeenCalledWith('/mock/mods/mods.json', '{"mock": "mods.json"}', 'utf-8');

      // random.txt should NOT have been written
      const writes = vi.mocked(fs.writeFile).mock.calls;
      const wroteRandom = writes.some(call => typeof call[0] === 'string' && call[0].includes('random.txt'));
      expect(wroteRandom).toBe(false);
  });

  it('should handle import extraction failure', async () => {
    vi.mocked(AdmZip).mockImplementationOnce(function() {
        throw new Error('extract fail');
    });
    const result = await modManager.importCloudSync('/test/import.zip');
    expect(result.success).toBe(false);
    expect(result.message).toBe('extract fail');
  });
});
