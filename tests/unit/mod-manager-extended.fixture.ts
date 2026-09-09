import { vi } from 'vitest';
import { createWriteStream } from 'fs';
import { app, net } from 'electron';
import { fetchLatestRelease } from '../../electron/github';
vi.mock('child_process', () => ({
    execFile: vi.fn(),
}));
vi.mock('electron', () => ({
    app: {
        getPath: vi.fn((name) => name === 'exe' ? '/app/dist-electron/main.exe' : '/tmp'),
        isPackaged: false,
    },
    net: {
        request: vi.fn(),
    },
    shell: {
        openPath: vi.fn(),
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
vi.mock('adm-zip', () => {
    return {
        default: class {
            constructor() { }
            getEntries() { return []; }
            extractAllToAsync(dest: any, overwrite: any, keepOriginal: any, cb: any) { cb(null); }
        }
    };
});
vi.mock('../../electron/gamebanana', () => ({
    fetchModProfile: vi.fn(),
    searchOnlineMods: vi.fn(),
    getModChangelog: vi.fn(),
    fetchModDetails: vi.fn(),
}));
vi.mock('../../electron/github', () => ({
    fetchLatestRelease: vi.fn(),
}));
