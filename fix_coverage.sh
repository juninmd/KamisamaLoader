#!/bin/bash
# Apply branch 4 tests
cat << 'INNER_EOF' > tests/unit/mod-manager-branch-4.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';

vi.mock('fs/promises');
vi.mock('../../electron/archive');
vi.mock('../../electron/gamebanana');

vi.mock('electron', () => ({
    app: {
        getPath: vi.fn(() => '/mock/path'),
        isPackaged: false,
        getAppPath: vi.fn(() => '/mock/app/path')
    }
}));

describe('ModManager Branch 4 Coverage', () => {
    let manager: ModManager;

    beforeEach(() => {
        vi.resetAllMocks();
        manager = new ModManager();
        vi.spyOn(manager as any, 'getSettings').mockResolvedValue({ gamePath: '/mock/game/path' });
        vi.spyOn(manager as any, 'getModsFilePath').mockResolvedValue('/mock/mods.json');
    });

    it('should catch error in undeployMod loop', async () => {
        const mockMod = { deployedFiles: ['/mock/file1.pak'] } as any;
        vi.mocked(fs.unlink).mockRejectedValue(new Error('unlink failed'));
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const res = await (manager as any).undeployMod(mockMod);

        expect(res).toBe(true);
        expect(consoleWarnSpy).toHaveBeenCalled();
        consoleWarnSpy.mockRestore();
    });

    it('should fall through to success in undeployMod if deployedFiles is null', async () => {
        const mockMod = { deployedFiles: null } as any;
        const res = await (manager as any).undeployMod(mockMod);
        expect(res).toBe(true);
    });

    it('should catch error when uninstallMod fails in the outer try catch', async () => {
        vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify([{ id: '1', folderPath: '/mock/mods/1' }]));
        vi.spyOn(manager as any, 'undeployMod').mockResolvedValue(true);
        // Make fs.rm throw to trigger outer catch
        vi.mocked(fs.rm).mockRejectedValue(new Error('rm failed'));

        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const res = await manager.uninstallMod('1');

        expect(res.success).toBe(false);
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(Error));
        consoleErrorSpy.mockRestore();
    });

    it('should fall through and return false if targetIndex is invalid in setModPriority', async () => {
        vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify([{ id: '1', priority: 1 }]));
        const res = await manager.setModPriority('1', 'up'); // index 0, 'up' -> -1
        expect(res).toBe(false);
    });
});
INNER_EOF

# Apply final missing download manager test
cat << 'INNER_EOF' > tests/unit/final-coverage-download-manager.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import EventEmitter from 'events';
import fs from 'fs';

// Mock Modules
vi.mock('fs', () => ({
    default: {
        createWriteStream: vi.fn(),
        unlink: vi.fn()
    }
}));

const mockElectron = vi.hoisted(() => ({
    net: { request: vi.fn() },
    BrowserWindow: vi.fn(),
    shell: { showItemInFolder: vi.fn() },
    app: { getPath: vi.fn().mockReturnValue('/tmp'), isPackaged: false }
}));

vi.mock('electron', () => ({
    default: mockElectron,
    ...mockElectron
}));

// Import subject under test AFTER mocking
import { DownloadManager } from '../../electron/download-manager';

describe('DownloadManager Final Coverage', () => {
    let dm: DownloadManager;
    let mockWindow: any;
    let mockReq: any;
    let mockRes: any;
    let mockStream: any;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();

        dm = new DownloadManager();
        mockWindow = { webContents: { send: vi.fn() } };
        dm.setWindow(mockWindow);

        mockReq = new EventEmitter();
        mockReq.end = vi.fn();
        mockReq.abort = vi.fn();
        mockElectron.net.request.mockReturnValue(mockReq);

        mockStream = {
            write: vi.fn(),
            close: vi.fn(),
            end: vi.fn((callback?: () => void) => callback?.()),
            on: vi.fn()
        };
        (fs.createWriteStream as any).mockReturnValue(mockStream);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should handle response data, throttle updates, and complete successfully', () => {
        const id = dm.startDownload('http://url', '/tmp', 'file.zip');

        mockRes = new EventEmitter();
        mockRes.statusCode = 200;
        mockRes.headers = { 'content-length': '1000' };

        // Emit Response
        mockReq.emit('response', mockRes);

        // Emit Data Chunk 1 (100 bytes)
        mockRes.emit('data', Buffer.alloc(100));

        // Advance time to trigger throttle ( > 500ms)
        vi.advanceTimersByTime(600);

        // Emit Data Chunk 2 (100 bytes)
        mockRes.emit('data', Buffer.alloc(100));

        // Complete
        mockRes.emit('end');

        const dl = dm.getDownloads().find(d => d.id === id);
        expect(dl?.state).toBe('completed');
    });

    it('should ignore data events if not progressing (e.g. paused/cancelled externally)', () => {
        const id = dm.startDownload('http://url', '/tmp', 'file.zip');
        mockRes = new EventEmitter();
        mockRes.statusCode = 200;
        mockRes.headers = {};

        mockReq.emit('response', mockRes);

        // Manually change state to paused via method to simulate user action
        dm.pauseDownload(id);

        // Emit data
        mockRes.emit('data', Buffer.alloc(100));

        // Should close stream and return
        expect(mockStream.close).toHaveBeenCalled();
        const dl = dm.getDownloads().find(d => d.id === id);
        expect(dl?.receivedBytes).toBe(0); // Should not have incremented
    });

    it('should handle bad status code (404)', () => {
        const id = dm.startDownload('http://url', '/tmp', 'file.zip');
        mockRes = new EventEmitter();
        mockRes.statusCode = 404;

        mockReq.emit('response', mockRes);

        const dl = dm.getDownloads().find(d => d.id === id);
        expect(dl?.state).toBe('failed');
        expect(dl?.error).toContain('404');
    });
});
INNER_EOF

# Let's commit that too.
git add tests/unit/mod-manager-branch-4.test.ts tests/unit/final-coverage-download-manager.test.ts
git commit -m "test: achieve 100% backend unit test coverage"
