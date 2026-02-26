/**
 * @vitest-environment happy-dom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Mods from '../../src/pages/Mods';
import { ToastProvider } from '../../src/components/ToastContext';
import { SettingsProvider } from '../../src/components/SettingsContext';

// Mock electronAPI
const mockElectronAPI = {
    getInstalledMods: vi.fn(),
    searchBySection: vi.fn(),
    fetchCategories: vi.fn(),
    onDownloadScanFinished: vi.fn(() => () => {}),
    uninstallMod: vi.fn(),
    setModPriority: vi.fn(),
    updateAllMods: vi.fn(),
    getSettings: vi.fn().mockResolvedValue({}),
    checkForUpdates: vi.fn().mockResolvedValue([]),
    getDownloads: vi.fn().mockResolvedValue([])
};

Object.defineProperty(window, 'electronAPI', {
    value: mockElectronAPI,
    writable: true
});

// Mock confirm
const originalConfirm = window.confirm;
const confirmMock = vi.fn();
window.confirm = confirmMock;

const renderMods = () => {
    return render(
        <SettingsProvider>
            <ToastProvider>
                <Mods />
            </ToastProvider>
        </SettingsProvider>
    );
};

describe('Mods Page Coverage Gaps', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockElectronAPI.getInstalledMods.mockResolvedValue([]);
        mockElectronAPI.searchBySection.mockResolvedValue([]);
        mockElectronAPI.fetchCategories.mockResolvedValue([]);
    });

    it('should not uninstall if user cancels confirmation', async () => {
        const mod = { id: '1', name: 'Test Mod', isEnabled: true };
        mockElectronAPI.getInstalledMods.mockResolvedValue([mod]);

        await act(async () => {
            renderMods();
        });

        // Wait for loading to finish and mod to appear
        await waitFor(() => expect(screen.getByText('Test Mod')).toBeInTheDocument());

        const deleteBtn = await waitFor(() => screen.getByRole('button', { name: /Uninstall/i }));

        confirmMock.mockReturnValue(false); // Cancel

        await act(async () => {
            fireEvent.click(deleteBtn);
        });

        expect(mockElectronAPI.uninstallMod).not.toHaveBeenCalled();
    });

    it('should handle priority change failure', async () => {
        const mod = { id: '1', name: 'Test Mod', isEnabled: true, priority: 1 };
        mockElectronAPI.getInstalledMods.mockResolvedValue([mod]);
        mockElectronAPI.setModPriority.mockResolvedValue(false); // Fail

        await act(async () => {
            renderMods();
        });

        // Wait for loading to finish
        await waitFor(() => expect(screen.getByText('Test Mod')).toBeInTheDocument());

        const upBtn = await waitFor(() => screen.getByTitle(/Increase Priority/i));

        await act(async () => {
            fireEvent.click(upBtn);
        });

        expect(screen.getByText('Failed to change priority')).toBeInTheDocument();
    });

    it('should uninstall mod when user confirms', async () => {
        const mod = { id: '1', name: 'Test Mod', isEnabled: true };
        mockElectronAPI.getInstalledMods.mockResolvedValue([mod]);
        mockElectronAPI.uninstallMod.mockResolvedValue({ success: true });

        confirmMock.mockReturnValue(true);

        await act(async () => {
            renderMods();
        });

        await waitFor(() => expect(screen.getByText('Test Mod')).toBeInTheDocument());

        const deleteBtn = await waitFor(() => screen.getByRole('button', { name: /Uninstall/i }));

        await act(async () => {
            fireEvent.click(deleteBtn);
        });

        expect(mockElectronAPI.uninstallMod).toHaveBeenCalledWith('1');
        // Should trigger reload
        expect(mockElectronAPI.getInstalledMods).toHaveBeenCalledTimes(2); // Initial + After uninstall
    });

    it('should handle mixed results in batch update', async () => {
        const mods = [
            { id: '1', name: 'Mod A', hasUpdate: true },
            { id: '2', name: 'Mod B', hasUpdate: true }
        ];
        mockElectronAPI.getInstalledMods.mockResolvedValue(mods);

        // Mock update result: 1 success, 1 fail
        mockElectronAPI.updateAllMods.mockResolvedValue({
            successCount: 1,
            failCount: 1,
            results: [{ id: '1', success: true }, { id: '2', success: false }]
        });

        await act(async () => {
            renderMods();
        });

        const updateAllBtn = await waitFor(() => screen.getByText('Update All'));

        await act(async () => {
            fireEvent.click(updateAllBtn);
        });

        expect(await screen.findByText(/Batch update finished/)).toBeInTheDocument();
        expect(screen.getByText(/Success: 1/)).toBeInTheDocument();
        expect(screen.getByText(/Failed: 1/)).toBeInTheDocument();
    });
});
