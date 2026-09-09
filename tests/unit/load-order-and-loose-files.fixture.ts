import { vi } from 'vitest';
import path from 'path';
vi.mock('child_process', () => {
    const execFileMock = vi.fn();
    return { execFile: execFileMock, default: { execFile: execFileMock } };
});
vi.mock('electron', () => ({
    app: {
        getPath: vi.fn((name) => name === 'exe' ? '/app/exe' : '/tmp'),
        isPackaged: false,
    },
    net: { request: vi.fn() },
    shell: { openPath: vi.fn() }
}));
vi.mock('fs/promises', () => ({
    default: {
        readFile: vi.fn(),
        writeFile: vi.fn(),
        mkdir: vi.fn(),
        stat: vi.fn(),
        unlink: vi.fn(),
        readdir: vi.fn(),
        access: vi.fn(),
        link: vi.fn(),
        copyFile: vi.fn(),
    }
}));
vi.mock('fs', () => {
    const createWriteStream = vi.fn();
    return { createWriteStream, default: { createWriteStream } };
});
vi.mock('../../electron/gamebanana', () => ({
    fetchModProfile: vi.fn(),
    searchOnlineMods: vi.fn(),
    getModChangelog: vi.fn(),
    fetchModDetails: vi.fn()
}));
vi.mock('../../electron/github', () => ({ fetchLatestRelease: vi.fn() }));
const GAME_PATH = '/game';
const CONTENT_DIR = path.join(GAME_PATH, 'SparkingZERO', 'Content');
const PAKS_DIR = path.join(CONTENT_DIR, 'Paks', '~mods');
export { GAME_PATH, CONTENT_DIR, PAKS_DIR };
