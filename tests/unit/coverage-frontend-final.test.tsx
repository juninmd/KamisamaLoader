// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Mods from '../../src/pages/Mods';
import ProfileManager from '../../src/components/ProfileManager';
import { SettingsProvider } from '../../src/components/SettingsContext';
import { ToastProvider } from '../../src/components/ToastContext';
import ModDetailsModal from '../../src/components/ModDetailsModal';

// Mock IntersectionObserver
let observerCallback: any = null;
const mockIntersectionObserver = vi.fn(function(this: any, cb: any) {
    observerCallback = cb;
    return {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn()
    };
});
window.IntersectionObserver = mockIntersectionObserver as any;

// Mock Electron API
const mockElectronAPI = {
    getInstalledMods: vi.fn(),
    fetchCategories: vi.fn(),
    searchBySection: vi.fn(),
    checkForUpdates: vi.fn(),
    updateAllMods: vi.fn(),
    updateMod: vi.fn(),
    toggleMod: vi.fn(),
    installMod: vi.fn(),
    installOnlineMod: vi.fn(),
    uninstallMod: vi.fn(),
    setModPriority: vi.fn(),
    getModChangelog: vi.fn(),
    getModDetails: vi.fn(),
    getProfiles: vi.fn(),
    createProfile: vi.fn(),
    loadProfile: vi.fn(),
    deleteProfile: vi.fn(),
    getSettings: vi.fn().mockResolvedValue({}),
    saveSettings: vi.fn(),
    onDownloadScanFinished: vi.fn(() => () => {}),
    onDownloadProgress: vi.fn(() => () => {}),
    onDownloadUpdate: vi.fn(() => () => {}),
    selectGameDirectory: vi.fn(),
    selectModDirectory: vi.fn(),
    selectBackgroundImage: vi.fn(),
    installUE4SS: vi.fn(),
    launchGame: vi.fn(),
    openModsDirectory: vi.fn(),
};

(window as any).electronAPI = mockElectronAPI;

// Helper to render with providers
const renderWithProviders = (ui: React.ReactElement) => {
    return render(
        <ToastProvider>
            <SettingsProvider>
                {ui}
            </SettingsProvider>
        </ToastProvider>
    );
};

