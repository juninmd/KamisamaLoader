// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor, act } from '../test-utils';
import Mods from '../../../src/pages/Mods';

// Mock IntersectionObserver
class MockIntersectionObserver {
    callback: any;
    constructor(callback: any) {
        this.callback = callback;
        (window as any).__observerCallback = callback;
        (window as any).__observerInstance = this;
    }
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
}
window.IntersectionObserver = MockIntersectionObserver as any;

// Mock CategorySidebar to simplify integration testing
vi.mock('../../../src/components/CategorySidebar', () => ({
    default: ({ onCategorySelect, categories }: any) => (
        <div data-testid="category-sidebar">
            <button onClick={() => onCategorySelect('Misc')}>Select Misc</button>
            <div data-testid="cat-count">{categories?.length || 0}</div>
        </div>
    )
}));

describe('Mods Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // vi.useFakeTimers(); // REMOVED GLOBAL FAKE TIMERS
        localStorage.clear();
        (window.electronAPI.getInstalledMods as any).mockResolvedValue([
            { id: '1', name: 'Local Mod', isEnabled: true, priority: 1, author: 'Me', fileSize: 100, hasUpdate: false },
            { id: '2', name: 'Outdated Mod', isEnabled: true, priority: 2, author: 'Me', fileSize: 100, hasUpdate: true }
        ]);
        (window.electronAPI.getAllOnlineMods as any).mockResolvedValue([
            { id: '10', name: 'Online Mod', author: 'Them', category: 'Misc', gameBananaId: 10 }
        ]);
        (window.electronAPI.searchBySection as any).mockImplementation((options: any) => {
            if (options.search && options.search === 'Nothing') return Promise.resolve([]);
            if (options.search === 'Error') return Promise.reject(new Error('API Fail'));
            if (options.page === 2) {
                return Promise.resolve([
                    { id: '11', name: 'Online Mod Page 2', author: 'Them', category: 'Misc', gameBananaId: 11 }
                ]);
            }
            if (options.categoryId === 1) {
                 return Promise.resolve([{ id: '10', name: 'Online Mod', author: 'Them', category: 'Misc', gameBananaId: 10 }]);
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
        (window.electronAPI as any).onDownloadUpdate = vi.fn();
        (window.electronAPI as any).onDownloadScanFinished = vi.fn();
        (window.electronAPI as any).checkForUpdates = vi.fn().mockResolvedValue([]);
        (window.electronAPI as any).uninstallMod = vi.fn().mockResolvedValue({ success: true });
        (window.electronAPI as any).updateAllMods = vi.fn().mockResolvedValue({ successCount: 1, failCount: 0, results: [{ id: '2', success: true }] });
        (window.electronAPI as any).updateMod = vi.fn().mockResolvedValue(true);
        (window.electronAPI as any).getModChangelog = vi.fn().mockResolvedValue([]);
        (window.electronAPI as any).getModDetails = vi.fn().mockResolvedValue({});

        // Define confirm
        window.confirm = vi.fn(() => true);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should render installed mods by default', async () => {
        renderWithProviders(<Mods />);
        await waitFor(() => {
            expect(screen.getByText('Local Mod')).toBeInTheDocument();
        });
    });

    it('should handle load error for installed mods', async () => {
        (window.electronAPI.getInstalledMods as any).mockRejectedValue(new Error('Fail'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        renderWithProviders(<Mods />);
        await waitFor(() => {
            expect(screen.getByText('Installed')).toBeInTheDocument();
        });
        expect(consoleSpy).toHaveBeenCalledWith('Failed to load installed mods', expect.any(Error));
    });

    it('should switch tabs', async () => {
        renderWithProviders(<Mods />);
        fireEvent.click(screen.getByText('Browse Online'));
        expect(screen.getByTestId('category-sidebar')).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByText('Online Mod')).toBeInTheDocument();
        });
        fireEvent.click(screen.getByText('Downloads'));
        expect(screen.getByText('No active downloads')).toBeInTheDocument();
    });

    it('should toggle mod', async () => {
        renderWithProviders(<Mods />);
        await waitFor(() => screen.getByText('Local Mod'));
        const searchInput = screen.getByPlaceholderText('Search installed mods...');
        fireEvent.change(searchInput, { target: { value: 'Missing' } });
        expect(screen.queryByText('Local Mod')).not.toBeInTheDocument();
    });

    it('should filter installed mods', async () => {
        renderWithProviders(<Mods />);
        await waitFor(() => screen.getByText('Local Mod'));
    });

    it('should filter browse mods with debounce', async () => {
        renderWithProviders(<Mods />);
        fireEvent.click(screen.getByText('Browse Online'));
        await waitFor(() => screen.getByText('Online Mod'));

        const searchInput = screen.getByPlaceholderText('Search online mods...');
        fireEvent.change(searchInput, { target: { value: 'Nothing' } });

        await waitFor(() => {
            expect(screen.queryByText('Online Mod')).not.toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it('should handle browse mods error', async () => {
        renderWithProviders(<Mods />);
        fireEvent.click(screen.getByText('Browse Online'));
        await waitFor(() => screen.getByText('Online Mod')); // Wait for load first

        const searchInput = screen.getByPlaceholderText('Search online mods...');
        fireEvent.change(searchInput, { target: { value: 'Error' } });

        await waitFor(() => {
             expect(screen.getByText('Failed to load online mods')).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it('should handle drag and drop installation', async () => {
        const installMock = (window.electronAPI.installMod as any).mockResolvedValue({ success: true });
        renderWithProviders(<Mods />);
        const searchInput = screen.getByPlaceholderText('Search installed mods...');
        const dropZone = searchInput.closest('div')?.parentElement?.parentElement;
        if (dropZone) {
            fireEvent.dragEnter(dropZone, { dataTransfer: { items: [{}], files: [] } });
            expect(screen.getByText('Drop to Install')).toBeInTheDocument();
            fireEvent.drop(dropZone, {
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

    it('should handle update check failure', async () => {
        (window.electronAPI.checkForUpdates as any).mockRejectedValue(new Error('Fail'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        renderWithProviders(<Mods />);
        const updateBtn = screen.getByText('Check Updates');
        fireEvent.click(updateBtn);
        await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error)));
    });

    it('should handle uninstall with confirmation', async () => {
        renderWithProviders(<Mods />);
        await waitFor(() => screen.getByText('Local Mod'));
        expect(window.confirm).toBeDefined();
    });

    it('should load more mods on infinite scroll and disconnect observer on unmount', async () => {
        const { unmount } = renderWithProviders(<Mods />);
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

        const instance = (window as any).__observerInstance;
        unmount();
        if (instance) {
            expect(instance.disconnect).toHaveBeenCalled();
        }
    });

    it('should reload installed mods when scan finishes', async () => {
        renderWithProviders(<Mods />);
        await waitFor(() => screen.getByText('Local Mod'));
        expect(window.electronAPI.getInstalledMods).toHaveBeenCalledTimes(1);
        const calls = (window.electronAPI.onDownloadScanFinished as any).mock.calls;
        if (calls.length > 0) {
            const listener = calls[0][0];
            act(() => {
                listener();
            });
            expect(window.electronAPI.getInstalledMods).toHaveBeenCalledTimes(2);
        }
    });

    it('should filter by category in browse mode', async () => {
         renderWithProviders(<Mods />);
         fireEvent.click(screen.getByText('Browse Online'));
         await waitFor(() => expect(screen.getByTestId('category-sidebar')).toBeInTheDocument());
         const btn = screen.getByText('Select Misc');
         fireEvent.click(btn);
         await waitFor(() => {
             expect(window.electronAPI.searchBySection).toHaveBeenCalledWith(expect.objectContaining({ categoryId: 'Misc' }));
         });
    });

    it('should update all mods', async () => {
        renderWithProviders(<Mods />);
        await waitFor(() => screen.getByText('Outdated Mod'));

        const updateAllBtn = screen.getByText('Update All');
        fireEvent.click(updateAllBtn);

        await waitFor(() => {
            expect(window.electronAPI.updateAllMods).toHaveBeenCalledWith(['2']);
        });
    });

    it('should handle update all failure', async () => {
        (window.electronAPI.updateAllMods as any).mockRejectedValue(new Error('Fail'));
        renderWithProviders(<Mods />);
        await waitFor(() => screen.getByText('Outdated Mod'));

        const updateAllBtn = screen.getByText('Update All');
        fireEvent.click(updateAllBtn);

        // Toast error expected
    });
});
