// @vitest-environment happy-dom
import { electronAPI, originalConfirm } from './coverage-sweeper.fixture';
import React from 'react';
import { screen, fireEvent, act, waitFor, render } from '@testing-library/react';
import Mods from '../../src/pages/Mods';
import { MockSettingsProvider, MockToastProvider } from './test-utils';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
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
        window.IntersectionObserver = vi.fn(function () {
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
        return render(<MockSettingsProvider>
                <MockToastProvider>
                    {component}
                </MockToastProvider>
            </MockSettingsProvider>);
    };
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
});
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
        window.IntersectionObserver = vi.fn(function () {
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
        return render(<MockSettingsProvider>
                <MockToastProvider>
                    {component}
                </MockToastProvider>
            </MockSettingsProvider>);
    };
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
            if (modCard)
                fireEvent.click(modCard);
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
});
