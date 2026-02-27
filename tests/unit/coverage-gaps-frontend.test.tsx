import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Mods from '../../src/pages/Mods';
import Settings from '../../src/pages/Settings';
import { ToastProvider } from '../../src/components/ToastContext';
import { SettingsProvider } from '../../src/components/SettingsContext';

// --- Mocks ---

const mockElectronAPI = {
    getInstalledMods: vi.fn(),
    searchBySection: vi.fn(),
    fetchCategories: vi.fn(),
    installMod: vi.fn(),
    installOnlineMod: vi.fn(),
    uninstallMod: vi.fn(),
    toggleMod: vi.fn(),
    setModPriority: vi.fn(),
    onDownloadScanFinished: vi.fn(),
    checkForUpdates: vi.fn(),
    updateMod: vi.fn(),
    updateAllMods: vi.fn(),
    getSettings: vi.fn(),
    saveSettings: vi.fn(),
    selectGameDirectory: vi.fn(),
    selectModDirectory: vi.fn(),
    selectBackgroundImage: vi.fn(),
    installUE4SS: vi.fn()
};

// @vitest-environment happy-dom

// Setup window.electronAPI
Object.defineProperty(window, 'electronAPI', {
    value: mockElectronAPI,
    writable: true
});

// Mock Icons
vi.mock('lucide-react', () => ({
    Search: () => <div data-testid="icon-search" />,
    Download: () => <div data-testid="icon-download" />,
    RefreshCw: () => <div data-testid="icon-refresh" />,
    UploadCloud: () => <div data-testid="icon-upload" />,
    ChevronDown: () => <div data-testid="icon-chevron" />,
    Filter: () => <div data-testid="icon-filter" />,
    MoreVertical: () => <div data-testid="icon-more" />,
    Trash2: () => <div data-testid="icon-trash" />,
    Play: () => <div data-testid="icon-play" />,
    Pause: () => <div data-testid="icon-pause" />,
    FolderOpen: () => <div data-testid="icon-folder" />,
    X: () => <div data-testid="icon-close" />,
    XCircle: () => <div data-testid="icon-x-circle" />,
    Info: () => <div data-testid="icon-info" />,
    CheckCircle: () => <div data-testid="icon-check-circle" />,
    AlertCircle: () => <div data-testid="icon-alert-circle" />,
    AlertTriangle: () => <div data-testid="icon-alert-triangle" />,
    LogOut: () => <div data-testid="icon-logout" />
}));

// Mock ProfileManager which might be causing issues if not mocked
vi.mock('../../src/components/ProfileManager', () => ({
    default: () => <div data-testid="profile-manager" />
}));

