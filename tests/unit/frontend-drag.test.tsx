// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Mods from '../../src/pages/Mods';
import { SettingsContext } from '../../src/components/SettingsContext';
import { ToastProvider } from '../../src/components/ToastContext';
import React from 'react';

// Mock electronAPI
const mockElectron = {
    getInstalledMods: vi.fn(),
    searchBySection: vi.fn(),
    fetchCategories: vi.fn(),
    installMod: vi.fn(),
    getProfiles: vi.fn().mockResolvedValue([]),
    getSettings: vi.fn().mockResolvedValue({}),
    onDownloadScanFinished: vi.fn(() => () => { }),
    onDownloadProgress: vi.fn(() => () => { }),
    onDownloadComplete: vi.fn(() => () => { }),
    checkForUpdates: vi.fn().mockResolvedValue([]),
    getModChangelog: vi.fn().mockResolvedValue([]),
    updateAllMods: vi.fn().mockResolvedValue({ successCount: 0, failCount: 0, results: [] }),
    updateMod: vi.fn().mockResolvedValue(true),
    toggleMod: vi.fn().mockResolvedValue({ success: true }),
    uninstallMod: vi.fn().mockResolvedValue({ success: true }),
    setModPriority: vi.fn().mockResolvedValue(true),
    installOnlineMod: vi.fn().mockResolvedValue({ success: true })
};

Object.defineProperty(window, 'electronAPI', {
    value: mockElectron,
    writable: true
});

const MockSettingsProvider = ({ children }: { children: React.ReactNode }) => (
    <SettingsContext.Provider value={{
        settings: { gamePath: '/mock', modDownloadPath: '/mods' },
        updateSettings: vi.fn(),
        selectGameDirectory: vi.fn(),
        selectModDirectory: vi.fn(),
        selectBackgroundImage: vi.fn(),
        loading: false
    }}>
        {children}
    </SettingsContext.Provider>
);

const renderWithProviders = (component: React.ReactNode) => {
    return render(
        <MockSettingsProvider>
            <ToastProvider>
                {component}
            </ToastProvider>
        </MockSettingsProvider>
    );
};

describe('Frontend Drag & Drop', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockElectron.getInstalledMods.mockResolvedValue([]);
    });

    it('should show overlay on drag enter', async () => {
        await act(async () => {
            renderWithProviders(<Mods />);
        });
        const container = screen.getByPlaceholderText('Search installed mods...').closest('div')?.parentElement?.parentElement?.parentElement;

        await act(async () => {
            fireEvent.dragEnter(container!, {
                dataTransfer: { items: [{ kind: 'file' }] }
            });
        });

        expect(screen.getByText('Drop to Install')).toBeInTheDocument();
    });

    it('should hide overlay on drag leave', async () => {
        await act(async () => {
            renderWithProviders(<Mods />);
        });
        const container = screen.getByPlaceholderText('Search installed mods...').closest('div')?.parentElement?.parentElement?.parentElement;

        await act(async () => {
            fireEvent.dragEnter(container!, {
                dataTransfer: { items: [{ kind: 'file' }] }
            });
        });
        expect(screen.getByText('Drop to Install')).toBeInTheDocument();

        await act(async () => {
            fireEvent.dragLeave(container!);
        });
        expect(screen.queryByText('Drop to Install')).not.toBeInTheDocument();
    });

    it('should handle drop success', async () => {
        mockElectron.installMod.mockResolvedValue({ success: true });
        await act(async () => {
            renderWithProviders(<Mods />);
        });
        const container = screen.getByPlaceholderText('Search installed mods...').closest('div')?.parentElement?.parentElement?.parentElement;

        const file = new File([''], 'mod.zip', { type: 'application/zip' });
        // Add path property manually as it's Electron specific
        Object.defineProperty(file, 'path', { value: '/path/mod.zip' });

        await act(async () => {
            fireEvent.drop(container!, {
                dataTransfer: { files: [file] }
            });
        });

        await waitFor(() => expect(mockElectron.installMod).toHaveBeenCalledWith('/path/mod.zip'));
    });
});
