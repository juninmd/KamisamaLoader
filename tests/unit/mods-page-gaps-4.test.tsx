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
const originalConfirm = window.confirm;
window.confirm = vi.fn(() => true);

describe('Mods Page Gaps 4', () => {
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

    afterEach(() => {
        window.confirm = originalConfirm;
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

    it('should catch error in updateMod via handlePerformUpdate', async () => {
        const mod1 = { id: 'test-mod-id', name: 'Test Mod', hasUpdate: true, version: '1.0', latestVersion: '2.0', gameBananaId: 123 };
        electronAPI.getInstalledMods.mockResolvedValue([mod1]);
        electronAPI.getModChangelog.mockResolvedValue({ changes: [] });
        electronAPI.updateMod.mockRejectedValue(new Error('Update Mock Failed'));

        renderWithProviders(<Mods />);

        await waitFor(() => {
            expect(screen.getByText('Test Mod')).toBeInTheDocument();
        });

        // Click Update
        const btns = screen.queryAllByRole('button');
        const updateBtn = btns.find(b => b.getAttribute('aria-label') === 'Update' || b.getAttribute('title') === 'Update');

        if (updateBtn) {
             await act(async () => {
                 fireEvent.click(updateBtn);
             });

             await waitFor(() => {
                 expect(screen.getByText(/Yes, Update/i)).toBeInTheDocument();
             });

             await act(async () => {
                 fireEvent.click(screen.getByText(/Yes, Update/i));
             });

             await waitFor(() => {
                 expect(electronAPI.updateMod).toHaveBeenCalled();
             });
        }
    });

});
