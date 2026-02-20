import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';
import { app, net } from 'electron';
import { execFile } from 'child_process';
import EventEmitter from 'events';

// Mock Modules
vi.mock('electron', () => ({
    app: {
        getPath: vi.fn(() => '/tmp'),
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
        rm: vi.fn(),
        cp: vi.fn(),
        access: vi.fn(),
    }
}));

vi.mock('fs', () => ({
    createWriteStream: vi.fn(() => ({
        write: vi.fn(),
        end: vi.fn(),
        close: vi.fn(),
        on: vi.fn(),
    })),
    default: { createWriteStream: vi.fn() } // For safety
}));

vi.mock('child_process', () => ({
    execFile: vi.fn(),
}));

vi.mock('adm-zip', () => {
    return {
        default: class {
            constructor() {}
            extractAllToAsync(path: string, overwrite: boolean, keep: boolean, callback: (err?: Error) => void) {
                // Default success, can override in tests via spy
                callback();
            }
        }
    };
});

// Mock dependencies to avoid side effects
vi.mock('../../electron/gamebanana', () => ({
    fetchModProfile: vi.fn(),
    fetchModDetails: vi.fn(),
}));

vi.mock('../../electron/github', () => ({
    fetchLatestRelease: vi.fn(),
}));


describe('ModManager Final Gaps V4 (Backend)', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
        // Ensure getSettings returns valid path for launchGame
        modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/games/SparkingZERO/SparkingZERO.exe' });
    });

    it('should handle extractZip failure during UE4SS install (finalizeUE4SSInstall)', async () => {
        const { fetchLatestRelease } = await import('../../electron/github');
        (fetchLatestRelease as any).mockResolvedValue('http://example.com/ue4ss.zip');

        // Mock downloadFile to succeed
        modManager['downloadFile'] = vi.fn().mockResolvedValue(undefined);

        // Mock extractZip to fail
        modManager['extractZip'] = vi.fn().mockRejectedValue(new Error('Extraction Failed'));

        const result = await modManager.installUE4SS();

        expect(result.success).toBe(false);
        expect(result.message).toContain('Failed to extract/install UE4SS');
    });

    it('should handle execFile error callback in launchGame', async () => {
        (fs.stat as any).mockResolvedValue({ isDirectory: () => false });
        (fs.access as any).mockResolvedValue(undefined);

        (execFile as any).mockImplementation((file: string, args: string[], options: any, callback: any) => {
            callback(new Error('Launch Failed'));
        });

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        await modManager.launchGame();

        expect(execFile).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith('Failed to launch game:', expect.any(Error));
    });

    it('should handle downloadFile network error (fallback path)', async () => {
        const { fetchLatestRelease } = await import('../../electron/github');
        (fetchLatestRelease as any).mockResolvedValue('http://example.com/ue4ss.zip');

        const mockRequest = new EventEmitter();
        (mockRequest as any).end = vi.fn();
        (net.request as any).mockReturnValue(mockRequest);

        const promise = modManager.installUE4SS();

        setTimeout(() => {
            mockRequest.emit('error', new Error('Network Error'));
        }, 10);

        const result = await promise;
        expect(result.success).toBe(false);
        expect(result.message).toBe('Network Error');
    });

    it('should handle downloadFile non-200 response', async () => {
        const { fetchLatestRelease } = await import('../../electron/github');
        (fetchLatestRelease as any).mockResolvedValue('http://example.com/ue4ss.zip');

        const mockRequest = new EventEmitter();
        (mockRequest as any).end = vi.fn();
        (net.request as any).mockReturnValue(mockRequest);

        const promise = modManager.installUE4SS();

        setTimeout(() => {
            const mockResponse = new EventEmitter();
            (mockResponse as any).statusCode = 404;
            (mockResponse as any).headers = {};
            mockRequest.emit('response', mockResponse);
        }, 10);

        const result = await promise;
        expect(result.success).toBe(false);
        expect(result.message).toContain('Download failed with status code: 404');
    });

     it('should handle downloadFile redirect (302)', async () => {
        const { fetchLatestRelease } = await import('../../electron/github');
        (fetchLatestRelease as any).mockResolvedValue('http://example.com/ue4ss.zip');

        // Setup: We want to intercept the recursive call to downloadFile to prevent actual network recursion logic
        // and just verify the branch was taken.
        // We can cast modManager to any to mock the private method, BUT only AFTER the initial call has started?
        // No, that's racey.

        // Better: Mock net.request to return 302 first, then for the NEXT call (which is triggered by recursion),
        // return a successful 200 flow.

        const req1 = new EventEmitter(); (req1 as any).end = vi.fn();
        const req2 = new EventEmitter(); (req2 as any).end = vi.fn();

        (net.request as any)
            .mockReturnValueOnce(req1)
            .mockReturnValueOnce(req2);

        // Also we need to make sure finalizeUE4SSInstall doesn't crash after download
        modManager['finalizeUE4SSInstall'] = vi.fn().mockResolvedValue({ success: true, message: 'OK' });

        const promise = modManager.installUE4SS();

        // 1. Trigger 302 on first request
        setTimeout(() => {
            const res1 = new EventEmitter();
            (res1 as any).statusCode = 302;
            (res1 as any).headers = { location: 'http://redirect.com' };
            req1.emit('response', res1);
        }, 10);

        // 2. Trigger 200 on second request (the redirect)
        setTimeout(() => {
            const res2 = new EventEmitter();
            (res2 as any).statusCode = 200;
            req2.emit('response', res2);

            // Finish the stream
            setTimeout(() => {
                res2.emit('end');
            }, 10);
        }, 50);

        const result = await promise;
        expect(result.success).toBe(true);
    });
});
