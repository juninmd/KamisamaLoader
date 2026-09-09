import './mod-manager-extended.fixture';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';
describe('ModManager Extended Coverage', () => {
    let modManager: ModManager;
    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
        (modManager as any).getSettings = vi.fn().mockResolvedValue({ gamePath: '/mock/game' });
    });
    describe('Additional Coverage', () => {
        it('should handle getInstalledMods read error', async () => {
            (fs.readFile as any).mockRejectedValue(new Error('Fail'));
            const mods = await modManager.getInstalledMods();
            expect(mods).toEqual([]);
        });
    });
});
