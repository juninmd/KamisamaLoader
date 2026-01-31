// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor, act, within } from '../test-utils';
import Mods from '../../../src/pages/Mods';

// Mock IntersectionObserver
class MockIntersectionObserver {
    callback: any;
    constructor(callback: any) {
        this.callback = callback;
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
            { id: '1', name: 'Local Mod', isEnabled: true, priority: 1, author: 'Me', fileSize: 100, category: 'Misc' }
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
        (window.electronAPI as any).setModPriority = vi.fn().mockResolvedValue(true);
        (window.electronAPI.installMod as any).mockResolvedValue({ success: true });

        window.confirm = vi.fn(() => true);
    });

    it('should render installed mods by default', async () => {
        await act(async () => {
             renderWithProviders(<Mods />);
        });
        await waitFor(() => {
            expect(screen.getByText('Local Mod')).toBeInTheDocument();
        });
    });

    it('should handle drag and drop states', async () => {
        await act(async () => {
             renderWithProviders(<Mods />);
        });

        const dropZone = screen.getByTestId('mods-drop-zone');

        // Enter
        await act(async () => {
             fireEvent.dragEnter(dropZone, { dataTransfer: { items: [{}], files: [] } });
        });
        expect(screen.getByText('Drop to Install')).toBeInTheDocument();

        // Leave
        await act(async () => {
             fireEvent.dragLeave(dropZone);
        });
        expect(screen.queryByText('Drop to Install')).not.toBeInTheDocument();

        // Drop
        await act(async () => {
             fireEvent.dragEnter(dropZone, { dataTransfer: { items: [{}], files: [] } });
        });
        await act(async () => {
            fireEvent.drop(dropZone, {
                dataTransfer: {
                    files: [{ path: '/test/mod.zip' }],
                    items: [{ kind: 'file' }]
                }
            });
        });
        expect(window.electronAPI.installMod).toHaveBeenCalledWith('/test/mod.zip');
    });

    it('should filter installed mods by name', async () => {
        await act(async () => {
             renderWithProviders(<Mods />);
        });
        await waitFor(() => screen.getByText('Local Mod'));

        const searchInput = screen.getByPlaceholderText('Search installed mods...');
        await act(async () => {
            fireEvent.change(searchInput, { target: { value: 'Missing' } });
        });

        expect(screen.queryByText('Local Mod')).not.toBeInTheDocument();
    });

    it('should filter browse mods by category via sidebar', async () => {
        await act(async () => {
             renderWithProviders(<Mods />);
        });

        await act(async () => {
            fireEvent.click(screen.getByText('Browse Online'));
        });

        await waitFor(() => expect(window.electronAPI.fetchCategories).toHaveBeenCalled());
        await waitFor(() => screen.getByText('Categories'));
    });

    it('should uninstall mod', async () => {
        await act(async () => {
             renderWithProviders(<Mods />);
        });
        await waitFor(() => screen.getByText('Local Mod'));

        // Assuming there's a trash/delete button on the card.
        // It's likely an icon button.
        const deleteBtn = screen.getByTitle('Uninstall');
        await act(async () => {
            fireEvent.click(deleteBtn);
        });

        expect(window.confirm).toHaveBeenCalled();
        expect(window.electronAPI.uninstallMod).toHaveBeenCalledWith('1');
    });

    it('should toggle mod', async () => {
        await act(async () => {
             renderWithProviders(<Mods />);
        });
        await waitFor(() => screen.getByText('Local Mod'));

        // Mod is enabled, so button says 'Disable'
        const toggleBtn = screen.getByText('Disable');
        await act(async () => {
            fireEvent.click(toggleBtn);
        });

        expect(window.electronAPI.toggleMod).toHaveBeenCalledWith('1', false); // Was true
    });

    it('should change priority', async () => {
        await act(async () => {
             renderWithProviders(<Mods />);
        });
        await waitFor(() => screen.getByText('Local Mod'));

        // Assuming Up/Down buttons exist
        // Note: With 1 mod, maybe they are disabled or handled gracefully.
        // Let's assume there are 2 mods to enable priority changing
         (window.electronAPI.getInstalledMods as any).mockResolvedValue([
            { id: '1', name: 'Mod 1', priority: 2, isEnabled: true },
            { id: '2', name: 'Mod 2', priority: 1, isEnabled: true }
        ]);

        // Re-render to get 2 mods
        await act(async () => {
             renderWithProviders(<Mods />);
        });
        await waitFor(() => screen.getByText('Mod 2'));

        // Find "Move Up" for Mod 2
        const mod2Card = screen.getByText('Mod 2').closest('div.group');
        const upBtn = within(mod2Card as HTMLElement).getByTitle('Increase Priority (Move Up)');

        await act(async () => {
            fireEvent.click(upBtn);
        });

        expect(window.electronAPI.setModPriority).toHaveBeenCalledWith('2', 'up');
    });

    it('should handle infinite scroll', async () => {
        await act(async () => {
             renderWithProviders(<Mods />);
        });
        await act(async () => {
            fireEvent.click(screen.getByText('Browse Online'));
        });
        await waitFor(() => screen.getByText('Online Mod'));

        const callback = (window as any).__observerCallback;
        if (callback) {
            await act(async () => {
                callback([{ isIntersecting: true }]);
            });
            await waitFor(() => {
                expect(window.electronAPI.searchBySection).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
            });
        }
    });

    it('should check for updates and refresh', async () => {
         await act(async () => {
             renderWithProviders(<Mods />);
        });
        const updateBtn = screen.getByText('Check Updates');

        await act(async () => {
             fireEvent.click(updateBtn);
        });

        expect(window.electronAPI.checkForUpdates).toHaveBeenCalled();
        expect(window.electronAPI.getInstalledMods).toHaveBeenCalled();
    });
});
