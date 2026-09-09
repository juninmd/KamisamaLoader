import { vi } from 'vitest';
import { execFile } from 'child_process';
import path from 'path';
vi.mock('child_process', () => {
    const execFileMock = vi.fn((path, args, opts, cb) => {
        if (typeof opts === 'function') {
            cb = opts;
            opts = {};
        }
        if (cb)
            cb(null);
    });
    return {
        execFile: execFileMock,
        default: { execFile: execFileMock }
    };
});
vi.mock('electron', () => ({
    app: {
        getPath: vi.fn((name) => name === 'exe' ? '/app/exe' : '/tmp'),
        isPackaged: false,
    },
    net: {
        request: vi.fn(),
    },
    shell: {
        openPath: vi.fn()
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
        rename: vi.fn(),
        rmdir: vi.fn(),
        cp: vi.fn(),
        access: vi.fn(),
        link: vi.fn(),
        copyFile: vi.fn(),
    }
}));
vi.mock('fs', () => {
    const createWriteStream = vi.fn();
    return {
        createWriteStream,
        default: { createWriteStream }
    };
});
vi.mock('../../electron/gamebanana', () => ({
    fetchModProfile: vi.fn(),
    searchOnlineMods: vi.fn(),
    getModChangelog: vi.fn(),
    fetchModDetails: vi.fn(),
    fetchLatestRelease: vi.fn()
}));
vi.mock('../../electron/github', () => ({
    fetchLatestRelease: vi.fn()
}));
vi.mock('adm-zip', () => {
    return {
        default: class {
            constructor() { }
            extractAllTo = vi.fn();
            getEntries = vi.fn(() => []);
            extractAllToAsync = vi.fn((dest, overwrite, keepPerms, cb) => {
                if (cb)
                    cb(null);
            });
        }
    };
});
const mockDownloadManager = {
    startDownload: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
    failDownload: vi.fn()
};
export { mockDownloadManager };
