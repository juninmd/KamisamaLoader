import { vi } from 'vitest';
const mocks = vi.hoisted(() => ({
    app: {
        getPath: vi.fn(),
        isPackaged: false
    },
    net: {
        request: vi.fn()
    },
    fs: {
        mkdir: vi.fn(),
        readFile: vi.fn(),
        writeFile: vi.fn(),
        readdir: vi.fn(),
        stat: vi.fn(),
        unlink: vi.fn(),
        rm: vi.fn(),
        copyFile: vi.fn(),
        link: vi.fn()
    },
    child_process: {
        execFile: vi.fn()
    }
}));
vi.mock('electron', () => ({
    app: mocks.app,
    net: mocks.net,
    shell: { openPath: vi.fn() }
}));
vi.mock('fs/promises', () => ({
    default: mocks.fs,
    ...mocks.fs
}));
vi.mock('child_process', () => mocks.child_process);
export { mocks };
