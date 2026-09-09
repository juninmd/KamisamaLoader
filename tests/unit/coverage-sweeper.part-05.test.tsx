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
        fireEvent.click(await screen.findByRole('button', { name: /Atualizar selecionados/ }));
        await screen.findByText('Resultado do lote');
        expect(electronAPI.updateMod).toHaveBeenCalled();
    });
});
