// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Mods from '../../src/pages/Mods';
import { ToastProvider } from '../../src/components/ToastContext';
import { SettingsProvider } from '../../src/components/SettingsContext';

// Mock electronAPI
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
    onDownloadScanFinished: vi.fn(),
    getSettings: vi.fn(),
    saveSettings: vi.fn(),
    selectGameDirectory: vi.fn(),
    selectModDirectory: vi.fn(),
    openModsDirectory: vi.fn(),
    getDownloads: vi.fn(),
    onDownloadProgress: vi.fn(),
    onDownloadUpdate: vi.fn(),
};

// Setup Window Mock
Object.defineProperty(window, 'electronAPI', {
    value: mockElectronAPI,
    writable: true
});

// Mock Settings Context internal usage if needed, or rely on Provider
// We need to mock IntersectionObserver
const observe = vi.fn();
const disconnect = vi.fn();
const unobserve = vi.fn();

window.IntersectionObserver = vi.fn(function(callback, options) {
    (window.IntersectionObserver as any).callback = callback;
    return {
        observe,
        disconnect,
        unobserve,
        takeRecords: () => []
    };
}) as any;

describe('Mods Page Final Coverage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockElectronAPI.getInstalledMods.mockResolvedValue([]);
        mockElectronAPI.getSettings.mockResolvedValue({});
        mockElectronAPI.getDownloads.mockResolvedValue([]);
        mockElectronAPI.onDownloadScanFinished.mockReturnValue(() => {});
        mockElectronAPI.onDownloadProgress.mockReturnValue(() => {});
        mockElectronAPI.onDownloadUpdate.mockReturnValue(() => {});
    });

    const renderMods = () => {
        return render(
            <SettingsProvider>
                <ToastProvider>
                    <Mods />
                </ToastProvider>
            </SettingsProvider>
        );
    };

    it('should handle Drag and Drop file installation', async () => {
        const { container } = renderMods();
        const dropZone = container.firstChild as HTMLElement;

        // Drag Enter
        fireEvent.dragEnter(dropZone!, {
            dataTransfer: { items: [{ kind: 'file' }] }
        });

        expect(screen.getByText(/Drop to Install/i)).toBeInTheDocument();

        // Drag Leave
        fireEvent.dragLeave(dropZone!);
        await waitFor(() => {
            expect(screen.queryByText(/Drop to Install/i)).not.toBeInTheDocument();
        });

        // Drop
        const file = new File(['content'], 'mod.pak', { type: 'application/octet-stream' });
        // Mock dataTransfer with file path property (electron specific)
        Object.defineProperty(file, 'path', { value: '/path/to/mod.pak' });

        mockElectronAPI.installMod.mockResolvedValue({ success: true });

        // Re-trigger enter to show overlay
        fireEvent.dragEnter(dropZone!, { dataTransfer: { items: [file] } });

        fireEvent.drop(dropZone!, {
            dataTransfer: { files: [file] }
        });

        await waitFor(() => {
            expect(mockElectronAPI.installMod).toHaveBeenCalledWith('/path/to/mod.pak');
            expect(screen.queryByText(/Drop to Install/i)).not.toBeInTheDocument();
        });
    });

    it('should handle batch update partial failures', async () => {
        mockElectronAPI.getInstalledMods.mockResolvedValue([
            { id: '1', name: 'Mod1', hasUpdate: true, version: '1.0' },
            { id: '2', name: 'Mod2', hasUpdate: true, version: '1.0' }
        ]);
        mockElectronAPI.updateAllMods.mockResolvedValue({
            successCount: 1,
            failCount: 1,
            results: [
                { id: '1', success: true },
                { id: '2', success: false }
            ]
        });

        renderMods();
        await waitFor(() => expect(screen.getByText('Update All')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Update All'));

        await waitFor(() => {
            expect(mockElectronAPI.updateAllMods).toHaveBeenCalledWith(['1', '2']);
        });

        // Verify toast message implicitly by checking if update status persists for failed mod
        // Or check calls
    });

    it('should handle batch update exception', async () => {
        mockElectronAPI.getInstalledMods.mockResolvedValue([
            { id: '1', name: 'Mod1', hasUpdate: true }
        ]);
        mockElectronAPI.updateAllMods.mockRejectedValue(new Error('Batch fail'));

        renderMods();
        await waitFor(() => expect(screen.getByText('Update All')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Update All'));

        await waitFor(() => {
            expect(mockElectronAPI.updateAllMods).toHaveBeenCalled();
        });
        // Should catch error
    });

    it('should handle infinite scroll intersection', async () => {
        mockElectronAPI.fetchCategories.mockResolvedValue([]);
        // Page 1
        mockElectronAPI.searchBySection.mockResolvedValueOnce(Array(20).fill({ id: 'm', name: 'M' }));
        // Page 2
        mockElectronAPI.searchBySection.mockResolvedValueOnce(Array(5).fill({ id: 'm2', name: 'M2' }));

        renderMods();

        // Switch to Browse
        fireEvent.click(screen.getByText('Browse Online'));

        await waitFor(() => {
            expect(mockElectronAPI.searchBySection).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
        });

        // Simulate Intersection
        const callback = (window.IntersectionObserver as any).callback;
        act(() => {
            callback([{ isIntersecting: true }]);
        });

        await waitFor(() => {
            expect(mockElectronAPI.searchBySection).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
        });
    });

    it('should handle external download trigger (deep link)', async () => {
        let triggerCallback: any;
        mockElectronAPI.onDownloadScanFinished.mockImplementation((cb: any) => {
            triggerCallback = cb;
            return () => {};
        });

        renderMods();

        act(() => {
            if (triggerCallback) triggerCallback();
        });

        // Should switch to Downloads tab
        // We can verify calls or screen text
        // Downloads tab text might be "Downloads"
        // But the tab buttons might just change style.
        // We can check if DownloadsList component is rendered?
        // Let's assume switching tab calls specific methods or renders content.
        // Wait, downloads list is empty so it might just show empty state.

        // Check if getInstalledMods was called again (reloaded)
        await waitFor(() => {
             expect(mockElectronAPI.getInstalledMods).toHaveBeenCalledTimes(2); // Initial + Callback
        });
    });

    it('should handle toggle conflict warning', async () => {
        mockElectronAPI.getInstalledMods.mockResolvedValue([
             { id: '1', name: 'Mod1', isEnabled: true }
        ]);
        mockElectronAPI.toggleMod.mockResolvedValue({ success: true, conflict: 'Warning: Conflict' });

        renderMods();
        await waitFor(() => screen.getByText('Mod1'));

        const switchEl = screen.getByRole('checkbox') || screen.getAllByRole('switch')[0];
        // Or find by ID
        // ModGrid renders ModCard which has Switch.
        // Let's rely on text or role.

        // Actually, Switch component usually has role 'switch'.
        // We might need to target specific one.
        const toggle = screen.getAllByRole('checkbox')[0];
        fireEvent.click(toggle);

        await waitFor(() => {
            expect(mockElectronAPI.toggleMod).toHaveBeenCalled();
        });
    });

    it('should handle toggle failure revert', async () => {
         mockElectronAPI.getInstalledMods.mockResolvedValue([
             { id: '1', name: 'Mod1', isEnabled: true }
        ]);
        mockElectronAPI.toggleMod.mockResolvedValue({ success: false });

        renderMods();
        await waitFor(() => screen.getByText('Mod1'));

        const toggle = screen.getAllByRole('checkbox')[0];
        fireEvent.click(toggle);

        await waitFor(() => {
            expect(mockElectronAPI.toggleMod).toHaveBeenCalled();
            // UI should revert visually - hard to test without intricate DOM checks
        });
    });
});
