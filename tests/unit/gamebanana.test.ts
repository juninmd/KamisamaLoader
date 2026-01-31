import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as gamebanana from '../../electron/gamebanana';

// Mock api-cache to avoid disk I/O and isolate logic
const mockCache = {
    get: vi.fn(),
    set: vi.fn()
};
vi.mock('../../electron/api-cache', () => ({
    getAPICache: () => mockCache
}));

// Mock global fetch
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

describe('GameBanana API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockCache.get.mockResolvedValue(null); // Default cache miss
        mockCache.set.mockResolvedValue(undefined);
    });

    describe('searchOnlineMods', () => {
        it('should fetch and return mods', async () => {
            const mockResponse = {
                _aRecords: [
                    {
                        _idRow: 123,
                        _sName: 'Test Mod',
                        _aSubmitter: { _sName: 'User' },
                        _sVersion: '1.0',
                        _sText: 'Desc',
                        _aPreviewMedia: { _aImages: [{ _sBaseUrl: 'http://img', _sFile220: 'thumb.jpg' }] },
                        _nViewCount: 10,
                        _nLikeCount: 5,
                        _nDownloadCount: 2,
                        _tsDateAdded: 1000,
                        _aRootCategory: { _sName: 'Misc' },
                        _aFiles: [{ _nFilesize: 1024 }]
                    }
                ]
            };
            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });

            const mods = await gamebanana.searchOnlineMods(1, 'Test');

            expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('Results?_sSearchString=Test'));
            expect(mods).toHaveLength(1);
            expect(mods[0].name).toBe('Test Mod');
            expect(mockCache.set).toHaveBeenCalled();
        });

        it('should use cache if available', async () => {
            mockCache.get.mockResolvedValue([{ id: '123', name: 'Cached Mod' }]);
            const mods = await gamebanana.searchOnlineMods(1, 'Test');
            expect(mods).toHaveLength(1);
            expect(mods[0].name).toBe('Cached Mod');
            expect(fetchMock).not.toHaveBeenCalled();
        });

        it('should handle API errors', async () => {
            fetchMock.mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Server Error',
                text: async () => 'Error'
            });

            const mods = await gamebanana.searchOnlineMods(1, 'Test');
            expect(mods).toEqual([]);
        });

        it('should handle category filter', async () => {
             fetchMock.mockResolvedValue({ ok: true, json: async () => ({ _aRecords: [] }) });
             await gamebanana.searchOnlineMods(1, '', { categoryId: 999 } as any);
        });
    });

    describe('searchBySection', () => {
        it('should construct correct URL for search', async () => {
             fetchMock.mockResolvedValue({ ok: true, json: async () => ({ _aRecords: [] }) });
             await gamebanana.searchBySection({ search: 'Goku', categoryId: 10 });
             expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('Generic_Category]=10'));
             expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('_sSearchString=Goku'));
        });

        it('should construct correct URL for browsing (Subfeed)', async () => {
             fetchMock.mockResolvedValue({ ok: true, json: async () => ({ _aRecords: [] }) });
             await gamebanana.searchBySection({ page: 2, sort: 'date' });
             expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('Subfeed'));
             expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('_nPage=2'));
        });

        it('should handle date ranges', async () => {
             fetchMock.mockResolvedValue({ ok: true, json: async () => ({ _aRecords: [] }) });
             await gamebanana.searchBySection({ dateRange: '24h' });
             expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('Generic_DateAdded_Min'));
        });
    });

    describe('fetchItemData', () => {
        it('should fetch item data', async () => {
            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => ({ _idRow: 1, _sName: 'Item' })
            });
            const data = await gamebanana.fetchItemData('Mod', 1);
            expect(data._sName).toBe('Item');
            expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('Mod/1/ProfilePage'));
        });

        it('should return null on error', async () => {
             fetchMock.mockResolvedValue({ ok: false, status: 404 });
             const data = await gamebanana.fetchItemData('Mod', 1);
             expect(data).toBeNull();
        });
    });

    describe('fetchAllMods', () => {
        it('should fetch multiple pages', async () => {
            fetchMock.mockImplementation((url) => {
                if (url.includes('_nPage=1')) {
                    return Promise.resolve({
                        ok: true,
                        json: async () => ({ _aRecords: [{ _idRow: 1, _sName: 'Mod 1' }] })
                    });
                }
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ _aRecords: [] })
                });
            });

            const mods = await gamebanana.fetchAllMods(21179, 2);
            expect(mods.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('fetchNewMods', () => {
        it('should call searchBySection with date sort', async () => {
            fetchMock.mockResolvedValue({ ok: true, json: async () => ({ _aRecords: [] }) });
            await gamebanana.fetchNewMods(1);
            expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('_sSort=new'));
        });
    });

    describe('fetchFeaturedMods', () => {
        it('should fetch and sort locally', async () => {
             const mockRecords = [
                 { _idRow: 1, _nLikeCount: 10, _sName: 'A' },
                 { _idRow: 2, _nLikeCount: 20, _sName: 'B' }
             ];
             fetchMock.mockResolvedValue({
                 ok: true,
                 json: async () => ({ _aRecords: mockRecords })
             });

             const mods = await gamebanana.fetchFeaturedMods();
             expect(mods[0].likeCount).toBe(20);
             expect(mods[1].likeCount).toBe(10);
        });
    });

    describe('fetchCategories', () => {
        it('should return categories', async () => {
             fetchMock.mockResolvedValue({
                 ok: true,
                 json: async () => ({ _aModRootCategories: [{ _idRow: 1, _sName: 'Cat' }] })
             });
             const cats = await gamebanana.fetchCategories();
             expect(cats).toHaveLength(1);
             expect(cats[0]._sName).toBe('Cat');
        });
    });

    describe('fetchModProfile', () => {
        it('should return profile data', async () => {
             fetchMock.mockResolvedValue({ ok: true, json: async () => ({ _idRow: 1 }) });
             const profile = await gamebanana.fetchModProfile(1);
             expect(profile._idRow).toBe(1);
        });
    });

    describe('fetchModUpdates', () => {
        it('should return update info', async () => {
             fetchMock.mockResolvedValue({
                 ok: true,
                 json: async () => ([{ _sVersion: '2.0', _tsDateAdded: 123, _aChangeLog: [] }])
             });
             const updates = await gamebanana.fetchModUpdates(1);
             expect(updates?.version).toBe('2.0');
        });

        it('should return null if empty', async () => {
             fetchMock.mockResolvedValue({ ok: true, json: async () => [] });
             const updates = await gamebanana.fetchModUpdates(1);
             expect(updates).toBeNull();
        });
    });

    describe('getModChangelog', () => {
         it('should return mapped changelog', async () => {
             fetchMock.mockResolvedValue({
                 ok: true,
                 json: async () => ([{ _sVersion: '2.0', _sText: 'Fixed' }])
             });
             const logs = await gamebanana.getModChangelog(1);
             expect(logs).toHaveLength(1);
             expect(logs[0].text).toBe('Fixed');
         });

         it('should return empty if empty array', async () => {
             fetchMock.mockResolvedValue({
                 ok: true,
                 json: async () => []
             });
             const logs = await gamebanana.getModChangelog(1);
             expect(logs).toEqual([]);
         });

        it('should handle fetch exception', async () => {
             fetchMock.mockRejectedValue(new Error('Net Fail'));
             const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
             const logs = await gamebanana.getModChangelog(1);
             expect(logs).toEqual([]);
             expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error fetching changelog'), expect.anything());
        });
    });

    describe('fetchModDetails', () => {
         it('should return details with images', async () => {
             fetchMock.mockResolvedValue({
                 ok: true,
                 json: async () => ({
                     _sText: 'Desc',
                     _aPreviewMedia: { _aImages: [{ _sBaseUrl: 'url', _sFile: 'img.jpg' }] },
                     _sProfileUrl: 'http://mod'
                 })
             });
             const details = await gamebanana.fetchModDetails(1);
             expect(details.description).toBe('Desc');
             expect(details.images[0]).toBe('url/img.jpg');
         });

         it('should return null if profile fetch fails', async () => {
             fetchMock.mockResolvedValue({ ok: false });
             const details = await gamebanana.fetchModDetails(1);
             expect(details).toBeNull();
         });
    });
});