describe('Frontend Coverage Gaps', () => {

    describe('Mods Page - Drag and Drop', () => {
        beforeEach(() => {
            vi.clearAllMocks();
            mockElectronAPI.getInstalledMods.mockResolvedValue([]);
            mockElectronAPI.searchBySection.mockResolvedValue([]);
            mockElectronAPI.fetchCategories.mockResolvedValue([]);
            mockElectronAPI.onDownloadScanFinished.mockReturnValue(() => {});
        });

        it('should show overlay on drag enter and hide on drag leave', async () => {
             // Re-render to get container handle
            const { container } = render(
                <SettingsProvider>
                    <ToastProvider>
                        <Mods />
                    </ToastProvider>
                </SettingsProvider>
            );

            // Wait for initial effects
            await act(async () => { await new Promise(r => setTimeout(r, 0)); });

            // The root div of Mods component
            const dropZone = container.firstChild as HTMLElement;

            // Simulate Drag Enter
            await act(async () => {
                fireEvent.dragEnter(dropZone, {
                    dataTransfer: {
                        items: [{ kind: 'file' }]
                    }
                });
            });

            expect(screen.getByText('Drop to Install')).toBeInTheDocument();

            // Simulate Drag Leave
            await act(async () => {
                fireEvent.dragLeave(dropZone);
            });

            expect(screen.queryByText('Drop to Install')).not.toBeInTheDocument();
        });

        it('should handle file drop and trigger install', async () => {
            mockElectronAPI.installMod.mockResolvedValue({ success: true });

            const { container } = render(
                <SettingsProvider>
                    <ToastProvider>
                        <Mods />
                    </ToastProvider>
                </SettingsProvider>
            );

            await act(async () => { await new Promise(r => setTimeout(r, 0)); });
            const dropZone = container.firstChild as HTMLElement;

            // Trigger drag enter first to set state if needed
            await act(async () => {
                fireEvent.dragEnter(dropZone, { dataTransfer: { items: [{ kind: 'file' }] } });
            });

            // Trigger Drop
            await act(async () => {
                const file = new File(['dummy'], 'mod.zip', { type: 'application/zip' });
                Object.defineProperty(file, 'path', { value: '/path/to/mod.zip' }); // Electron specific

                fireEvent.drop(dropZone, {
                    dataTransfer: {
                        files: [file],
                        items: [{ kind: 'file', type: 'application/zip' }]
                    }
                });
            });

            expect(mockElectronAPI.installMod).toHaveBeenCalledWith('/path/to/mod.zip');
            expect(screen.queryByText('Drop to Install')).not.toBeInTheDocument();
        });

        it('should show error toast if install fails', async () => {
            mockElectronAPI.installMod.mockResolvedValue({ success: false, message: 'Invalid File' });

            const { container } = render(
                <SettingsProvider>
                    <ToastProvider>
                        <Mods />
                    </ToastProvider>
                </SettingsProvider>
            );

            await act(async () => { await new Promise(r => setTimeout(r, 0)); });
            const dropZone = container.firstChild as HTMLElement;

            await act(async () => {
                 fireEvent.dragEnter(dropZone, { dataTransfer: { items: [{ kind: 'file' }] } });
            });

            await act(async () => {
                const file = new File(['dummy'], 'mod.zip');
                Object.defineProperty(file, 'path', { value: '/path/to/mod.zip' });

                fireEvent.drop(dropZone, {
                    dataTransfer: { files: [file] }
                });
            });

            expect(await screen.findByText('Invalid File')).toBeInTheDocument();
        });
    });

    describe('Settings Page Interactions', () => {
        beforeEach(() => {
            vi.clearAllMocks();
            mockElectronAPI.getSettings.mockResolvedValue({ gamePath: '/game' });
            mockElectronAPI.saveSettings.mockResolvedValue(true);
        });

        it('should handle UE4SS install success', async () => {
            mockElectronAPI.installUE4SS.mockResolvedValue({ success: true, message: 'UE4SS Installed' });

            await act(async () => {
                render(
                    <SettingsProvider>
                        <ToastProvider>
                            <Settings />
                        </ToastProvider>
                    </SettingsProvider>
                );
            });

            const installBtn = screen.getByText('Install / Update UE4SS');

            await act(async () => {
                fireEvent.click(installBtn);
            });

            expect(mockElectronAPI.installUE4SS).toHaveBeenCalled();
            expect(await screen.findByText('UE4SS Installed')).toBeInTheDocument();
        });

        it('should handle UE4SS install failure', async () => {
            mockElectronAPI.installUE4SS.mockResolvedValue({ success: false, message: 'Install Failed' });

            await act(async () => {
                render(
                    <SettingsProvider>
                        <ToastProvider>
                            <Settings />
                        </ToastProvider>
                    </SettingsProvider>
                );
            });

            const installBtn = screen.getByText('Install / Update UE4SS');

            await act(async () => {
                fireEvent.click(installBtn);
            });

            expect(await screen.findByText('Install Failed')).toBeInTheDocument();
        });

        it('should handle select game directory', async () => {
            mockElectronAPI.selectGameDirectory.mockResolvedValue('/new/game/path');

            await act(async () => {
                render(
                    <SettingsProvider>
                        <ToastProvider>
                            <Settings />
                        </ToastProvider>
                    </SettingsProvider>
                );
            });

            // Find Browse button for Game Directory
            // There are multiple Browse buttons. We can find by parent text or role order.
            // Game Dir is the first one.
            const browseBtns = screen.getAllByText('Browse');
            const gameDirBrowse = browseBtns[0];

            await act(async () => {
                fireEvent.click(gameDirBrowse);
            });

            expect(mockElectronAPI.selectGameDirectory).toHaveBeenCalled();
            expect(mockElectronAPI.saveSettings).toHaveBeenCalledWith(expect.objectContaining({ gamePath: '/new/game/path' }));
        });

        it('should handle select mod directory', async () => {
             mockElectronAPI.selectModDirectory.mockResolvedValue('/new/mod/path');

             await act(async () => {
                render(
                    <SettingsProvider>
                        <ToastProvider>
                            <Settings />
                        </ToastProvider>
                    </SettingsProvider>
                );
            });

            const browseBtns = screen.getAllByText('Browse');
            const modDirBrowse = browseBtns[1];

            await act(async () => {
                fireEvent.click(modDirBrowse);
            });

            expect(mockElectronAPI.selectModDirectory).toHaveBeenCalled();
            expect(mockElectronAPI.saveSettings).toHaveBeenCalledWith(expect.objectContaining({ modDownloadPath: '/new/mod/path' }));
        });

         it('should handle background image selection', async () => {
             mockElectronAPI.selectBackgroundImage.mockResolvedValue('file:///bg.jpg');

             await act(async () => {
                render(
                    <SettingsProvider>
                        <ToastProvider>
                            <Settings />
                        </ToastProvider>
                    </SettingsProvider>
                );
            });

            const browseBtns = screen.getAllByText('Browse');
            const bgBrowse = browseBtns[2];

            await act(async () => {
                fireEvent.click(bgBrowse);
            });

            expect(mockElectronAPI.selectBackgroundImage).toHaveBeenCalled();
            expect(mockElectronAPI.saveSettings).toHaveBeenCalledWith(expect.objectContaining({ backgroundImage: 'file:///bg.jpg' }));
        });
    });
});
