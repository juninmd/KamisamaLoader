// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor, act } from './test-utils';
import Mods from '../../src/pages/Mods';

const api = {
    getInstalledMods: vi.fn(),
    searchBySection: vi.fn(),
    fetchCategories: vi.fn(),
    onDownloadScanFinished: vi.fn(() => () => {}),
    getProfiles: vi.fn().mockResolvedValue([]),
    getSettings: vi.fn().mockResolvedValue({}),
    saveSettings: vi.fn().mockResolvedValue(true),
    checkForUpdates: vi.fn().mockResolvedValue([]),
};
Object.defineProperty(window, 'electronAPI', { value: api, writable: true });
window.IntersectionObserver = vi.fn(function () {
    return { observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn(), takeRecords: vi.fn() };
}) as any;

const deferred = <T,>() => {
    let resolve!: (v: T) => void;
    const promise = new Promise<T>(r => { resolve = r; });
    return { promise, resolve };
};
const mod = (name: string, id: number) => ({ id: String(id), gameBananaId: id, name, author: 'a', images: [], isNsfw: false });

describe('Mods browse: overlapping loads', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        api.getInstalledMods.mockResolvedValue([]);
        api.fetchCategories.mockResolvedValue([]);
    });

    it('a stale response does not end the loading state of the newer search', async () => {
        const stale = deferred<any[]>();
        const fresh = deferred<any[]>();
        api.searchBySection
            .mockResolvedValueOnce([]) // first load when the tab opens
            .mockReturnValueOnce(stale.promise) // manual refresh
            .mockReturnValueOnce(fresh.promise); // search typed while the refresh is pending

        renderWithProviders(<Mods />);
        fireEvent.click(await screen.findByText('Browse Online'));
        const refresh = await screen.findByTitle('Refresh Online Mods');
        await waitFor(() => expect(refresh).not.toBeDisabled());

        fireEvent.click(refresh);
        await waitFor(() => expect(refresh).toBeDisabled());
        fireEvent.change(screen.getByPlaceholderText('Search online mods...'), { target: { value: 'goku' } });
        await waitFor(() => expect(api.searchBySection).toHaveBeenCalledTimes(3), { timeout: 2000 });

        await act(async () => { stale.resolve([mod('Old Result', 1)]); });
        // The newer search is still running: the spinner must stay on (and infinite scroll stay off).
        expect(refresh).toBeDisabled();

        await act(async () => { fresh.resolve([mod('Goku Ultra', 2)]); });
        await waitFor(() => expect(refresh).not.toBeDisabled());
        expect(screen.getByText('Goku Ultra')).toBeInTheDocument();
        expect(screen.queryByText('Old Result')).not.toBeInTheDocument();
    });
});
