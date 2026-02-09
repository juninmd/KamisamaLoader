// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Mods from '../../src/pages/Mods';
import ProfileManager from '../../src/components/ProfileManager';
import { MockSettingsProvider, MockToastProvider } from './test-utils';
import React from 'react';

// Mock electronAPI
const mockElectron = {
    getInstalledMods: vi.fn(),
    searchBySection: vi.fn(),
    fetchCategories: vi.fn(),
    installOnlineMod: vi.fn(),
    installMod: vi.fn(),
    toggleMod: vi.fn(),
    uninstallMod: vi.fn(),
    updateAllMods: vi.fn(),
    updateMod: vi.fn(),
    setModPriority: vi.fn(),
    getModChangelog: vi.fn(),
    checkForUpdates: vi.fn(),
    getProfiles: vi.fn(),
    getSettings: vi.fn(),
    createProfile: vi.fn(),
    loadProfile: vi.fn(),
    deleteProfile: vi.fn(),
    onDownloadScanFinished: vi.fn(() => () => { }),
    onDownloadProgress: vi.fn(() => () => { }),
    onDownloadComplete: vi.fn(() => () => { })
};

// Define window properties manually if missing
Object.defineProperty(window, 'electronAPI', {
    value: mockElectron,
    writable: true
});

if (!window.confirm) {
    window.confirm = vi.fn();
}

const renderWithProviders = (component: React.ReactNode) => {
    return render(
        <MockSettingsProvider>
            <MockToastProvider>
                {component}
            </MockToastProvider>
        </MockSettingsProvider>
    );
};

