// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import Mods from '../../src/pages/Mods';
import MainLayout from '../../src/layouts/MainLayout';
import { renderWithProviders } from './test-utils';

// Mock electronAPI
const mockElectronAPI = {
  getInstalledMods: vi.fn(),
  searchBySection: vi.fn(),
  fetchCategories: vi.fn(),
  onDownloadScanFinished: vi.fn().mockReturnValue(vi.fn()),
  checkForUpdates: vi.fn(),
  updateAllMods: vi.fn(),
  updateMod: vi.fn(),
  toggleMod: vi.fn(),
  installOnlineMod: vi.fn(),
  uninstallMod: vi.fn(),
  setModPriority: vi.fn(),
  installMod: vi.fn(),
  getModChangelog: vi.fn(),
  getProfiles: vi.fn(),
  getSettings: vi.fn(),
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
});

window.confirm = vi.fn();

describe('Frontend Final Coverage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockElectronAPI.getInstalledMods.mockResolvedValue([]);
        mockElectronAPI.fetchCategories.mockResolvedValue([]);
        mockElectronAPI.getProfiles.mockResolvedValue([]);
        mockElectronAPI.getSettings.mockResolvedValue({ gamePath: '' });
    });

    it('MainLayout should apply background image style', async () => {
        // Mock Settings Provider uses initialSettings prop, not API call
        const settings = {
            gamePath: '/game',
            backgroundImage: 'file://bg.jpg',
            backgroundOpacity: 0.5
        };

        await act(async () => {
             renderWithProviders(
                <MainLayout activePage="dashboard" onNavigate={vi.fn()}>
                    <div>Child</div>
                </MainLayout>,
                { initialSettings: settings }
            );
        });

        await waitFor(() => {
            const container = screen.getByText('Child').closest('.flex.h-screen');
            // Check style directly or via computing styles.
            // Note: toHaveStyle might need exact string match or url normalization
            expect(container).toHaveStyle({ backgroundImage: 'url(file://bg.jpg)' });
        });
    });

    it('Mods should handle drag and drop installation', async () => {
        mockElectronAPI.installMod.mockResolvedValue({ success: true });

        await act(async () => {
            renderWithProviders(<Mods />);
        });

        const container = screen.getByText('Installed').closest('div.h-full'); // Main container

        // Drag Enter
        await act(async () => {
            fireEvent.dragEnter(container!, {
                dataTransfer: { items: [{ kind: 'file' }] }
            });
        });

        expect(screen.getByText('Drop to Install')).toBeInTheDocument();

        // Drag Leave
        await act(async () => {
            fireEvent.dragLeave(container!);
        });

        expect(screen.queryByText('Drop to Install')).not.toBeInTheDocument();

        // Drop
        const file = new File(['dummy'], 'mod.zip', { type: 'application/zip' });
        // Enhance file object with path property which electron uses
        Object.defineProperty(file, 'path', { value: '/path/to/mod.zip' });

        await act(async () => {
            fireEvent.drop(container!, {
                dataTransfer: { files: [file], items: [{ kind: 'file' }] }
            });
        });

        expect(mockElectronAPI.installMod).toHaveBeenCalledWith('/path/to/mod.zip');
    });

    it('Mods should handle drag drop failure', async () => {
        mockElectronAPI.installMod.mockResolvedValue({ success: false, message: 'Failed' });

        await act(async () => {
            renderWithProviders(<Mods />);
        });

        const container = screen.getByText('Installed').closest('div.h-full');
        const file = new File(['dummy'], 'mod.zip', { type: 'application/zip' });
        Object.defineProperty(file, 'path', { value: '/path/to/mod.zip' });

        await act(async () => {
            fireEvent.drop(container!, {
                dataTransfer: { files: [file], items: [{ kind: 'file' }] }
            });
        });

        expect(mockElectronAPI.installMod).toHaveBeenCalled();
        // Toast would show error
    });

    it('Mods should handle check updates and update all', async () => {
        const mod = { id: '1', name: 'Mod 1', isEnabled: true, hasUpdate: true, version: '1.0', latestVersion: '2.0' };
        mockElectronAPI.getInstalledMods.mockResolvedValue([mod]);
        mockElectronAPI.checkForUpdates.mockResolvedValue(['1']);

        await act(async () => {
            renderWithProviders(<Mods />);
        });

        await waitFor(() => expect(screen.getByText('Mod 1')).toBeInTheDocument());

        // Check Updates
        const checkBtn = screen.getByText('Check Updates');
        await act(async () => {
            fireEvent.click(checkBtn);
        });

        expect(mockElectronAPI.checkForUpdates).toHaveBeenCalled();

        // Update All
        mockElectronAPI.updateAllMods.mockResolvedValue({
            successCount: 1,
            failCount: 0,
            results: [{ id: '1', success: true }]
        });

        await waitFor(() => expect(screen.getByText('Update All')).toBeInTheDocument());
        const updateAllBtn = screen.getByText('Update All');

        await act(async () => {
            fireEvent.click(updateAllBtn);
        });

        expect(mockElectronAPI.updateAllMods).toHaveBeenCalledWith(['1']);
    });

    it('Mods should handle batch update failure', async () => {
        const mod = { id: '1', name: 'Mod 1', isEnabled: true, hasUpdate: true };
        mockElectronAPI.getInstalledMods.mockResolvedValue([mod]);
        mockElectronAPI.updateAllMods.mockRejectedValue(new Error('Batch fail'));

        await act(async () => {
            renderWithProviders(<Mods />);
        });

        const updateAllBtn = await screen.findByText('Update All');

        await act(async () => {
            fireEvent.click(updateAllBtn);
        });

        expect(mockElectronAPI.updateAllMods).toHaveBeenCalled();
    });

    it('MainLayout should handle My Mods navigation click', async () => {
         const mockNavigate = vi.fn();
         mockElectronAPI.getSettings.mockResolvedValue({ gamePath: '' });

         await act(async () => {
             renderWithProviders(
                <MainLayout activePage="dashboard" onNavigate={mockNavigate}>
                    <div>Content</div>
                </MainLayout>
             );
         });

         const myModsBtn = screen.getByText('My Mods');
         fireEvent.click(myModsBtn);
         expect(mockNavigate).toHaveBeenCalledWith('mods');
    });
});