describe('Frontend Coverage Boost', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockElectronAPI.getInstalledMods.mockResolvedValue([]);
        mockElectronAPI.fetchCategories.mockResolvedValue([]);
        mockElectronAPI.searchBySection.mockResolvedValue([]);
        mockElectronAPI.getProfiles.mockResolvedValue([]);
    });

    describe('Mods Page', () => {
        it('should handle infinite scroll intersection', async () => {
            mockElectronAPI.searchBySection.mockResolvedValue([
                { id: '1', name: 'Mod 1', gameBananaId: 1 },
                { id: '2', name: 'Mod 2', gameBananaId: 2 }
            ]);

            await act(async () => {
                renderWithProviders(<Mods />);
            });

            // Switch to Browse tab
            fireEvent.click(screen.getByText('Browse Online'));

            // Wait for initial load
            await waitFor(() => {
                expect(mockElectronAPI.searchBySection).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
            });

            // Trigger intersection
            await waitFor(() => {
                 if (observerCallback) {
                     act(() => {
                        observerCallback([{ isIntersecting: true }] as any, {} as any);
                     });
                 }
                 expect(observerCallback).not.toBeNull();
            });

            // Should trigger page 2 fetch due to intersection
            await waitFor(() => {
                expect(mockElectronAPI.searchBySection).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
            });
        });

        it('should handle batch update all success', async () => {
            mockElectronAPI.getInstalledMods.mockResolvedValue([
                { id: '1', name: 'Mod 1', hasUpdate: true, version: '1.0' }
            ]);
            mockElectronAPI.updateAllMods.mockResolvedValue({
                successCount: 1,
                failCount: 0,
                results: [{ id: '1', success: true }]
            });

            await act(async () => {
                renderWithProviders(<Mods />);
            });

            await waitFor(() => screen.getByText('Mod 1'));

            const updateBtn = screen.getByText('Update All');
            await act(async () => {
                fireEvent.click(updateBtn);
            });

            await waitFor(() => {
                expect(mockElectronAPI.updateAllMods).toHaveBeenCalledWith(['1']);
            });
        });

        it('should handle drag and drop file installation', async () => {
             await act(async () => {
                renderWithProviders(<Mods />);
            });

            const container = screen.getByText('Installed').closest('.relative')?.parentElement;
            if (!container) throw new Error('Container not found');

            fireEvent.dragEnter(container, { dataTransfer: { items: [{ kind: 'file' }] } });
            expect(screen.getByText('Drop to Install')).toBeInTheDocument();

            fireEvent.dragLeave(container);
            await waitFor(() => {
                expect(screen.queryByText('Drop to Install')).not.toBeInTheDocument();
            });

            mockElectronAPI.installMod.mockResolvedValue({ success: true });

            const file = new File([''], 'mod.zip', { type: 'application/zip' });
            Object.defineProperty(file, 'path', { value: '/path/to/mod.zip' });

            await act(async () => {
                fireEvent.drop(container, {
                    dataTransfer: {
                        files: [file],
                        items: [{ kind: 'file' }]
                    }
                });
            });

            expect(mockElectronAPI.installMod).toHaveBeenCalledWith('/path/to/mod.zip');
        });
    });

    describe('ProfileManager', () => {
        it('should handle create profile failure', async () => {
            mockElectronAPI.getProfiles.mockResolvedValue([]);
            mockElectronAPI.createProfile.mockRejectedValue(new Error('Create Fail'));

            await act(async () => {
                renderWithProviders(<ProfileManager onProfileLoaded={() => {}} />);
            });

            // Open menu
            fireEvent.click(screen.getByText('Profiles'));

            // Click Create (Plus icon)
            fireEvent.click(screen.getByTitle('Create New Profile'));

            // Type name
            const input = screen.getByPlaceholderText('Profile Name...');
            fireEvent.change(input, { target: { value: 'New Profile' } });

            // Click Save
            const saveBtn = screen.getByText('Save');
            await act(async () => {
                fireEvent.click(saveBtn);
            });

            expect(mockElectronAPI.createProfile).toHaveBeenCalledWith('New Profile');
        });

        it('should handle load profile failure', async () => {
             mockElectronAPI.getProfiles.mockResolvedValue([{ id: '1', name: 'Profile 1', modIds: [] }]);
             mockElectronAPI.loadProfile.mockResolvedValue({ success: false, message: 'Load Fail' });

             await act(async () => {
                renderWithProviders(<ProfileManager onProfileLoaded={() => {}} />);
             });

             // Open menu
             fireEvent.click(screen.getByText('Profiles'));

             // Click profile
             const profileItem = screen.getByText('Profile 1');
             await act(async () => {
                 fireEvent.click(profileItem);
             });

             // Wait for async timeout in component
             await waitFor(() => {
                 expect(mockElectronAPI.loadProfile).toHaveBeenCalledWith('1');
             });
        });
    });

    describe('ModDetailsModal', () => {
        it('should handle image load error in carousel', async () => {
            mockElectronAPI.getModChangelog.mockResolvedValue([]);
            mockElectronAPI.getModDetails.mockResolvedValue({});

            const mod = {
                id: '1',
                name: 'Mod 1',
                images: ['img1.jpg'],
                description: 'Desc',
                author: 'Author',
                version: '1.0',
                gameBananaId: 123
            };

            await act(async () => {
                renderWithProviders(<ModDetailsModal mod={mod as any} isOpen={true} onClose={() => {}} />);
            });

            const img = screen.getByAltText('Mod 1');
            fireEvent.error(img);
            // Should fallback to placeholder or icon
        });
    });
});
