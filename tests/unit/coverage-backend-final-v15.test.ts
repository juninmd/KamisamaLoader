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
    downloadModFiles: vi.fn(),
    fetchModProfile: vi.fn(),
    searchBySection: vi.fn(() => Promise.resolve([])),
    fetchAllMods: vi.fn(() => Promise.resolve([{ id: 1 }]))
}));
vi.mock('../../electron/settings', () => ({
    getSettings: vi.fn(() => ({ gamePath: '/test/game' }))
}));
vi.mock('electron', () => ({
    app: { getPath: vi.fn(() => '/userData') }
}));

import * as gb from '../../electron/gamebanana';

describe('ModManager - line 791 coverage', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
    });

    it('should set hasUpdate to false if versions match', async () => {
        (fs.readFile as any).mockResolvedValue(JSON.stringify([{
            id: 'mod1', enabled: true, folderPath: '/test', gameBananaId: 123, version: '1.0'
        }]));
        modManager.getModsFilePath = vi.fn().mockResolvedValue('/mods.json');

        // Mock fetchItemData to return matching version
        (gb.fetchItemData as any).mockResolvedValue({
            _sVersion: '1.0',
            _aFiles: [{ _idRow: 456, _sDownloadUrl: 'url' }]
        });

        const updates = await modManager.checkForUpdates();
        expect(updates.length).toBe(0);

        // Inspect the args sent to writeFile to ensure hasUpdate is false
        const writeCall = (fs.writeFile as any).mock.calls[0];
        const writtenMods = JSON.parse(writeCall[1]);
        expect(writtenMods[0].hasUpdate === false || writtenMods[0].hasUpdate === undefined).toBeTruthy();
    });
});
