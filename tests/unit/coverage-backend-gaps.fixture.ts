import { vi } from 'vitest';
import { app, shell } from 'electron';
vi.mock('fs/promises');
vi.mock('electron', () => ({
    app: {
        getPath: vi.fn().mockReturnValue('/tmp'),
        isPackaged: false
    },
    net: { request: vi.fn() },
    shell: { openPath: vi.fn() }
}));
vi.mock('adm-zip', () => {
    return {
        default: class {
            getEntries() { return []; }
            extractAllToAsync(dest: any, overwrite: any, keep: any, cb: any) {
                if (dest && dest.includes('fail')) {
                    cb(new Error('Zip Error'));
                }
                else {
                    cb(null);
                }
            }
        }
    };
});
vi.mock('child_process', () => ({
    execFile: vi.fn((cmd, args, opts, cb) => {
        if (cmd.includes('fail'))
            cb(new Error('Exec Error'));
        else
            cb(null);
    })
}));
vi.mock('../../electron/gamebanana', async () => {
    const actual = await vi.importActual('../../electron/gamebanana');
    return {
        ...actual,
        getAPICache: () => ({ get: vi.fn(), set: vi.fn() }),
        fetchModProfile: vi.fn(),
        searchOnlineMods: vi.fn()
    };
});
