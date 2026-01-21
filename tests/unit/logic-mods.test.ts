import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';
import path from 'path';

vi.mock('child_process', () => ({
    execFile: vi.fn(),
}));

vi.mock('electron', () => ({
    app: {
        getPath: vi.fn(() => '/tmp'),
        isPackaged: false,
    },
    net: {
        request: vi.fn(),
    }
}));

vi.mock('fs/promises');
vi.mock('fs');
vi.mock('../../electron/gamebanana');

describe('ModManager - LogicMods', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
    });

    it('should deploy LogicMods to the correct directory', async () => {
        const mod = {
            id: 'test-mod',
            name: 'Test Logic Mod',
            folderPath: path.normalize('/mock/mods/TestMod'),
            isEnabled: true,
            priority: 10
        };

        // Mock settings
        modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: path.normalize('/mock/game') });

        const logicModFile = path.join(mod.folderPath, 'LogicMods', 'MyLogic.pak');
        const normalModFile = path.join(mod.folderPath, 'Normal.pak');

        (modManager as any).getAllFiles = vi.fn().mockResolvedValue([
            logicModFile,
            normalModFile
        ]);

        // Mock fs.stat to handle LogicMods dir check
        (fs.stat as any).mockImplementation(async (p: string) => {
            if (p.endsWith('LogicMods')) return { isDirectory: () => true };
            if (p.endsWith('ue4ss')) throw new Error('Not found');
            return { isDirectory: () => false, size: 100 };
        });

        // Mock mkdir and copyFile
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.copyFile as any).mockResolvedValue(undefined);

        const success = await modManager.deployMod(mod);

        expect(success).toBe(true);

        // Check if LogicMods file went to LogicMods dir
        // Expected LogicMods dir: /mock/game/SparkingZERO/Content/Paks/LogicMods
        const expectedLogicDest = path.join(path.normalize('/mock/game/SparkingZERO/Content/Paks/LogicMods'), 'MyLogic.pak');

        // We need to check if one of the calls matches
        // fs.copyFile(src, dest)

        const copyCalls = (fs.copyFile as any).mock.calls;

        const logicCall = copyCalls.find((call: any[]) => call[0] === logicModFile);
        expect(logicCall).toBeDefined();
        expect(logicCall[1]).toBe(expectedLogicDest);

        // Check if Normal file went to ~mods dir
        const expectedNormalDest = path.join(path.normalize('/mock/game/SparkingZERO/Content/Paks/~mods'), '010_Normal.pak');
        const normalCall = copyCalls.find((call: any[]) => call[0] === normalModFile);
        expect(normalCall).toBeDefined();
        expect(normalCall[1]).toBe(expectedNormalDest);
    });
});
