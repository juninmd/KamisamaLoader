import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';
import path from 'path';
vi.mock('child_process', () => ({
    execFile: vi.fn(),
    default: { execFile: vi.fn() }
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
vi.mock('fs/promises', () => ({
    default: {
        readFile: vi.fn(),
        writeFile: vi.fn(),
        mkdir: vi.fn(),
        stat: vi.fn(),
        unlink: vi.fn(),
        readdir: vi.fn(),
        rm: vi.fn(),
        cp: vi.fn(),
        access: vi.fn(),
        link: vi.fn(),
        copyFile: vi.fn(),
    }
}));
vi.mock('fs', () => ({
    createWriteStream: vi.fn(),
    default: { createWriteStream: vi.fn() }
}));
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
        modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: path.normalize('/mock/game') });
        const logicModFile = path.join(mod.folderPath, 'LogicMods', 'MyLogic.pak');
        const normalModFile = path.join(mod.folderPath, 'Normal.pak');
        (modManager as any).getAllFiles = vi.fn().mockResolvedValue([
            logicModFile,
            normalModFile
        ]);
        (fs.stat as any).mockImplementation(async (p: string) => {
            if (p.endsWith('LogicMods'))
                return { isDirectory: () => true };
            if (p.endsWith('ue4ss'))
                throw new Error('Not found');
            return { isDirectory: () => false, size: 100 };
        });
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.copyFile as any).mockResolvedValue(undefined);
        (fs.link as any).mockResolvedValue(undefined);
        (fs.unlink as any).mockResolvedValue(undefined);
        const success = await modManager.deployMod(mod as any);
        expect(success).toBe(true);
        const expectedLogicDest = path.join(path.normalize('/mock/game/SparkingZERO/Content/Paks/LogicMods'), 'MyLogic.pak');
        const linkCalls = (fs.link as any).mock.calls;
        const copyCalls = (fs.copyFile as any).mock.calls;
        const allCalls = [...linkCalls, ...copyCalls];
        const logicCall = allCalls.find((call: any[]) => call[0] === logicModFile);
        expect(logicCall).toBeDefined();
        expect(logicCall[1]).toContain(expectedLogicDest + '.kamisama-');
        expect(fs.rename).toHaveBeenCalledWith(logicCall[1], expectedLogicDest);
        const expectedNormalDest = path.join(path.normalize('/mock/game/SparkingZERO/Content/Paks/~mods'), '010_Normal.pak');
        const normalCall = allCalls.find((call: any[]) => call[0] === normalModFile);
        expect(normalCall).toBeDefined();
        expect(normalCall[1]).toContain(expectedNormalDest + '.kamisama-');
        expect(fs.rename).toHaveBeenCalledWith(normalCall[1], expectedNormalDest);
    });
});
