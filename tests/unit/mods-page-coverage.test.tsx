// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor, act } from './test-utils';
import Mods from '../../src/pages/Mods';

// Mock electron API
const mockElectronAPI = {
    getInstalledMods: vi.fn(),
    searchBySection: vi.fn(),
    fetchCategories: vi.fn(),
    installMod: vi.fn(),
    installOnlineMod: vi.fn(),
    updateAllMods: vi.fn(),
    checkForUpdates: vi.fn(),
    onDownloadScanFinished: vi.fn(() => () => {}),
    getProfiles: vi.fn().mockResolvedValue([]),
    saveSettings: vi.fn().mockResolvedValue(true),
    getSettings: vi.fn().mockResolvedValue({}),
    getModChangelog: vi.fn(),
    toggleMod: vi.fn(),
    uninstallMod: vi.fn(),
    setModPriority: vi.fn(),
    updateMod: vi.fn(),
};

Object.defineProperty(window, 'electronAPI', {
    value: mockElectronAPI,
    writable: true
});

// Mock IntersectionObserver
const observe = vi.fn();
const disconnect = vi.fn();
window.IntersectionObserver = vi.fn(function() {
    return {
        observe,
        disconnect,
        unobserve: vi.fn(),
        takeRecords: vi.fn()
    };
}) as any;

describe('Mods Page Coverage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockElectronAPI.getInstalledMods.mockResolvedValue([]);
        mockElectronAPI.searchBySection.mockResolvedValue([]);
        mockElectronAPI.fetchCategories.mockResolvedValue([]);
    });

    it('should handle drag and drop installation', async () => {
        mockElectronAPI.installMod.mockResolvedValue({ success: true });

        const { container } = renderWithProviders(<Mods />);
        const dropZone = container.firstChild as HTMLElement;

        // Simulate drag enter
        fireEvent.dragEnter(dropZone, {
            dataTransfer: { items: [{ kind: 'file' }] }
        });

        expect(screen.getByText('Drop to Install')).toBeInTheDocument();

        // Simulate drop
        await act(async () => {
            fireEvent.drop(dropZone, {
                dataTransfer: { files: [{ path: '/path/to/mod.zip' }] }
            });
        });

        expect(mockElectronAPI.installMod).toHaveBeenCalledWith('/path/to/mod.zip');
        // Drop overlay should disappear
        expect(screen.queryByText('Drop to Install')).not.toBeInTheDocument();
    });

    it('should handle install error during drag and drop', async () => {
        mockElectronAPI.installMod.mockResolvedValue({ success: false, message: 'Install failed' });

        const { container } = renderWithProviders(<Mods />);
        const dropZone = container.firstChild as HTMLElement;

        await act(async () => {
            fireEvent.drop(dropZone, {
                dataTransfer: { files: [{ path: '/path/to/mod.zip' }] }
            });
        });

        expect(await screen.findByText('Install failed')).toBeInTheDocument();
    });

    it('should handle online install error', async () => {
        mockElectronAPI.searchBySection.mockResolvedValue([
            { gameBananaId: 1, name: 'Online Mod', author: 'Author' }
        ]);
        mockElectronAPI.installOnlineMod.mockResolvedValue({ success: false, message: 'Online Install Failed' });

        renderWithProviders(<Mods />);

        // Switch to Browse tab
        fireEvent.click(screen.getByText('Browse Online'));

        await waitFor(() => expect(screen.getByText('Online Mod')).toBeInTheDocument());

        const installBtn = screen.getByRole('button', { name: /^Download$/i });
        fireEvent.click(installBtn);

        expect(await screen.findByText('Online Install Failed')).toBeInTheDocument();
    });

     it('should handle update all error', async () => {
        mockElectronAPI.getInstalledMods.mockResolvedValue([
            { id: '1', name: 'Mod1', hasUpdate: true, fileSize: 1024, author: 'A' }
        ]);
        mockElectronAPI.updateAllMods.mockRejectedValue(new Error('Update failed'));

        renderWithProviders(<Mods />);

        await waitFor(() => expect(screen.getByText('Update All')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Update All'));

        expect(await screen.findByText('Batch update failed')).toBeInTheDocument();
    });
});
