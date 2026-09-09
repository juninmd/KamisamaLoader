import './coverage-backend-gaps.fixture';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';
describe('Backend Coverage Gaps', () => {
    let mm: ModManager;
    beforeEach(() => {
        vi.clearAllMocks();
        mm = new ModManager();
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });
    it('fixPriorities: resolves ties by name', async () => {
        const mods = [
            { id: '1', name: 'B_Mod', priority: 1, isEnabled: true },
            { id: '2', name: 'A_Mod', priority: 1, isEnabled: true }
        ];
        (fs.readFile as any).mockResolvedValue(JSON.stringify(mods));
        (fs.writeFile as any).mockResolvedValue(undefined);
        mm.undeployMod = vi.fn().mockResolvedValue(true);
        mm.deployMod = vi.fn().mockResolvedValue(true);
        await mm.fixPriorities();
        expect(fs.writeFile).toHaveBeenCalled();
        const callArgs = (fs.writeFile as any).mock.calls[0][1];
        const savedMods = JSON.parse(callArgs);
        const modA = savedMods.find((m: any) => m.name === 'A_Mod');
        const modB = savedMods.find((m: any) => m.name === 'B_Mod');
        expect(modA.priority).toBe(2);
        expect(modB.priority).toBe(1);
    });
});
describe('Backend Coverage Gaps', () => {
    let mm: ModManager;
    beforeEach(() => {
        vi.clearAllMocks();
        mm = new ModManager();
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });
    it('deployMod: handles non-EXDEV link errors', async () => {
        const mod = { id: '1', name: 'Test', folderPath: '/mods/Test' };
        (fs.readFile as any).mockResolvedValue(JSON.stringify({ gamePath: '/game' }));
        (fs.stat as any).mockResolvedValue({ isDirectory: () => false });
        (fs.readdir as any).mockResolvedValue(['file.pak']);
        (fs.link as any).mockRejectedValue(new Error('Generic Error'));
        const result = await mm.deployMod(mod as any);
        expect(result).toBe(false);
    });
});
describe('Backend Coverage Gaps', () => {
    let mm: ModManager;
    beforeEach(() => {
        vi.clearAllMocks();
        mm = new ModManager();
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });
    it('updateMod: returns false if no download manager (legacy)', async () => {
        const mmNoDm = new ModManager();
        (fs.readFile as any).mockResolvedValue(JSON.stringify([{ id: '1', latestFileUrl: 'http://test.com/file.zip' }]));
        const result = await mmNoDm.updateMod('1');
        expect(result).toBe(false);
    });
});
describe('Backend Coverage Gaps', () => {
    let mm: ModManager;
    beforeEach(() => {
        vi.clearAllMocks();
        mm = new ModManager();
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });
    it('syncActiveProfile: does nothing if no active profile', async () => {
        (fs.readFile as any).mockResolvedValue(JSON.stringify({ activeProfileId: null }));
        await (mm as any).syncActiveProfile('1', true);
        expect(fs.writeFile).not.toHaveBeenCalled();
    });
});
describe('Backend Coverage Gaps', () => {
    let mm: ModManager;
    beforeEach(() => {
        vi.clearAllMocks();
        mm = new ModManager();
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });
    it('loadProfile: handles error gracefully', async () => {
        (fs.readFile as any).mockRejectedValue(new Error('Read Error'));
        const result = await mm.loadProfile('1');
        expect(result.success).toBe(false);
    });
});
describe('Backend Coverage Gaps', () => {
    let mm: ModManager;
    beforeEach(() => {
        vi.clearAllMocks();
        mm = new ModManager();
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });
    it('calculateFolderSize: handles errors', async () => {
        (fs.readdir as any).mockRejectedValue(new Error('Read Error'));
        const size = await mm.calculateFolderSize('/path');
        expect(size).toBe(0);
    });
});
describe('Backend Coverage Gaps', () => {
    let mm: ModManager;
    beforeEach(() => {
        vi.clearAllMocks();
        mm = new ModManager();
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });
    it('installMod: handles zip extraction failure (Zip Error)', async () => {
        (fs.readFile as any).mockResolvedValue(Buffer.from('zipdata'));
        (fs.mkdir as any).mockResolvedValue(undefined);
        vi.spyOn(mm, 'extractZip').mockRejectedValueOnce(new Error('Zip Error'));
        const result = await mm.installMod('/path/to/fail.zip');
        expect(result.success).toBe(false);
        expect(result.message).toContain('Zip Error');
    });
});
describe('Backend Coverage Gaps', () => {
    let mm: ModManager;
    beforeEach(() => {
        vi.clearAllMocks();
        mm = new ModManager();
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });
    it('getModChangelog: handles missing mod/id', async () => {
        (fs.readFile as any).mockResolvedValue(JSON.stringify([]));
        const result = await mm.getModChangelog('non-existent');
        expect(result).toBeNull();
    });
});
