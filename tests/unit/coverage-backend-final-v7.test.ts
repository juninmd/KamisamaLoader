import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';

vi.mock('fs/promises', () => ({
    default: {
        readFile: vi.fn(),
        writeFile: vi.fn(),
        unlink: vi.fn(),
        readdir: vi.fn(),
        mkdir: vi.fn(),
        cp: vi.fn()
    }
}));
vi.mock('../../electron/gamebanana', () => ({
    getModDetails: vi.fn(),
    fetchItemData: vi.fn(),
    downloadModFiles: vi.fn()
}));
vi.mock('../../electron/settings', () => ({
    getSettings: vi.fn(() => ({ gamePath: '/test/game' }))
}));
vi.mock('electron', () => ({
    app: { getPath: vi.fn(() => '/userData') }
}));

const mockAddLocalFile = vi.fn();
const mockWriteZip = vi.fn();

vi.mock('adm-zip', () => {
    return {
        default: vi.fn(function() {
            return {
                addLocalFile: mockAddLocalFile,
                writeZip: mockWriteZip,
                getEntries: vi.fn(),
                readAsText: vi.fn()
            };
        })
    };
});

describe('ModManager Backup/Migrate Gaps Part 2', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
    });

    it('should catch error when toggleMod fails to update mods.json', async () => {
        (fs.readFile as any).mockResolvedValue(JSON.stringify([
            { id: 'mod1', name: 'Test', enabled: true, folderPath: '/test' }
        ]));

        modManager.getModsFilePath = vi.fn().mockResolvedValue('/mods.json');
        modManager.undeployMod = vi.fn().mockResolvedValue(true);
        (fs.writeFile as any).mockRejectedValue(new Error('Write Failure'));

        const result = await modManager.toggleMod('mod1', false);
        expect(result.success).toBe(false);
    });

    it('should handle exportCloudSync warning when addLocalFile fails', async () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        mockAddLocalFile.mockImplementation(() => {
            throw new Error('Not found');
        });

        mockWriteZip.mockImplementation((path, cb) => {
            cb(null);
        });

        await modManager.exportCloudSync('/dest.zip');
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Could not add profiles.json'), expect.any(Error));
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Could not add mods.json'), expect.any(Error));
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Could not add settings.json'), expect.any(Error));
    });

    it('should resolve exportCloudSync error if writeZip calls callback with error', async () => {
        mockAddLocalFile.mockImplementation(() => {});
        mockWriteZip.mockImplementation((path, cb) => {
            cb(new Error('Write zip failed'));
        });

        const res = await modManager.exportCloudSync('/dest.zip');
        expect(res.success).toBe(false);
    });
});
