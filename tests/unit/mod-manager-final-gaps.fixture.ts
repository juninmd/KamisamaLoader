import { vi } from 'vitest';
vi.mock('fs/promises', () => ({
    default: {
        mkdir: vi.fn(),
        readFile: vi.fn(),
        writeFile: vi.fn(),
        unlink: vi.fn(),
        link: vi.fn(),
        copyFile: vi.fn(),
        stat: vi.fn(),
        readdir: vi.fn(),
        rm: vi.fn(),
        cp: vi.fn(),
        access: vi.fn()
    }
}));
vi.mock('electron', () => ({
    app: {
        getPath: vi.fn().mockReturnValue('/mock/app/path'),
        isPackaged: false
    },
    net: {
        request: vi.fn().mockReturnValue({
            on: vi.fn((event, cb) => {
                if (event === 'response') {
                    cb({
                        statusCode: 200,
                        headers: {},
                        on: vi.fn((e, c) => {
                            if (e === 'end')
                                c();
                        })
                    });
                }
            }),
            end: vi.fn()
        })
    },
    shell: { openPath: vi.fn() }
}));
vi.mock('../../electron/github.js', () => ({
    fetchLatestRelease: vi.fn().mockResolvedValue('http://example.com/ue4ss.zip')
}));
vi.mock('adm-zip', () => {
    return {
        default: vi.fn(function () {
            return {
                getEntries: vi.fn(() => []),
                extractAllToAsync: vi.fn((dest, overwrite, keep, cb) => cb(null))
            };
        })
    };
});
vi.mock('fs', () => ({
    createWriteStream: vi.fn().mockReturnValue({
        write: vi.fn(),
        end: vi.fn((callback?: () => void) => callback?.()),
        close: vi.fn(),
        on: vi.fn()
    })
}));
