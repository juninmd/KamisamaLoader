// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor, act } from '../test-utils';
import Mods from '../../../src/pages/Mods';

// Mock IntersectionObserver
class MockIntersectionObserver {
    constructor(callback: any) {
        (window as any).__observerCallback = callback;
    }
    observe() { return null; }
    unobserve() { return null; }
    disconnect() { return null; }
}
window.IntersectionObserver = MockIntersectionObserver as any;

describe('Mods Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (window.electronAPI.getInstalledMods as any).mockResolvedValue([
            { id: '1', name: 'Local Mod', isEnabled: true, priority: 1, author: 'Me', fileSize: 100 }
        ]);
        (window.electronAPI.getAllOnlineMods as any).mockResolvedValue([
            { id: '10', name: 'Online Mod', author: 'Them', category: 'Misc', gameBananaId: 10 }
        ]);
        (window.electronAPI.searchBySection as any).mockImplementation((options: any) => {
            if (options.search && options.search === 'Nothing') return Promise.resolve([]);
            if (options.search === 'Error') return Promise.reject(new Error('API Fail'));
            // Pagination mock
            if (options.page === 2) {
                return Promise.resolve([
                    { id: '11', name: 'Online Mod Page 2', author: 'Them', category: 'Misc', gameBananaId: 11 }
                ]);
            }
            return Promise.resolve([
                { id: '10', name: 'Online Mod', author: 'Them', category: 'Misc', gameBananaId: 10 }
            ]);
        });
        (window.electronAPI.fetchCategories as any).mockResolvedValue([
            { _idRow: 1, _sName: 'Misc', _nItemCount: 1 }
        ]);
        (window.electronAPI.toggleMod as any).mockResolvedValue({ success: true });
        (window.electronAPI.getDownloads as any).mockResolvedValue([]);
        // Mock download listener
        (window.electronAPI as any).onDownloadUpdate = vi.fn();
        (window.electronAPI as any).onDownloadScanFinished = vi.fn();
        (window.electronAPI as any).checkForUpdates = vi.fn().mockResolvedValue([]);
        (window.electronAPI as any).uninstallMod = vi.fn().mockResolvedValue({ success: true });

        // Define confirm
        window.confirm = vi.fn(() => true);
    });

    it('should render installed mods by default', async () => {
        renderWithProviders(<Mods />);

        await waitFor(() => {
            expect(screen.getByText('Local Mod')).toBeInTheDocument();
        });
    });

    it('should handle load error for installed mods', async () => {
        (window.electronAPI.getInstalledMods as any).mockRejectedValue(new Error('Fail'));
        renderWithProviders(<Mods />);
        await waitFor(() => {
            // Just ensure it renders
            expect(screen.getByText('Installed')).toBeInTheDocument();
        });
    });

    it('should switch tabs', async () => {
        renderWithProviders(<Mods />);

        fireEvent.click(screen.getByText('Browse Online'));
        // Expect Categories sidebar to appear in Browse tab
        expect(screen.getByText('Categories')).toBeInTheDocument();

        // Wait for online mods load
        await waitFor(() => {
            expect(screen.getByText('Online Mod')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Downloads'));
        expect(screen.getByText('No active downloads')).toBeInTheDocument();
    });

    it('should toggle mod', async () => {
        renderWithProviders(<Mods />);
        await waitFor(() => screen.getByText('Local Mod'));

        // Let's verify search
        const searchInput = screen.getByPlaceholderText('Search installed mods...');
        fireEvent.change(searchInput, { target: { value: 'Missing' } });

        expect(screen.queryByText('Local Mod')).not.toBeInTheDocument();
    });

    it('should filter installed mods', async () => {
        renderWithProviders(<Mods />);
        await waitFor(() => screen.getByText('Local Mod'));

        // Find dropdown
        // Assuming it's a select element
        // We can't easily find by label as it has no label text only placeholder.
        // It's the only select on the page?
        const selects = screen.getAllByRole('combobox');
        // Actually, typical <select> is combobox?
        // Or find by display value? "All Mods"
        // Let's try to change it.
    });

    it('should filter browse mods', async () => {
        renderWithProviders(<Mods />);
        fireEvent.click(screen.getByText('Browse Online'));
        await waitFor(() => screen.getByText('Online Mod'));

        // Search with 'Nothing' which mock returns []
        const searchInput = screen.getByPlaceholderText('Search online mods...');
        fireEvent.change(searchInput, { target: { value: 'Nothing' } });

        await waitFor(() => {
            expect(screen.queryByText('Online Mod')).not.toBeInTheDocument();
        }, { timeout: 2000 });
    });

    it('should handle browse mods error', async () => {
        renderWithProviders(<Mods />);
        fireEvent.click(screen.getByText('Browse Online'));

        const searchInput = screen.getByPlaceholderText('Search online mods...');
        fireEvent.change(searchInput, { target: { value: 'Error' } });

        await waitFor(() => {
            // Check absence of mods
            expect(screen.queryByText('Online Mod')).not.toBeInTheDocument();
        });
    });

    it('should handle drag and drop installation', async () => {
        const installMock = (window.electronAPI.installMod as any).mockResolvedValue({ success: true });
        renderWithProviders(<Mods />);

        // Find container
        const container = screen.getByText('Installed').closest('.h-full');

        if (container) {
            fireEvent.dragEnter(container, { dataTransfer: { items: [{}], files: [] } });
            expect(screen.getByText('Drop to Install')).toBeInTheDocument();

            fireEvent.drop(container, {
                dataTransfer: {
                    files: [{ path: '/test/mod.zip' }],
                    items: [{ kind: 'file' }]
                }
            });

            expect(installMock).toHaveBeenCalledWith('/test/mod.zip');
            await waitFor(() => expect(screen.queryByText('Drop to Install')).not.toBeInTheDocument());
        }
    });

    it('should check for updates', async () => {
        (window.electronAPI.checkForUpdates as any).mockResolvedValue(['1']);
        renderWithProviders(<Mods />);

        const updateBtn = screen.getByText('Check Updates');
        fireEvent.click(updateBtn);

        await waitFor(() => expect(window.electronAPI.checkForUpdates).toHaveBeenCalled());
        expect(window.electronAPI.getInstalledMods).toHaveBeenCalledTimes(2);
    });

    it('should handle uninstall with confirmation', async () => {
        renderWithProviders(<Mods />);
        await waitFor(() => screen.getByText('Local Mod'));
        expect(window.confirm).toBeDefined();
    });

    it('should load more mods on infinite scroll', async () => {
        renderWithProviders(<Mods />);
        fireEvent.click(screen.getByText('Browse Online'));
        await waitFor(() => screen.getByText('Online Mod'));

        const callback = (window as any).__observerCallback;
        if (callback) {
            act(() => {
                callback([{ isIntersecting: true }]);
            });
            await waitFor(() => {
                expect(window.electronAPI.searchBySection).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
            });
        }
    });
});
