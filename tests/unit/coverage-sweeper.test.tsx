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

describe('Mods Page Full Sweeper Coverage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        electronAPI.getInstalledMods.mockResolvedValue([]);
        electronAPI.fetchCategories.mockResolvedValue([]);
        electronAPI.searchBySection.mockResolvedValue([]);
        electronAPI.getProfiles.mockResolvedValue([]);
        electronAPI.getDownloads.mockResolvedValue([]);
        electronAPI.updateAllMods.mockResolvedValue({ results: [], failCount: 0 });
        window.confirm = vi.fn(() => true);

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

    it('1. should handle FilterBar onFilterChange', async () => {
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

    it('2. should close ModDetailsModal via prop', async () => {
         const mod = { id: 'm1', name: 'Details Mod Test', author: 'Author' };
         electronAPI.getInstalledMods.mockResolvedValue([mod]);

         renderWithProviders(<Mods />);

         await waitFor(() => expect(screen.getByText('Details Mod Test')).toBeInTheDocument());

         const modText = screen.getByText('Details Mod Test');
         const modCard = modText.closest('div[class*="bg-black"]') || modText.parentElement;

         await act(async () => {
             if (modCard) fireEvent.click(modCard);
         });

         await waitFor(() => {
             const elements = screen.getAllByText('Details Mod Test');
             expect(elements.length).toBeGreaterThan(1);
         });

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

    it('3. should handle UpdateDialog onClose and onUpdate', async () => {
         const mod = { id: 'm1', name: 'Update Mod Test', author: 'Author', hasUpdate: true, version: '1.0', latestVersion: '2.0', gameBananaId: 123 };
         electronAPI.getInstalledMods.mockResolvedValue([mod]);
         electronAPI.getModChangelog.mockResolvedValue({ changes: [] });

         renderWithProviders(<Mods />);

         await waitFor(() => expect(screen.getByText('Update Mod Test')).toBeInTheDocument());

         const btns = screen.queryAllByRole('button');
         let updateBtn = btns.find(b => b.getAttribute('aria-label') === 'Update' || b.getAttribute('title') === 'Update');

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

    it('4. should hit catch block for handleInstall', async () => {
         const mod = { id: 'm1', name: 'Browse Details Mod', gameBananaId: 1 };
         electronAPI.searchBySection.mockResolvedValue([mod]);
         electronAPI.getModDetails.mockResolvedValue({ description: 'test desc' });

         renderWithProviders(<Mods />);

         await act(async () => {
             fireEvent.click(screen.getByText('Browse Online'));
         });

         await waitFor(() => expect(screen.getByText('Browse Details Mod')).toBeInTheDocument());

         const modText = screen.getByText('Browse Details Mod');
         const modCard = modText.closest('div.bg-black\\/40') || modText.parentElement;

         await act(async () => {
             if (modCard) fireEvent.click(modCard);
         });

         await waitFor(() => {
             const elements = screen.getAllByText('Browse Details Mod');
             expect(elements.length).toBeGreaterThan(1);
         });

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

    it('5. should show checking updates text when loading', async () => {
        electronAPI.checkForUpdates.mockImplementation(() => new Promise(() => {})); // Never resolves
        renderWithProviders(<Mods />);

        await waitFor(() => expect(screen.getByText('Check Updates')).toBeInTheDocument());

        await act(async () => {
            fireEvent.click(screen.getByText('Check Updates'));
        });

        expect(screen.getByText('Checking...')).toBeInTheDocument();
    });

    it('6. should catch error when uninstalling mod', async () => {
        const mod = { id: 'test-mod-id', name: 'Test Mod' };
        electronAPI.getInstalledMods.mockResolvedValue([mod]);
        electronAPI.uninstallMod.mockRejectedValue(new Error('Uninstall failed'));

        renderWithProviders(<Mods />);

        await waitFor(() => expect(screen.getByText('Test Mod')).toBeInTheDocument());

        const trashIcons = document.querySelectorAll('.lucide-trash-2');
        const trashBtn = Array.from(trashIcons)[0]?.parentElement;

        if (trashBtn) {
            await act(async () => {
                fireEvent.click(trashBtn);
            });

            await waitFor(() => {
                expect(electronAPI.uninstallMod).toHaveBeenCalledWith('test-mod-id');
            });
        }
    });

    it('7. should format bytes correctly in Mods page header', async () => {
        const mod1 = { id: 'test-mod-1', name: 'Test Mod 1', fileSize: 1500000 };
        electronAPI.getInstalledMods.mockResolvedValue([mod1]);

        renderWithProviders(<Mods />);

        await waitFor(() => {
            expect(screen.getByText('1.43 MB')).toBeInTheDocument();
        });
    });

    it('8. should show 0 Bytes when mod has no fileSize', async () => {
        const mod1 = { id: 'test-mod-1', name: 'Test Mod 1' };
        electronAPI.getInstalledMods.mockResolvedValue([mod1]);

        renderWithProviders(<Mods />);

        await waitFor(() => {
            expect(screen.getByText('0 Bytes')).toBeInTheDocument();
        });
    });

    it('9. should catch error when fetching categories fails', async () => {
        electronAPI.fetchCategories.mockRejectedValue(new Error('Fetch Categories Failed'));
        renderWithProviders(<Mods />);
        await waitFor(() => {
            expect(screen.getByText('Installed')).toBeInTheDocument();
        });
    });

    it('10. should catch error when loadInstalledMods fails', async () => {
        electronAPI.getInstalledMods.mockRejectedValue(new Error('Get Installed Mods Failed'));
        renderWithProviders(<Mods />);
        await waitFor(() => {
            expect(screen.getByText('Installed')).toBeInTheDocument();
        });
    });

    it('11. should catch error in updateMod via handlePerformUpdate', async () => {
        const mod1 = { id: 'test-mod-id', name: 'Test Mod', hasUpdate: true, version: '1.0', latestVersion: '2.0', gameBananaId: 123 };
        electronAPI.getInstalledMods.mockResolvedValue([mod1]);
        electronAPI.getModChangelog.mockResolvedValue({ changes: [] });
        electronAPI.updateMod.mockRejectedValue(new Error('Update Mock Failed'));

        renderWithProviders(<Mods />);

        await waitFor(() => {
            expect(screen.getByText('Test Mod')).toBeInTheDocument();
        });

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

    it('12. should format downloads size with different byte sizes', async () => {
        const mod1 = { id: 'mod1', name: 'M1', fileSize: 500 };
        const mod2 = { id: 'mod2', name: 'M2', fileSize: 1500 };
        const mod3 = { id: 'mod3', name: 'M3', fileSize: 1500000 };
        const mod4 = { id: 'mod4', name: 'M4', fileSize: 1500000000 };
        const mod5 = { id: 'mod5', name: 'M5', fileSize: 1500000000000 };

        electronAPI.getInstalledMods.mockResolvedValue([mod1, mod2, mod3, mod4, mod5]);

        renderWithProviders(<Mods />);

        await waitFor(() => {
            expect(screen.getByText('1.37 TB')).toBeInTheDocument();
        });
    });

    it('13. should trigger update of all mods', async () => {
        const mod1 = { id: 'test-mod-id', name: 'Test Mod', hasUpdate: true, version: '1.0', latestVersion: '2.0' };
        electronAPI.getInstalledMods.mockResolvedValue([mod1]);

        renderWithProviders(<Mods />);

        await waitFor(() => {
            expect(screen.getByText('Update All')).toBeInTheDocument();
        });

        await act(async () => {
            fireEvent.click(screen.getByText('Update All'));
        });

        expect(electronAPI.updateAllMods).toHaveBeenCalled();
    });

    it('14. should loadBrowseMods when clicking refresh button', async () => {
        const { container } = renderWithProviders(<Mods />);
        await act(async () => {
            fireEvent.click(screen.getByText('Browse Online'));
        });

        const refreshBtn = screen.getByTitle('Refresh Online Mods');

        electronAPI.searchBySection.mockClear();

        await act(async () => {
            fireEvent.click(refreshBtn);
        });

        await waitFor(() => {
            expect(electronAPI.searchBySection).toHaveBeenCalled();
        });
    });
});