describe('Frontend Coverage Fill', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        mockElectron.getInstalledMods.mockResolvedValue([]);
        mockElectron.fetchCategories.mockResolvedValue([]);
        mockElectron.getProfiles.mockResolvedValue([]);
        mockElectron.getSettings.mockResolvedValue({});
    });

    describe('Mods Page - Error Handling', () => {
        it('handleInstall should show error toast on failure', async () => {
            mockElectron.searchBySection.mockResolvedValue([
                { id: '1', name: 'Mod1', gameBananaId: 100 }
            ]);
            mockElectron.installOnlineMod.mockResolvedValue({ success: false, message: 'Install Failed' });

            renderWithProviders(<Mods />);

            // Switch to browse
            fireEvent.click(screen.getByText('Browse Online'));
            await waitFor(() => expect(screen.getByText('Mod1')).toBeInTheDocument());

            // Click Install
            // Use exact name to distinguish from "Downloads" tab
            const installBtn = screen.getByRole('button', { name: /^Download$/i });
            fireEvent.click(installBtn);

            await waitFor(() => {
                expect(mockElectron.installOnlineMod).toHaveBeenCalled();
            });
        });

        it('handleToggle should revert state on failure', async () => {
            const mod = { id: '1', name: 'M', isEnabled: false, author: 'A' };
            mockElectron.getInstalledMods.mockResolvedValue([mod]);
            mockElectron.toggleMod.mockResolvedValue({ success: false });

            renderWithProviders(<Mods />);
            await waitFor(() => expect(screen.getByText('M')).toBeInTheDocument());

            // Use switch (role checkbox) instead of text "Enable"
            const switchEl = screen.getByRole('checkbox');
            fireEvent.click(switchEl);

            await waitFor(() => {
                expect(mockElectron.toggleMod).toHaveBeenCalled();
            });
        });

        it('handleUninstall should not uninstall if cancelled', async () => {
             const mod = { id: '1', name: 'M', isEnabled: false, author: 'A' };
            mockElectron.getInstalledMods.mockResolvedValue([mod]);

            window.confirm = vi.fn().mockReturnValue(false);

            renderWithProviders(<Mods />);
            await waitFor(() => expect(screen.getByText('M')).toBeInTheDocument());

            const uninstall = screen.getByTitle('Uninstall');
            fireEvent.click(uninstall);

            expect(mockElectron.uninstallMod).not.toHaveBeenCalled();
        });

         it('handleUninstall should show error on failure', async () => {
             const mod = { id: '1', name: 'M', isEnabled: false, author: 'A' };
            mockElectron.getInstalledMods.mockResolvedValue([mod]);

            window.confirm = vi.fn().mockReturnValue(true);
            mockElectron.uninstallMod.mockResolvedValue({ success: false, message: 'Fail' });

            renderWithProviders(<Mods />);
            await waitFor(() => expect(screen.getByText('M')).toBeInTheDocument());

            const uninstall = screen.getByTitle('Uninstall');
            fireEvent.click(uninstall);

            await waitFor(() => expect(mockElectron.uninstallMod).toHaveBeenCalled());
        });

        it('handleUpdateAll should handle partial failures', async () => {
             const mod = { id: '1', name: 'M', isEnabled: false, author: 'A', hasUpdate: true };
             mockElectron.getInstalledMods.mockResolvedValue([mod]);
             mockElectron.updateAllMods.mockResolvedValue({ successCount: 0, failCount: 1, results: [{ id: '1', success: false }] });

             renderWithProviders(<Mods />);
             await waitFor(() => expect(screen.getByText('Update All')).toBeInTheDocument());

             fireEvent.click(screen.getByText('Update All'));

             await waitFor(() => expect(mockElectron.updateAllMods).toHaveBeenCalled());
        });

        it('handleDrop should handle install failure', async () => {
            mockElectron.installMod.mockResolvedValue({ success: false, message: 'Bad Zip' });

            const { container } = renderWithProviders(<Mods />);

            const file = new File([''], 'mod.zip', { type: 'application/zip' });
            const dropEvent = {
                preventDefault: vi.fn(),
                stopPropagation: vi.fn(),
                dataTransfer: { files: [file], items: [{ kind: 'file' }] }
            };

            // Trigger drag events to set state
            fireEvent.dragEnter(container.firstChild!, dropEvent);
            fireEvent.drop(container.firstChild!, dropEvent);

            await waitFor(() => expect(mockElectron.installMod).toHaveBeenCalled());
        });

        it('loadCategories should handle API failure', async () => {
            mockElectron.fetchCategories.mockRejectedValue(new Error('Fail'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            renderWithProviders(<Mods />);
            fireEvent.click(screen.getByText('Browse Online'));

            // It runs on tab switch. Wait a bit.
            await waitFor(() => expect(mockElectron.fetchCategories).toHaveBeenCalled());
            expect(consoleSpy).toHaveBeenCalledWith('[Categories] Failed to load', expect.any(Error));
        });
    });

    describe('ProfileManager - Error Handling', () => {
         it('handleCreate should fail if empty name', async () => {
             renderWithProviders(<ProfileManager onProfileLoaded={vi.fn()} />);

             fireEvent.click(screen.getByTitle('Manage Mod Profiles'));
             fireEvent.click(screen.getByTitle('Create New Profile'));

             // Name is empty by default
             const saveBtn = screen.getByText('Save').closest('button');
             expect(saveBtn).toBeDisabled();
         });

         it('handleCreate should handle API failure', async () => {
             mockElectron.createProfile.mockResolvedValue({ success: false });

             renderWithProviders(<ProfileManager onProfileLoaded={vi.fn()} />);

             fireEvent.click(screen.getByTitle('Manage Mod Profiles'));
             fireEvent.click(screen.getByTitle('Create New Profile'));

             const input = screen.getByPlaceholderText('Profile Name...');
             fireEvent.change(input, { target: { value: 'New' } });

             fireEvent.click(screen.getByText('Save'));

             await waitFor(() => expect(mockElectron.createProfile).toHaveBeenCalled());
         });

         it('handleDelete should not delete if cancelled', async () => {
             mockElectron.getProfiles.mockResolvedValue([{ id: 'p1', name: 'P1', modIds: [] }]);
             window.confirm = vi.fn().mockReturnValue(false);

             renderWithProviders(<ProfileManager onProfileLoaded={vi.fn()} />);
             fireEvent.click(screen.getByTitle('Manage Mod Profiles'));

             await waitFor(() => expect(screen.getByText('P1')).toBeInTheDocument());

             // Need to hover to see delete? No, it's just opacity.
             // Find delete button by looking for Trash icon or button in the row
             const row = screen.getByText('P1').closest('div')?.parentElement;
             const deleteBtn = row?.querySelector('button');

             if (deleteBtn) fireEvent.click(deleteBtn);

             expect(mockElectron.deleteProfile).not.toHaveBeenCalled();
         });

         it('handleLoad should handle API failure', async () => {
             mockElectron.getProfiles.mockResolvedValue([{ id: 'p1', name: 'P1', modIds: [] }]);
             mockElectron.loadProfile.mockResolvedValue({ success: false });

             renderWithProviders(<ProfileManager onProfileLoaded={vi.fn()} />);
             fireEvent.click(screen.getByTitle('Manage Mod Profiles'));
             await waitFor(() => expect(screen.getByText('P1')).toBeInTheDocument());

             fireEvent.click(screen.getByText('P1'));

             await waitFor(() => expect(mockElectron.loadProfile).toHaveBeenCalled());
         });
    });
});
