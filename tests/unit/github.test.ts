import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchLatestRelease } from '../../electron/github';

describe('GitHub API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    it('should fetch latest release and find UE4SS zip', async () => {
        const mockResponse = {
            ok: true,
            json: async () => ({
                assets: [
                    { name: 'other.zip', browser_download_url: 'http://other' },
                    { name: 'zUE4SS_v3.0.0.zip', browser_download_url: 'http://ue4ss' }
                ]
            })
        };
        (global.fetch as any).mockResolvedValue(mockResponse);

        const url = await fetchLatestRelease('owner', 'repo');
        expect(url).toBe('http://ue4ss');
        expect(global.fetch).toHaveBeenCalledWith(
            'https://api.github.com/repos/owner/repo/releases/latest',
            expect.objectContaining({ headers: expect.any(Object) })
        );
    });

    it('should fallback to first zip if no UE4SS zip found', async () => {
        const mockResponse = {
            ok: true,
            json: async () => ({
                assets: [
                    { name: 'release.zip', browser_download_url: 'http://release' }
                ]
            })
        };
        (global.fetch as any).mockResolvedValue(mockResponse);

        const url = await fetchLatestRelease('owner', 'repo');
        expect(url).toBe('http://release');
    });

    it('should return null if fetch fails', async () => {
        (global.fetch as any).mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' });
        const url = await fetchLatestRelease('owner', 'repo');
        expect(url).toBeNull();
    });

    it('should return null if no assets found', async () => {
        (global.fetch as any).mockResolvedValue({ ok: true, json: async () => ({}) });
        const url = await fetchLatestRelease('owner', 'repo');
        expect(url).toBeNull();
    });

    it('should return null if no suitable zip found', async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                assets: [{ name: 'source.tar.gz', browser_download_url: 'http://source' }]
            })
        });
        const url = await fetchLatestRelease('owner', 'repo');
        expect(url).toBeNull();
    });

    it('should return null on exception', async () => {
        (global.fetch as any).mockRejectedValue(new Error('Network Error'));
        const url = await fetchLatestRelease('owner', 'repo');
        expect(url).toBeNull();
    });
});
