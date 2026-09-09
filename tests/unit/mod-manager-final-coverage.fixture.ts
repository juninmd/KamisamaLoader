import { vi } from 'vitest';
import { app, shell } from 'electron';
vi.mock('fs/promises');
vi.mock('electron', () => ({
    app: {
        getPath: vi.fn().mockReturnValue('/mock/path'),
        isPackaged: false
    },
    shell: {
        openPath: vi.fn().mockResolvedValue('')
    },
    net: { request: vi.fn() }
}));
vi.mock('adm-zip');
vi.mock('child_process', () => ({
    execFile: vi.fn()
}));
vi.mock('../../electron/gamebanana.js', () => ({
    fetchModProfile: vi.fn(),
    fetchModDetails: vi.fn()
}));
