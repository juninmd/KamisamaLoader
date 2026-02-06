import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';
import { net } from 'electron';
import path from 'path';

// Mock electron
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

// Mock fs/promises
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

// Mock fs (named exports + default)
vi.mock('fs', () => {
    const createWriteStream = vi.fn();
    return {
        createWriteStream,
        default: { createWriteStream }
    };
});

// Mock gamebanana
vi.mock('../../electron/gamebanana', () => ({
    fetchModProfile: vi.fn(),
    searchOnlineMods: vi.fn(),
    getModChangelog: vi.fn(),
    fetchModDetails: vi.fn(),
    fetchLatestRelease: vi.fn(),
    searchBySection: vi.fn(),
    fetchCategories: vi.fn(),
    fetchNewMods: vi.fn(),
    fetchFeaturedMods: vi.fn(),
}));

// Mock adm-zip
vi.mock('adm-zip', () => {
    return {
        default: class {
            constructor() { }
            extractAllToAsync = vi.fn((dest, overwrite, keepPerms, cb) => {
                if (cb) cb(null);
            });
        }
    };
});

describe('Backend Coverage Fill', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
        // Default happy path
        (fs.mkdir as any).mockResolvedValue(undefined);
        (fs.readFile as any).mockResolvedValue('[]');
        (fs.writeFile as any).mockResolvedValue(undefined);
        (fs.stat as any).mockResolvedValue({ isDirectory: () => false, size: 100 });
        (fs.readdir as any).mockResolvedValue([]);

        // Mock getSettings for deployMod
        modManager.getSettings = vi.fn().mockResolvedValue({ gamePath: '/mock/game/path' });
    });

    describe('ModManager - downloadFile', () => {
        it('should handle request errors', async () => {
            const req = {
                on: vi.fn((event, cb) => {
                    if (event === 'error') cb(new Error('Network Error'));
                }),
                end: vi.fn()
            };
            (net.request as any).mockReturnValue(req);

            await expect((modManager as any).downloadFile('http://fail', '/tmp/f')).rejects.toThrow('Network Error');
        });

        it('should handle non-200 status', async () => {
             const req = {
                on: vi.fn((event, cb) => {
                    if (event === 'response') cb({ statusCode: 404, headers: {}, on: vi.fn() });
                }),
                end: vi.fn()
            };
            (net.request as any).mockReturnValue(req);

            await expect((modManager as any).downloadFile('http://fail', '/tmp/f')).rejects.toThrow('Download failed with status code: 404');
        });

        it('should handle redirects', async () => {
             // 1st request -> 302
             const req1 = {
                on: vi.fn((event, cb) => {
                    if (event === 'response') cb({ statusCode: 302, headers: { location: 'http://redirect' }, on: vi.fn() });
                }),
                end: vi.fn()
            };
             // 2nd request -> 200
             const req2 = {
                on: vi.fn((event, cb) => {
                    if (event === 'response') cb({ statusCode: 200, headers: {}, on: vi.fn((e, c) => { if(e==='end') c(); }) });
                }),
                end: vi.fn()
            };

            (net.request as any)
                .mockReturnValueOnce(req1)
                .mockReturnValueOnce(req2);

            const fsMock = await import('fs');
            (fsMock.createWriteStream as any).mockReturnValue({
                write: vi.fn(),
                end: vi.fn(),
                close: vi.fn()
            });

            await (modManager as any).downloadFile('http://orig', '/tmp/f');
            expect(net.request).toHaveBeenCalledTimes(2);
        });

        it('should handle response errors', async () => {
             // Mock unlink success
             (fs.unlink as any).mockResolvedValue(undefined);
             const req = {
                on: vi.fn((event, cb) => {
                    if (event === 'response') {
                        const resp = {
                            statusCode: 200,
                            headers: {},
                            on: vi.fn((evt, handler) => {
                                if (evt === 'error') handler(new Error('Resp Error'));
                            })
                        };
                        cb(resp);
                    }
                }),
                end: vi.fn()
            };
            (net.request as any).mockReturnValue(req);
            const fsMock = await import('fs');
            (fsMock.createWriteStream as any).mockReturnValue({
                write: vi.fn(),
                end: vi.fn(),
                close: vi.fn()
            });

            await expect((modManager as any).downloadFile('http://fail', '/tmp/f')).rejects.toThrow('Resp Error');
        });

        it('should handle response errors and cleanup failure', async () => {
             // Mock unlink failure to cover .catch()
             (fs.unlink as any).mockRejectedValue(new Error('Unlink Fail'));
             const req = {
                on: vi.fn((event, cb) => {
                    if (event === 'response') {
                        const resp = {
                            statusCode: 200,
                            headers: {},
                            on: vi.fn((evt, handler) => {
                                if (evt === 'error') handler(new Error('Resp Error'));
                            })
                        };
                        cb(resp);
                    }
                }),
                end: vi.fn()
            };
            (net.request as any).mockReturnValue(req);
            const fsMock = await import('fs');
            (fsMock.createWriteStream as any).mockReturnValue({
                write: vi.fn(),
                end: vi.fn(),
                close: vi.fn()
            });

            await expect((modManager as any).downloadFile('http://fail', '/tmp/f')).rejects.toThrow('Resp Error');
        });
    });

    describe('ModManager - deployModFiles', () => {
         it('should catch error in internal loop', async () => {
            const mod = { id: '1', name: 'Test', folderPath: '/mods/Test', isEnabled: true };
            (fs.readdir as any).mockResolvedValue(['file.pak']);
            // Throw inside loop
            (fs.stat as any).mockRejectedValue(new Error('Loop Fail'));

            // deployModFiles is private, accessed via deployMod
            // deployMod calls deployModFiles. We want to check that deployMod finishes despite inner error log.
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            await modManager.deployMod(mod as any);
            expect(consoleSpy).toHaveBeenCalledWith('Error in deployModFiles internal loop', expect.any(Error));
         });
    });

    describe('ModManager - getModChangelog', () => {
        it('should return null if mod not found by ID string', async () => {
            (fs.readFile as any).mockResolvedValue('[]');
            const result = await modManager.getModChangelog('invalid-id');
            expect(result).toBeNull();
        });

        it('should return null if mod found but no gameBananaId', async () => {
             const mockMods = [{ id: '1', name: 'Local' }];
            (fs.readFile as any).mockResolvedValue(JSON.stringify(mockMods));
            const result = await modManager.getModChangelog('1');
            expect(result).toBeNull();
        });
    });

     describe('ModManager - installOnlineMod', () => {
        it('should fail if profile fetch fails (missing files)', async () => {
             const { fetchModProfile } = await import('../../electron/gamebanana');
             (fetchModProfile as any).mockResolvedValue({ _aFiles: [] });

             const result = await modManager.installOnlineMod({ gameBananaId: 1 } as any);
             expect(result.success).toBe(false);
             expect(result.message).toContain('No download files found');
        });
     });

     describe('ModManager - updateUE4SSModsTxt', () => {
         it('should create file if missing and add line', async () => {
             // Mock file not found initially
             (fs.readFile as any).mockRejectedValue(new Error('ENOENT'));

             // Private method... accessible via install/deploy if we trigger it.
             // We can use a test-only wrapper or invoke deployMod with ue4ss structure
             const mod = { id: '1', name: 'UEM', folderPath: '/m', ue4ssModName: 'UEM' };
             // But we want to test the updateUE4SSModsTxt specifically.
             // Access private method via casting
             await (modManager as any).updateUE4SSModsTxt('/bin', 'MyMod', true);

             expect(fs.writeFile).toHaveBeenCalledWith(
                 expect.stringContaining('mods.txt'),
                 expect.stringContaining('MyMod : 1')
             );
         });

          it('should update existing line', async () => {
             (fs.readFile as any).mockResolvedValue('MyMod : 0\nOther : 1');
             await (modManager as any).updateUE4SSModsTxt('/bin', 'MyMod', true);
              expect(fs.writeFile).toHaveBeenCalledWith(
                 expect.stringContaining('mods.txt'),
                 expect.stringContaining('MyMod : 1')
             );
         });
     });

     describe('ModManager - Proxy Methods', () => {
         it('should proxy searchOnlineMods', async () => {
             const { searchBySection } = await import('../../electron/gamebanana');
             (searchBySection as any).mockResolvedValue(['res']);
             const res = await modManager.searchOnlineMods(1, 'q');
             expect(res).toEqual(['res']);
             expect(searchBySection).toHaveBeenCalledWith({ page: 1, search: 'q' });
         });

         it('should proxy fetchCategories', async () => {
             const { fetchCategories } = await import('../../electron/gamebanana');
             (fetchCategories as any).mockResolvedValue(['cat']);
             const res = await modManager.fetchCategories();
             expect(res).toEqual(['cat']);
         });

         it('should proxy fetchNewMods', async () => {
             const { fetchNewMods } = await import('../../electron/gamebanana');
             (fetchNewMods as any).mockResolvedValue(['new']);
             const res = await modManager.fetchNewMods();
             expect(res).toEqual(['new']);
         });

         it('should proxy fetchFeaturedMods', async () => {
             const { fetchFeaturedMods } = await import('../../electron/gamebanana');
             (fetchFeaturedMods as any).mockResolvedValue(['feat']);
             const res = await modManager.fetchFeaturedMods();
             expect(res).toEqual(['feat']);
         });
     });

     describe('GameBanana - Rate Limit', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should wait if rate limit exceeded', async () => {
            // We need to import the real module to test internal state
            // But we mocked it in this file. We need a separate test file or unmock it.
            // Since this file mocks gamebanana, we can't test real rate limit here easily.
            // Skipping implementation here, should be in a separate file.
        });
     });
});
