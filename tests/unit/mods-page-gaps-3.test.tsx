// @vitest-environment happy-dom
import React from 'react';
import { screen, fireEvent, act, waitFor, render } from '@testing-library/react';
import Mods from '../../src/pages/Mods';
import { MockSettingsProvider, MockToastProvider } from './test-utils';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

const electronAPI = {
  getSettings: vi.fn().mockResolvedValue({}),
  getInstalledMods: vi.fn().mockResolvedValue([]),
  fetchCategories: vi.fn().mockResolvedValue([]),
  searchBySection: vi.fn().mockResolvedValue([]),
  onDownloadScanFinished: vi.fn().mockReturnValue(() => {}),
  installMod: vi.fn(),
  updateAllMods: vi.fn().mockResolvedValue({ results: [], failCount: 0 }),
  checkForUpdates: vi.fn().mockResolvedValue([]),
  setModPriority: vi.fn(),
  toggleMod: vi.fn(),
  installOnlineMod: vi.fn(),
  uninstallMod: vi.fn(),
  updateMod: vi.fn(),
  getModChangelog: vi.fn().mockResolvedValue([]),
  getModDetails: vi.fn().mockResolvedValue(null),
  getProfiles: vi.fn().mockResolvedValue([]),
  createProfile: vi.fn(),
  deleteProfile: vi.fn(),
  loadProfile: vi.fn(),
  getDownloads: vi.fn().mockResolvedValue([]),
  onDownloadProgress: vi.fn().mockReturnValue(() => {}),
  onDownloadUpdate: vi.fn().mockReturnValue(() => {})
};

(window as any).electronAPI = electronAPI;

describe('Mods Page Gaps 3', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        electronAPI.getInstalledMods.mockResolvedValue([]);
        electronAPI.fetchCategories.mockResolvedValue([]);
        electronAPI.searchBySection.mockResolvedValue([]);
        electronAPI.getProfiles.mockResolvedValue([]);
        electronAPI.getDownloads.mockResolvedValue([]);
        electronAPI.updateAllMods.mockResolvedValue({ results: [], failCount: 0 });

        window.IntersectionObserver = vi.fn(function() {
            return {
                observe: vi.fn(),
                unobserve: vi.fn(),
                disconnect: vi.fn()
            };
        }) as any;
    });

    const renderWithProviders = (component: React.ReactNode) => {
        return render(
            <MockSettingsProvider>
                <MockToastProvider>
                    {component}
                </MockToastProvider>
            </MockSettingsProvider>
        );
    };

    it('should format bytes correctly in Mods page header', async () => {
        const mod1 = { id: 'test-mod-1', name: 'Test Mod 1', fileSize: 1500000 };
        electronAPI.getInstalledMods.mockResolvedValue([mod1]);

        renderWithProviders(<Mods />);

        await waitFor(() => {
            expect(screen.getByText('1.43 MB')).toBeInTheDocument();
        });
    });

    it('should show 0 Bytes when mod has no fileSize', async () => {
        const mod1 = { id: 'test-mod-1', name: 'Test Mod 1' };
        electronAPI.getInstalledMods.mockResolvedValue([mod1]);

        renderWithProviders(<Mods />);

        await waitFor(() => {
            expect(screen.getByText('0 Bytes')).toBeInTheDocument();
        });
    });

    it('should catch error when fetching categories fails', async () => {
        electronAPI.fetchCategories.mockRejectedValue(new Error('Fetch Categories Failed'));
        renderWithProviders(<Mods />);
        // It should still mount without crashing
        await waitFor(() => {
            expect(screen.getByText('Installed')).toBeInTheDocument();
        });
    });

    it('should catch error when loadInstalledMods fails', async () => {
        electronAPI.getInstalledMods.mockRejectedValue(new Error('Get Installed Mods Failed'));
        renderWithProviders(<Mods />);
        await waitFor(() => {
            expect(screen.getByText('Installed')).toBeInTheDocument();
        });
    });

});
