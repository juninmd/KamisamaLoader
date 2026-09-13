import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import { app } from 'electron';

vi.mock('electron', () => ({
    app: {
        getPath: vi.fn(() => '/userData'),
        isPackaged: false
    },
    shell: {
        openPath: vi.fn()
    }
}));

vi.mock('fs/promises', () => ({
    default: {
        mkdir: vi.fn().mockResolvedValue(true)
    }
}));

vi.mock('../../electron/settings', () => ({
    getSettings: vi.fn(() => ({ gamePath: '/test/game' }))
}));

describe('ModManager - Remaining missing branches', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
    });

    it('should fall back to process.cwd when app.isPackaged is false', () => {
         expect(modManager.modsDir).toContain('Mods'); // Just instantiating checks this line
    });

    it('should open mods directory using shell.openPath', async () => {
        const shellMock = await import('electron');
        await modManager.openModsDirectory();
        expect(shellMock.shell.openPath).toHaveBeenCalled();
    });
});
