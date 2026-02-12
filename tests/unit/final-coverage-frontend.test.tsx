// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { MockToastProvider, MockSettingsProvider } from './test-utils';
import Dashboard from '../../src/pages/Dashboard';
import ModDetailsModal from '../../src/components/ModDetailsModal';
import ProfileManager from '../../src/components/ProfileManager';

// Mock electronAPI
const mockElectronAPI = {
    getInstalledMods: vi.fn(),
    fetchFeaturedMods: vi.fn(),
    fetchNewMods: vi.fn(),
    getSettings: vi.fn(),
    saveSettings: vi.fn(),
    onDownloadScanFinished: vi.fn(),
    getProfiles: vi.fn(),
    createProfile: vi.fn(),
    deleteProfile: vi.fn(),
    loadProfile: vi.fn(),
    getModChangelog: vi.fn(),
    getModDetails: vi.fn(),
    checkForUpdates: vi.fn(),
    launchGame: vi.fn()
};

// Setup window mocks
Object.defineProperty(window, 'electronAPI', {
    value: mockElectronAPI,
    writable: true
});

// Setup confirm mock
window.confirm = vi.fn(() => true) as any;

describe('Frontend Final Coverage', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        // Default mock implementations to prevent crashes
        mockElectronAPI.getSettings.mockResolvedValue({});
        mockElectronAPI.saveSettings.mockResolvedValue(true);
        mockElectronAPI.getProfiles.mockResolvedValue([]);
        mockElectronAPI.getInstalledMods.mockResolvedValue([]);
        mockElectronAPI.fetchFeaturedMods.mockResolvedValue([]);
        mockElectronAPI.fetchNewMods.mockResolvedValue([]);
        mockElectronAPI.checkForUpdates.mockResolvedValue([]);
        mockElectronAPI.getModChangelog.mockResolvedValue([]);
        mockElectronAPI.getModDetails.mockResolvedValue({});
    });

    describe('Dashboard Edge Cases', () => {
        it('should handle undefined return from getInstalledMods gracefully', async () => {
             mockElectronAPI.getInstalledMods.mockResolvedValue(undefined);

             await act(async () => {
                 render(
                     <MockToastProvider>
                         <MockSettingsProvider>
                             <Dashboard onNavigate={vi.fn()} />
                         </MockSettingsProvider>
                     </MockToastProvider>
                 );
             });

             expect(screen.getByText('Total Mods')).toBeInTheDocument();
        });

        it('should handle API errors during load', async () => {
             mockElectronAPI.getInstalledMods.mockRejectedValue(new Error('Failed'));

             await act(async () => {
                 render(
                     <MockToastProvider>
                         <MockSettingsProvider>
                             <Dashboard onNavigate={vi.fn()} />
                         </MockSettingsProvider>
                     </MockToastProvider>
                 );
             });
             // Should verify it rendered at least the structure
             expect(screen.getByText('System Status')).toBeInTheDocument();
        });
    });

    describe('ModDetailsModal Edge Cases', () => {
        it('should handle image error and fallback', async () => {
            const mod = {
                id: '1',
                name: 'Test Mod',
                author: 'Author',
                version: '1.0',
                description: 'Desc',
                iconUrl: 'http://fallback.com/icon.png',
                images: ['http://broken.com/image.png']
            };

            await act(async () => {
                render(
                    <ModDetailsModal
                        mod={mod as any}
                        isOpen={true}
                        onClose={vi.fn()}
                        onInstall={vi.fn()}
                    />
                );
            });

            const img = screen.getByAltText('Test Mod') as HTMLImageElement;

            // Simulate error
            await act(async () => {
                fireEvent.error(img);
            });

            // Should switch to iconUrl
            expect(img.src).toContain('http://fallback.com/icon.png');

            // Simulate error again (should hide)
            await act(async () => {
                 fireEvent.error(img);
            });
            expect(img.style.display).toBe('none');
        });

        it('should handle missing mod details from API', async () => {
            mockElectronAPI.getModDetails.mockRejectedValue(new Error('API Error'));

            const mod = {
                id: '1',
                gameBananaId: 123,
                name: 'Test Mod',
                author: 'Author',
                version: '1.0'
            };

            await act(async () => {
                render(
                    <ModDetailsModal
                        mod={mod as any}
                        isOpen={true}
                        onClose={vi.fn()}
                        onInstall={vi.fn()}
                    />
                );
            });

            // Just wait a bit for promise rejection to settle
            await new Promise(r => setTimeout(r, 50));

            expect(screen.getByText('Test Mod')).toBeInTheDocument();
        });
    });

    describe('ProfileManager Edge Cases', () => {
        it('should handle delete profile failure', async () => {
            mockElectronAPI.getProfiles.mockResolvedValue([
                { id: '1', name: 'Profile 1', modIds: [] }
            ]);
            mockElectronAPI.deleteProfile.mockResolvedValue(false); // Fail

            await act(async () => {
                render(
                    <MockToastProvider>
                         <ProfileManager onProfileLoaded={vi.fn()} />
                    </MockToastProvider>
                );
            });

            // Open dropdown
            const trigger = screen.getByRole('button', { name: /profiles/i });
            await act(async () => {
                fireEvent.click(trigger);
            });

            // Click delete
            // Find the list item
            const profileItem = screen.getByText('Profile 1').closest('div.group');
            // QuerySelector directly on the element
            const trashBtn = profileItem?.querySelector('button:not(:first-child)');
            // The first button is the item itself (since it has onClick).
            // Actually the item is a div with onClick. The trash is a button.

            if (trashBtn) {
                await act(async () => {
                    fireEvent.click(trashBtn);
                });
                expect(mockElectronAPI.deleteProfile).toHaveBeenCalledWith('1');
            } else {
                throw new Error('Trash button not found');
            }
        });

        it('should handle load profile failure', async () => {
             mockElectronAPI.getProfiles.mockResolvedValue([
                { id: '1', name: 'Profile 1', modIds: [] }
            ]);
            mockElectronAPI.loadProfile.mockResolvedValue({ success: false, message: 'Load Error' });

            await act(async () => {
                render(
                    <MockToastProvider>
                         <ProfileManager onProfileLoaded={vi.fn()} />
                    </MockToastProvider>
                );
            });

            const trigger = screen.getByRole('button', { name: /profiles/i });
            await act(async () => { fireEvent.click(trigger); });

            const loadBtn = await screen.findByText('Profile 1');
            await act(async () => { fireEvent.click(loadBtn); });

            // Load has a timeout
            await act(async () => {
                await new Promise(r => setTimeout(r, 150));
            });

            expect(mockElectronAPI.loadProfile).toHaveBeenCalledWith('1');
        });
    });
});
