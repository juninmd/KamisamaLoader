import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';

vi.mock('electron', () => ({
    app: {
        getPath: vi.fn(() => '/userData'),
        isPackaged: false
    }
}));

vi.mock('../../electron/settings', () => ({
    getSettings: vi.fn(() => ({ gamePath: '/test/game' }))
}));

describe('ModManager - Error Handling', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
    });

    it('should catch error in undeployMod and return false', async () => {
         // To catch the error *inside* the try-catch block for iterating `deployedFiles`,
         // we can define an array that throws when iterated over.
         const mod = {
              id: 'mod1',
              name: 'Test Mod',
              deployedFiles: [] as any
         };

         // Modifying deployedFiles to look like an array but throw on iteration
         mod.deployedFiles[Symbol.iterator] = () => {
             throw new Error('Iterator broken');
         };

         const result = await modManager.undeployMod(mod as any);
         expect(result).toBe(false);
    });
});
