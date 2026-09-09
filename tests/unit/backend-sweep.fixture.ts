import { vi } from 'vitest';
import { app, net } from 'electron';
vi.mock('fs/promises');
vi.mock('fs', () => {
    return {
        createWriteStream: vi.fn().mockReturnValue({
            write: vi.fn(),
            end: vi.fn((callback?: () => void) => callback?.()),
            close: vi.fn(),
            on: vi.fn((event, cb) => {
            })
        }),
        promises: {
            mkdir: vi.fn(),
            readFile: vi.fn(),
            writeFile: vi.fn(),
            unlink: vi.fn(),
            stat: vi.fn(),
            readdir: vi.fn(),
            cp: vi.fn(),
            rm: vi.fn(),
            link: vi.fn(),
            copyFile: vi.fn()
        }
    };
});
vi.mock('adm-zip', () => {
    return {
        default: vi.fn().mockImplementation(() => ({
            extractAllToAsync: vi.fn((dest, overwrite, keepOriginal, cb) => cb(null)),
            getEntries: vi.fn().mockReturnValue([])
        }))
    };
});
vi.mock('electron', () => ({
    app: {
        getPath: vi.fn().mockReturnValue('/mock/app'),
        isPackaged: false
    },
    net: {
        request: vi.fn()
    },
    shell: {
        openPath: vi.fn()
    }
}));
