import './mod-manager-extended.fixture';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import { net } from 'electron';
import { fetchLatestRelease } from '../../electron/github';
describe('ModManager Extended Coverage', () => {
    let modManager: ModManager;
    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
        (modManager as any).getSettings = vi.fn().mockResolvedValue({ gamePath: '/mock/game' });
    });
    describe('Deployment Fallback', () => {
        it('should fallback to copyFile if link fails with EXDEV', async () => {
            const mod = {
                id: 'test-mod',
                name: 'Test Mod',
                folderPath: '/mock/mods/TestMod',
                isEnabled: true,
                priority: 1,
            };
            (fs.stat as any).mockResolvedValue({ isDirectory: () => false, size: 100 });
            (fs.readdir as any).mockResolvedValue(['test.pak']);
            (fs.mkdir as any).mockResolvedValue(undefined);
            (fs.unlink as any).mockResolvedValue(undefined);
            const exdevError: any = new Error('Cross-device link not permitted');
            exdevError.code = 'EXDEV';
            (fs.link as any).mockRejectedValue(exdevError);
            (fs.copyFile as any).mockResolvedValue(undefined);
            const result = await modManager.deployMod(mod as any);
            expect(result).toBe(true);
            expect(fs.link).toHaveBeenCalled();
            expect(fs.copyFile).toHaveBeenCalled();
        });
    });
});
describe('ModManager Extended Coverage', () => {
    let modManager: ModManager;
    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
        (modManager as any).getSettings = vi.fn().mockResolvedValue({ gamePath: '/mock/game' });
    });
    describe('Deployment Fallback', () => {
        it('should return false if both link and copy fail', async () => {
            const mod = {
                id: 'test-mod',
                name: 'Test Mod',
                folderPath: '/mock/mods/TestMod',
                isEnabled: true,
                priority: 1,
            };
            (fs.stat as any).mockResolvedValue({ isDirectory: () => false, size: 100 });
            (fs.readdir as any).mockResolvedValue(['test.pak']);
            (fs.mkdir as any).mockResolvedValue(undefined);
            (fs.unlink as any).mockResolvedValue(undefined);
            const exdevError: any = new Error('EXDEV');
            exdevError.code = 'EXDEV';
            (fs.link as any).mockRejectedValue(exdevError);
            (fs.copyFile as any).mockRejectedValue(new Error('Copy failed'));
            const result = await modManager.deployMod(mod as any);
            expect(result).toBe(false);
            expect(mod.deployedFiles).toBeUndefined();
        });
    });
});
describe('ModManager Extended Coverage', () => {
    let modManager: ModManager;
    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
        (modManager as any).getSettings = vi.fn().mockResolvedValue({ gamePath: '/mock/game' });
    });
    describe('UE4SS Installation', () => {
        it('should install UE4SS using fallback download if DownloadManager is missing', async () => {
            (fetchLatestRelease as any).mockResolvedValue('https://github.com/release.zip');
            (fs.mkdir as any).mockResolvedValue(undefined);
            (fs.rm as any).mockResolvedValue(undefined);
            (fs.readdir as any).mockResolvedValue(['UE4SS_Root']);
            (fs.stat as any).mockResolvedValue({ isDirectory: () => true });
            (fs.cp as any).mockResolvedValue(undefined);
            (fs.unlink as any).mockResolvedValue(undefined);
            const mockRequest = {
                on: vi.fn((event, cb) => {
                    if (event === 'response') {
                        const mockResponse = {
                            statusCode: 200,
                            headers: {},
                            on: vi.fn((evt, handler) => {
                                if (evt === 'data')
                                    handler(Buffer.from('zipdata'));
                                if (evt === 'end')
                                    handler();
                            })
                        };
                        cb(mockResponse);
                    }
                }),
                end: vi.fn(),
            };
            (net.request as any).mockReturnValue(mockRequest);
            const mockStream = {
                write: vi.fn(),
                end: vi.fn((callback?: () => void) => callback?.()),
                close: vi.fn(),
                on: vi.fn()
            };
            (createWriteStream as any).mockReturnValue(mockStream);
            const result = await modManager.installUE4SS();
            expect(result.success).toBe(true);
            expect(fs.cp).toHaveBeenCalled();
        });
    });
});
describe('ModManager Extended Coverage', () => {
    let modManager: ModManager;
    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
        (modManager as any).getSettings = vi.fn().mockResolvedValue({ gamePath: '/mock/game' });
    });
    describe('UE4SS Installation', () => {
        it('should fail if fetchLatestRelease returns null', async () => {
            (fetchLatestRelease as any).mockResolvedValue(null);
            const result = await modManager.installUE4SS();
            expect(result.success).toBe(false);
            expect(result.message).toContain('Failed to fetch UE4SS release');
        });
    });
});
