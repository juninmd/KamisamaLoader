// @vitest-environment happy-dom
import './Mods.fixture';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '../test-utils';
import Mods from '../../../src/pages/Mods';
describe('Mods Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        (window.electronAPI.getInstalledMods as any).mockResolvedValue([
            { id: '1', name: 'Local Mod', isEnabled: true, priority: 1, author: 'Me', fileSize: 100, hasUpdate: false },
            { id: '2', name: 'Outdated Mod', isEnabled: true, priority: 2, author: 'Me', fileSize: 100, hasUpdate: true }
        ]);
        (window.electronAPI.getAllOnlineMods as any).mockResolvedValue([
            { id: '10', name: 'Online Mod', author: 'Them', category: 'Misc', gameBananaId: 10 }
        ]);
        (window.electronAPI.searchBySection as any).mockImplementation((options: any) => {
            if (options.search && options.search === 'Nothing')
                return Promise.resolve([]);
            if (options.search === 'Error')
                return Promise.reject(new Error('API Fail'));
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
        window.confirm = vi.fn(() => true);
    });
    afterEach(() => {
        vi.useRealTimers();
    });
    it('should toggle mod', async () => {
        renderWithProviders(<Mods />);
        await waitFor(() => screen.getByText('Local Mod'));
        const searchInput = screen.getByPlaceholderText('Search installed mods...');
        fireEvent.change(searchInput, { target: { value: 'Missing' } });
        expect(screen.queryByText('Local Mod')).not.toBeInTheDocument();
    });
});
describe('Mods Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        (window.electronAPI.getInstalledMods as any).mockResolvedValue([
            { id: '1', name: 'Local Mod', isEnabled: true, priority: 1, author: 'Me', fileSize: 100, hasUpdate: false },
            { id: '2', name: 'Outdated Mod', isEnabled: true, priority: 2, author: 'Me', fileSize: 100, hasUpdate: true }
        ]);
        (window.electronAPI.getAllOnlineMods as any).mockResolvedValue([
            { id: '10', name: 'Online Mod', author: 'Them', category: 'Misc', gameBananaId: 10 }
        ]);
        (window.electronAPI.searchBySection as any).mockImplementation((options: any) => {
            if (options.search && options.search === 'Nothing')
                return Promise.resolve([]);
            if (options.search === 'Error')
                return Promise.reject(new Error('API Fail'));
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
        window.confirm = vi.fn(() => true);
    });
    afterEach(() => {
        vi.useRealTimers();
    });
    it('should filter installed mods', async () => {
        renderWithProviders(<Mods />);
        await waitFor(() => screen.getByText('Local Mod'));
    });
});
