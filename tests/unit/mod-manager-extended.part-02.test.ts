import './mod-manager-extended.fixture';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';
import { net } from 'electron';
import { fetchLatestRelease } from '../../electron/github';
describe('ModManager Extended Coverage', () => {
    let modManager: ModManager;
    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
        (modManager as any).getSettings = vi.fn().mockResolvedValue({ gamePath: '/mock/game' });
    });
    describe('UE4SS Installation', () => {
        it('should fail if download fails', async () => {
            (fetchLatestRelease as any).mockResolvedValue('https://github.com/release.zip');
            const mockRequest = {
                on: vi.fn((event, cb) => {
                    if (event === 'error')
                        cb(new Error('Network error'));
                }),
                end: vi.fn(),
            };
            (net.request as any).mockReturnValue(mockRequest);
            const result = await modManager.installUE4SS();
            expect(result.success).toBe(false);
        });
    });
});
describe('ModManager Extended Coverage', () => {
    let modManager: ModManager;
    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
        (modManager as any).getSettings = vi.fn().mockResolvedValue({ gamePath: '/mock/game' });
    });
    describe('Toggle Mod Conflicts', () => {
        it('should detect conflicts when enabling a mod', async () => {
            const mods = [
                { id: '1', name: 'Mod A', category: 'Skins', isEnabled: false, priority: 2 },
                { id: '2', name: 'Mod B', category: 'Skins', isEnabled: true, priority: 1 }
            ];
            (fs.readFile as any).mockResolvedValue(JSON.stringify(mods));
            (fs.writeFile as any).mockResolvedValue(undefined);
            (modManager as any).deployMod = vi.fn().mockResolvedValue(true);
            (modManager as any).undeployMod = vi.fn().mockResolvedValue(true);
            (modManager as any).syncActiveProfile = vi.fn();
            const result = await modManager.toggleMod('1', true);
            expect(result.success).toBe(true);
            expect(result.conflict).toContain('shares the category');
        });
    });
});
describe('ModManager Extended Coverage', () => {
    let modManager: ModManager;
    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
        (modManager as any).getSettings = vi.fn().mockResolvedValue({ gamePath: '/mock/game' });
    });
    describe('Fix Priorities', () => {
        it('should reassign priorities and redeploy if needed', async () => {
            const mods = [
                { id: '1', name: 'Mod A', priority: 1, isEnabled: true },
                { id: '2', name: 'Mod B', priority: 1, isEnabled: true }
            ];
            (fs.readFile as any).mockResolvedValue(JSON.stringify(mods));
            (fs.writeFile as any).mockResolvedValue(undefined);
            (modManager as any).undeployMod = vi.fn().mockResolvedValue(true);
            (modManager as any).deployMod = vi.fn().mockResolvedValue(true);
            await modManager.fixPriorities();
            expect(fs.writeFile).toHaveBeenCalled();
            expect((modManager as any).undeployMod).toHaveBeenCalledTimes(2);
        });
    });
});
describe('ModManager Extended Coverage', () => {
    let modManager: ModManager;
    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
        (modManager as any).getSettings = vi.fn().mockResolvedValue({ gamePath: '/mock/game' });
    });
    describe('Additional Coverage', () => {
        it('calculateFolderSize should return 0 on error', async () => {
            (fs.readdir as any).mockRejectedValue(new Error('Access Denied'));
            const size = await modManager.calculateFolderSize('/restricted');
            expect(size).toBe(0);
        });
    });
});
describe('ModManager Extended Coverage', () => {
    let modManager: ModManager;
    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
        (modManager as any).getSettings = vi.fn().mockResolvedValue({ gamePath: '/mock/game' });
    });
    describe('Additional Coverage', () => {
        it('uninstallMod should handle errors gracefully', async () => {
            (fs.readFile as any).mockResolvedValue(JSON.stringify([{ id: '1', folderPath: '/p' }]));
            (fs.rm as any).mockRejectedValue(new Error('Rm Fail'));
            const result = await modManager.uninstallMod('1');
            expect(result.success).toBe(false);
            expect(result.message).toContain('Rm Fail');
        });
    });
});
describe('ModManager Extended Coverage', () => {
    let modManager: ModManager;
    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
        (modManager as any).getSettings = vi.fn().mockResolvedValue({ gamePath: '/mock/game' });
    });
    describe('Additional Coverage', () => {
        it('getModsFilePath should handle ensureModsDir failure', async () => {
            (fs.mkdir as any).mockRejectedValue(new Error('Fail'));
            await modManager.getModsFilePath();
        });
    });
});
describe('ModManager Extended Coverage', () => {
    let modManager: ModManager;
    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
        (modManager as any).getSettings = vi.fn().mockResolvedValue({ gamePath: '/mock/game' });
    });
    describe('Additional Coverage', () => {
        it('updateUE4SSModsTxt should handle existing file read', async () => {
            (fs.mkdir as any).mockResolvedValue(undefined);
            (fs.readFile as any).mockResolvedValue('MyMod : 0\nOther : 1');
            (fs.writeFile as any).mockResolvedValue(undefined);
            await (modManager as any).updateUE4SSModsTxt('/bin', 'MyMod', true);
            expect(fs.writeFile).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('MyMod : 1'));
        });
    });
});
