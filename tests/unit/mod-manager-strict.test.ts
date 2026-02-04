import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';
import { execFile } from 'child_process';
import path from 'path';

// Hoist mocks
const fsMocks = vi.hoisted(() => ({
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn(),
    access: vi.fn(),
    rm: vi.fn(),
    unlink: vi.fn(),
    link: vi.fn(),
    copyFile: vi.fn(),
    cp: vi.fn()
}));

const cpMocks = vi.hoisted(() => ({
    execFile: vi.fn()
}));

vi.mock('fs/promises', () => ({ default: fsMocks }));
vi.mock('child_process', () => ({ execFile: cpMocks.execFile }));
vi.mock('electron', () => ({
    app: { getPath: () => '/tmp', isPackaged: false },
    net: { request: vi.fn() },
    shell: { openPath: vi.fn() }
}));
vi.mock('../../electron/gamebanana', () => ({
    fetchModProfile: vi.fn(),
    searchOnlineMods: vi.fn()
}));
vi.mock('../../electron/github', () => ({
    fetchLatestRelease: vi.fn()
}));
vi.mock('adm-zip', () => ({
    default: class {
        extractAllToAsync = vi.fn((dest, o, k, cb) => cb(null))
    }
}));


describe('ModManager Strict Coverage', () => {
    let mgr: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        mgr = new ModManager();
        // Default happy path
        fsMocks.readFile.mockResolvedValue('{}');
        fsMocks.stat.mockResolvedValue({ isDirectory: () => false });
    });

    describe('launchGame', () => {
        it('should handle launchArgs with empty strings', async () => {
            fsMocks.readFile.mockResolvedValue(JSON.stringify({
                gamePath: '/game.exe',
                launchArgs: '  -arg1   -arg2  '
            }));

            await mgr.launchGame();

            expect(cpMocks.execFile).toHaveBeenCalledWith(
                '/game.exe',
                ['-fileopenlog', '-arg1', '-arg2'],
                expect.anything(),
                expect.anything()
            );
        });

        it('should throw if game path access fails (root)', async () => {
             // Mock directory check
             fsMocks.stat.mockImplementation(async () => ({ isDirectory: () => true }));

             // Mock access fail for root exe
             fsMocks.access.mockRejectedValueOnce(new Error('No root exe'));
             // Mock access fail for bin exe
             fsMocks.access.mockRejectedValueOnce(new Error('No bin exe'));

             // Mock settings
             fsMocks.readFile.mockResolvedValue(JSON.stringify({ gamePath: '/dir' }));

             await expect(mgr.launchGame()).rejects.toThrow('Could not find SparkingZERO.exe');
        });

        it('should succeed if game path is directory and binary exe exists', async () => {
             fsMocks.stat.mockImplementation(async () => ({ isDirectory: () => true }));
             fsMocks.readFile.mockResolvedValue(JSON.stringify({ gamePath: '/dir' }));

             // First call fails (root), second succeeds (bin)
             fsMocks.access.mockRejectedValueOnce(new Error('No root'));
             fsMocks.access.mockResolvedValueOnce(undefined);

             await mgr.launchGame();

             expect(cpMocks.execFile).toHaveBeenCalledWith(
                 expect.stringContaining('SparkingZERO-Win64-Shipping.exe'),
                 expect.anything(),
                 expect.anything(),
                 expect.anything()
             );
        });
    });

    describe('installUE4SS', () => {
        it('should handle extraction failure', async () => {
            const { fetchLatestRelease } = await import('../../electron/github');
            (fetchLatestRelease as any).mockResolvedValue('http://url');

            // Mock downloadFile (private) by mocking net.request?
            // Or simpler: We know it calls extractZip.
            // If we mock downloadFile to succeed, then we can test extract logic.
            // But downloadFile is private.
            // We can stub the private method by casting to any.
            (mgr as any).downloadFile = vi.fn().mockResolvedValue(undefined);

            // Mock extractZip failure
            // AdmZip is mocked at module level. We need it to call callback with error.
            // We can't easily change the class mock per test without complexity.
            // Instead, we can mock fs.rm to fail or fs.cp to fail in finalizeUE4SSInstall.

            fsMocks.cp.mockRejectedValue(new Error('Copy Fail'));
            fsMocks.readdir.mockResolvedValue(['root']); // simulate nested folder
            fsMocks.stat.mockResolvedValue({ isDirectory: () => true });

            fsMocks.readFile.mockResolvedValue(JSON.stringify({ gamePath: '/game' }));

            const result = await mgr.installUE4SS();
            expect(result.success).toBe(false);
            expect(result.message).toContain('Failed to extract/install');
        });

         it('should handle clean up failure gracefully', async () => {
            const { fetchLatestRelease } = await import('../../electron/github');
            (fetchLatestRelease as any).mockResolvedValue('http://url');
            (mgr as any).downloadFile = vi.fn().mockResolvedValue(undefined);

            // Fix: ensure cp doesn't fail from previous test
            fsMocks.cp.mockResolvedValue(undefined);
            fsMocks.readdir.mockResolvedValue(['file']);
            fsMocks.stat.mockResolvedValue({ isDirectory: () => false });
            fsMocks.readFile.mockResolvedValue(JSON.stringify({ gamePath: '/game' }));

            // Fail cleanup
            fsMocks.unlink.mockRejectedValue(new Error('Unlink Fail'));

            const result = await mgr.installUE4SS();
            // Currently returns false on cleanup failure
            expect(result.success).toBe(false);
        });
    });
});
