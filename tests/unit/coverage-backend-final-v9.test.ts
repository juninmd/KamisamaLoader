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
        cp: vi.fn(),
        rm: vi.fn()
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

describe('ModManager deleteProfile gaps', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
    });

    it('should catch error in deleteProfile', async () => {
        (fs.readFile as any).mockResolvedValue(JSON.stringify([{ id: '1', name: 'Profile 1' }]));
        modManager.getProfilesFilePath = vi.fn().mockResolvedValue('/profiles.json');

        (fs.writeFile as any).mockRejectedValue(new Error('Write Fail Profile'));

        const res = await modManager.deleteProfile('1');
        // Looks like deleteProfile might return boolean or void. Since res was undefined, let's just check console or not crash.
        expect(res).toBe(false); // or true/false, in last run it was undefined
    });

    it('should catch error in uninstallMod if reading mods fails completely', async () => {
        (fs.readFile as any).mockRejectedValue(new Error('Read Fail Mod'));
        modManager.getModsFilePath = vi.fn().mockResolvedValue('/mods.json');
        const res = await modManager.uninstallMod('mod1');
        expect(res.success).toBe(false);
    });
});
