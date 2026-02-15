import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';
import { execFile } from 'child_process';
import path from 'path';

// Mock Modules
vi.mock('fs/promises');
vi.mock('child_process');
vi.mock('electron', () => ({
    app: { getPath: () => '/tmp', isPackaged: false },
    net: { request: vi.fn() },
    shell: { openPath: vi.fn() }
}));

describe('ModManager Backend Final Coverage', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
    });

    describe('loadProfile', () => {
        it('should correctly enable/disable mods based on profile', async () => {
            const profileId = 'prof1';
            const profiles = [{
                id: profileId,
                name: 'Test Profile',
                modIds: ['mod1', 'mod3'] // mod1 and mod3 should be enabled
            }];

            const mods = [
                { id: 'mod1', name: 'Mod 1', isEnabled: false, priority: 1 }, // Should enable
                { id: 'mod2', name: 'Mod 2', isEnabled: true, priority: 2 },  // Should disable
                { id: 'mod3', name: 'Mod 3', isEnabled: true, priority: 3 }   // Should stay enabled
            ];

            // Mock getProfiles
            vi.spyOn(modManager, 'getProfiles').mockResolvedValue(profiles);
            // Mock getModsFilePath (implicitly used by loadProfile -> reading mods)
            vi.spyOn(modManager as any, 'getModsFilePath').mockResolvedValue('/mods.json');

            // Mock fs.readFile for mods.json
            (fs.readFile as any).mockResolvedValue(JSON.stringify(mods));

            // Mock deploy/undeploy
            const deploySpy = vi.spyOn(modManager, 'deployMod').mockResolvedValue(true);
            const undeploySpy = vi.spyOn(modManager, 'undeployMod').mockResolvedValue(true);

            // Mock getSettings/saveSettings
            vi.spyOn(modManager, 'getSettings').mockResolvedValue({ gamePath: '/game' });
            const saveSettingsSpy = vi.spyOn(modManager, 'saveSettings').mockResolvedValue(true);

            // Mock fs.writeFile to avoid error
            (fs.writeFile as any).mockResolvedValue(undefined);

            const result = await modManager.loadProfile(profileId);

            expect(result.success).toBe(true);

            // Mod 1: Enabled=False, Profile=True -> Enable
            expect(deploySpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'mod1' }));

            // Mod 2: Enabled=True, Profile=False -> Disable
            expect(undeploySpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'mod2' }));

            // Mod 3: Enabled=True, Profile=True -> No Change
            expect(deploySpy).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'mod3' }));
            expect(undeploySpy).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'mod3' }));

            // Verify Settings Saved
            expect(saveSettingsSpy).toHaveBeenCalledWith(expect.objectContaining({ activeProfileId: profileId }));
        });

        it('should handle profile not found', async () => {
            vi.spyOn(modManager, 'getProfiles').mockResolvedValue([]);
            const result = await modManager.loadProfile('nop');
            expect(result.success).toBe(false);
            expect(result.message).toBe('Profile not found');
        });

        it('should handle exception during load', async () => {
            vi.spyOn(modManager, 'getProfiles').mockRejectedValue(new Error('Fail'));
            const result = await modManager.loadProfile('id');
            expect(result.success).toBe(false);
            expect(result.message).toBe('Fail');
        });
    });

    describe('launchGame Error Handling', () => {
        it('should log error if execFile fails', async () => {
            // Setup
            vi.spyOn(modManager, 'getSettings').mockResolvedValue({ gamePath: '/game.exe' });
            vi.spyOn(modManager, 'getInstalledMods').mockResolvedValue([]);
            (fs.stat as any).mockResolvedValue({ isDirectory: () => false });

            // Mock execFile to call callback with error
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            (execFile as any).mockImplementation((file, args, opts, cb) => {
                cb(new Error('Launch Failed'));
            });

            await modManager.launchGame();

            // Allow callback to execute
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(consoleSpy).toHaveBeenCalledWith('Failed to launch game:', expect.any(Error));
        });
    });

    describe('calculateFolderSize', () => {
        it('should handle errors gracefully (return 0)', async () => {
            (fs.readdir as any).mockRejectedValue(new Error('Read Error'));
            const size = await modManager.calculateFolderSize('/path');
            expect(size).toBe(0);
        });
    });
});
