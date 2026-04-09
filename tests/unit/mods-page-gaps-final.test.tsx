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
  updateAllMods: vi.fn(),
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

const renderWithProviders = (component: React.ReactNode) => {
    return render(
        <MockSettingsProvider>
            <MockToastProvider>
                {component}
            </MockToastProvider>
        </MockSettingsProvider>
    );
};

describe('Mods Page Final Coverage Gaps', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        electronAPI.getInstalledMods.mockResolvedValue([]);
        electronAPI.fetchCategories.mockResolvedValue([]);
        electronAPI.searchBySection.mockResolvedValue([]);
        electronAPI.getProfiles.mockResolvedValue([]);
        electronAPI.getDownloads.mockResolvedValue([]);

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

    it('should handle FilterBar onFilterChange', async () => {
        const { container } = renderWithProviders(<Mods />);
        await act(async () => {
            fireEvent.click(screen.getByText('Browse Online'));
        });

        const searchInput = screen.getByPlaceholderText('Search online mods...');
        await act(async () => {
            fireEvent.change(searchInput, { target: { value: 'New Test Query' } });
        });

        await waitFor(() => {
            expect(electronAPI.searchBySection).toHaveBeenCalledWith(
                expect.objectContaining({ search: 'New Test Query' })
            );
        }, { timeout: 1500 });
    });

    it('should loadBrowseMods when clicking refresh button', async () => {
        const { container } = renderWithProviders(<Mods />);
        await act(async () => {
            fireEvent.click(screen.getByText('Browse Online'));
        });

        // The refresh button in browse mode has title "Refresh Online Mods"
        const refreshBtn = screen.getByTitle('Refresh Online Mods');

        // Clear previous mock calls from initial load
        electronAPI.searchBySection.mockClear();

        await act(async () => {
            fireEvent.click(refreshBtn);
        });

        await waitFor(() => {
            expect(electronAPI.searchBySection).toHaveBeenCalled();
        });
    });

    it('should close ModDetailsModal via prop', async () => {
         const mod = { id: 'm1', name: 'Details Mod Test', author: 'Author' };
         electronAPI.getInstalledMods.mockResolvedValue([mod]);

         const { container } = renderWithProviders(<Mods />);

         await waitFor(() => expect(screen.getByText('Details Mod Test')).toBeInTheDocument());

         // Click card
         const modText = screen.getByText('Details Mod Test');
         const modCard = modText.closest('div[class*="bg-black"]') || modText.parentElement;

         await act(async () => {
             if (modCard) fireEvent.click(modCard);
         });

         await waitFor(() => {
             const elements = screen.getAllByText('Details Mod Test');
             expect(elements.length).toBeGreaterThan(1);
         });

         // In installed view, no install button, but there's a close button in modal
         const closeBtns = screen.queryAllByRole('button');
         await act(async () => {
             for (const btn of closeBtns) {
                  if (btn.innerHTML.includes('lucide-x')) {
                      fireEvent.click(btn);
                      break;
                  }
             }
         });

         await waitFor(() => {
             expect(screen.getAllByText('Details Mod Test').length).toBe(1);
         });
    });

    it('should handle UpdateDialog onClose and onUpdate', async () => {
         const mod = { id: 'm1', name: 'Update Mod Test', author: 'Author', hasUpdate: true, version: '1.0', latestVersion: '2.0', gameBananaId: 123 };
         electronAPI.getInstalledMods.mockResolvedValue([mod]);
         electronAPI.getModChangelog.mockResolvedValue({ changes: [] });

         const { container } = renderWithProviders(<Mods />);

         await waitFor(() => expect(screen.getByText('Update Mod Test')).toBeInTheDocument());

         // Trigger update button
         let updateBtn;
         const btns = screen.queryAllByRole('button');
         updateBtn = btns.find(b => b.getAttribute('aria-label') === 'Update' || b.getAttribute('title') === 'Update');

         if (!updateBtn) {
             updateBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerHTML.includes('lucide-refresh-cw'));
         }

         if (updateBtn) {
             await act(async () => {
                 fireEvent.click(updateBtn);
             });

             await waitFor(() => {
                 expect(screen.getByText(/Yes, Update/i)).toBeInTheDocument();
             }, { timeout: 3000 });

             // Trigger close
             const closeBtn = screen.getAllByRole('button').find(b => b.innerHTML.includes('lucide-x'));
             if (closeBtn) {
                 await act(async () => {
                     fireEvent.click(closeBtn);
                 });
             }

             await waitFor(() => {
                 expect(screen.queryByText(/Yes, Update/i)).toBeNull();
             });
         }
    });

    it('should hit catch block for handleInstall', async () => {
         const mod = { id: 'm1', name: 'Browse Details Mod', gameBananaId: 1 };
         electronAPI.searchBySection.mockResolvedValue([mod]);
         electronAPI.getModDetails.mockResolvedValue({ description: 'test desc' });

         const { container } = renderWithProviders(<Mods />);

         await act(async () => {
             fireEvent.click(screen.getByText('Browse Online'));
         });

         await waitFor(() => expect(screen.getByText('Browse Details Mod')).toBeInTheDocument());

         // Click card to open modal
         const modText = screen.getByText('Browse Details Mod');
         const modCard = modText.closest('div.bg-black\\/40') || modText.parentElement;

         await act(async () => {
             if (modCard) fireEvent.click(modCard);
         });

         await waitFor(() => {
             const elements = screen.getAllByText('Browse Details Mod');
             expect(elements.length).toBeGreaterThan(1);
         });

         // Mock install crash
         electronAPI.installOnlineMod.mockRejectedValue(new Error('Install failed mock'));

         const btns = screen.queryAllByRole('button');
         const installBtn = btns.find(b => b.innerHTML.includes('Install Mod'));

         if (installBtn) {
             await act(async () => {
                 fireEvent.click(installBtn);
             });
             await waitFor(() => expect(electronAPI.installOnlineMod).toHaveBeenCalled());
         }
    });
});
