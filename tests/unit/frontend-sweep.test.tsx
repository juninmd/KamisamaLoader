// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Mods from '../../src/pages/Mods';
import { ToastProvider } from '../../src/components/ToastContext';
import { MockSettingsProvider } from './test-utils';
import ModDetailsModal from '../../src/components/ModDetailsModal';
import CategorySidebar from '../../src/components/CategorySidebar';

// Mocks
const mockElectronAPI = {
    getInstalledMods: vi.fn(),
    fetchCategories: vi.fn(),
    searchBySection: vi.fn(),
    checkForUpdates: vi.fn(),
    updateAllMods: vi.fn(),
    updateMod: vi.fn(),
    toggleMod: vi.fn(),
    installOnlineMod: vi.fn(),
    installMod: vi.fn(),
    uninstallMod: vi.fn(),
    setModPriority: vi.fn(),
    getModChangelog: vi.fn(),
    getModDetails: vi.fn(),
    onDownloadScanFinished: vi.fn(() => vi.fn()),
    removeListener: vi.fn(),
    getDownloads: vi.fn(),
    onDownloadProgress: vi.fn(() => vi.fn()),
    onDownloadUpdate: vi.fn(() => vi.fn()) // Added this
};

// Setup window.electronAPI before tests run
Object.defineProperty(window, 'electronAPI', { value: mockElectronAPI });

// IntersectionObserver Mock
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();

// Use a class or function so it can be 'new'ed
window.IntersectionObserver = class {
    constructor(callback: any) {
        (window as any).__intersectionCallback = callback;
    }
    observe = mockObserve;
    disconnect = mockDisconnect;
    unobserve = vi.fn();
} as any;

describe('Frontend Sweep', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default returns to prevent crashes
        mockElectronAPI.getModChangelog.mockResolvedValue([]);
        mockElectronAPI.getModDetails.mockResolvedValue({});
        mockElectronAPI.getDownloads.mockResolvedValue([]);
    });

    it('Mods - should handle Drag and Drop events', async () => {
        mockElectronAPI.getInstalledMods.mockResolvedValue([]);
        mockElectronAPI.fetchCategories.mockResolvedValue([]);

        render(
            <MockSettingsProvider>
                <ToastProvider>
                    <Mods />
                </ToastProvider>
            </MockSettingsProvider>
        );

        const container = screen.getByText('Installed').closest('div')?.parentElement?.parentElement; // Main container

        // Drag Enter
        fireEvent.dragEnter(container!, {
            dataTransfer: { items: ['file'] }
        });

        expect(screen.getByText('Drop to Install')).toBeInTheDocument();

        // Drag Leave
        fireEvent.dragLeave(container!);
        expect(screen.queryByText('Drop to Install')).not.toBeInTheDocument();

        // Drop
        const file = new File(['content'], 'mod.zip', { type: 'application/zip' });
        mockElectronAPI.installMod.mockResolvedValue({ success: true });

        // Re-trigger enter to show overlay (optional but realistic)
        fireEvent.dragEnter(container!, { dataTransfer: { items: ['file'] } });

        await act(async () => {
            fireEvent.drop(container!, {
                dataTransfer: { files: [file] }
            });
        });

        expect(mockElectronAPI.installMod).toHaveBeenCalled();
        expect(screen.queryByText('Drop to Install')).not.toBeInTheDocument();
    });

    it('Mods - should handle Deep Link event', async () => {
        mockElectronAPI.getInstalledMods.mockResolvedValue([]);

        let linkCallback: any;
        mockElectronAPI.onDownloadScanFinished.mockImplementation((cb: any) => {
            linkCallback = cb;
            return vi.fn(); // unsubscribe
        });

        render(
            <MockSettingsProvider>
                <ToastProvider>
                    <Mods />
                </ToastProvider>
            </MockSettingsProvider>
        );

        // Simulate deep link event
        await act(async () => {
            if (linkCallback) linkCallback();
        });

        // Should switch to downloads tab (or trigger a toast/reload)
        // Check if getInstalledMods was called again (reloaded)
        expect(mockElectronAPI.getInstalledMods).toHaveBeenCalledTimes(2); // Initial + Event
    });

    it('Mods - should filter local mods (Enabled/Disabled/Updates)', async () => {
        const mods = [
            { id: '1', name: 'Enabled Mod', author: 'A', isEnabled: true, hasUpdate: false, fileSize: 100 },
            { id: '2', name: 'Disabled Mod', author: 'B', isEnabled: false, hasUpdate: false, fileSize: 100 },
            { id: '3', name: 'Update Mod', author: 'C', isEnabled: true, hasUpdate: true, fileSize: 100 }
        ];
        mockElectronAPI.getInstalledMods.mockResolvedValue(mods);

        render(
            <MockSettingsProvider>
                <ToastProvider>
                    <Mods />
                </ToastProvider>
            </MockSettingsProvider>
        );

        await waitFor(() => expect(screen.getByText('Enabled Mod')).toBeInTheDocument());

        // Filter: Enabled
        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'enabled' } });
        expect(screen.queryByText('Disabled Mod')).not.toBeInTheDocument();
        expect(screen.getByText('Enabled Mod')).toBeInTheDocument();

        // Filter: Disabled
        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'disabled' } });
        expect(screen.queryByText('Enabled Mod')).not.toBeInTheDocument();
        expect(screen.getByText('Disabled Mod')).toBeInTheDocument();

        // Filter: Updates
        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'updates' } });
        expect(screen.queryByText('Disabled Mod')).not.toBeInTheDocument();
        expect(screen.getByText('Update Mod')).toBeInTheDocument();
    });

    it('CategorySidebar - should handle empty or invalid props gracefully', () => {
        const { rerender } = render(
             <CategorySidebar
                categories={undefined as any}
                selectedCategories={[]}
                onCategorySelect={vi.fn()}
            />
        );
        expect(screen.getByText('Categories')).toBeInTheDocument();

        rerender(
            <CategorySidebar
                categories={[]}
                selectedCategories={[]}
                onCategorySelect={vi.fn()}
            />
        );
         expect(screen.getByText('All Categories')).toBeInTheDocument();
    });

    it('ModDetailsModal - should handle image loading error fallback', () => {
        const mod = { id: '1', name: 'Test', gameBananaId: 123, iconUrl: 'fallback.jpg' };
        render(
            <ModDetailsModal
                mod={mod as any}
                isOpen={true}
                onClose={vi.fn()}
                onInstall={vi.fn()}
            />
        );

        // Find main image
        const img = screen.getAllByRole('img')[0];
        fireEvent.error(img);
        // Expect src to change to fallback (iconUrl)
        expect(img).toHaveAttribute('src', 'fallback.jpg');

        // Fire error again (fallback fails)
        fireEvent.error(img);
        // Expect display to be none (hidden)
        expect(img).not.toBeVisible();
    });

     it('ModDetailsModal - should handle fetchModDetails failure', async () => {
        const mod = { id: '1', name: 'Test', gameBananaId: 123 };
        mockElectronAPI.getInstalledMods.mockResolvedValue([]);
        // Force failure
        (mockElectronAPI as any).getModDetails = vi.fn().mockRejectedValue(new Error('API Fail'));

        render(
            <ModDetailsModal
                mod={mod as any}
                isOpen={true}
                onClose={vi.fn()}
                onInstall={vi.fn()}
            />
        );

        // Should not crash, maybe show error or just default view
        await waitFor(() => expect(screen.getByText('Test')).toBeInTheDocument());
        // Verify API was called
        expect((mockElectronAPI as any).getModDetails).toHaveBeenCalledWith(123);
    });
});
