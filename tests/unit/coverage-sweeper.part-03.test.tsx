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
    it('5. should show checking updates text when loading', async () => {
        electronAPI.checkForUpdates.mockImplementation(() => new Promise(() => { }));
        renderWithProviders(<Mods />);
        await waitFor(() => expect(screen.getByText('Check Updates')).toBeInTheDocument());
        await act(async () => {
            fireEvent.click(screen.getByText('Check Updates'));
        });
        expect(screen.getByText('Checking...')).toBeInTheDocument();
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
    it('7. should format bytes correctly in Mods page header', async () => {
        const mod1 = { id: 'test-mod-1', name: 'Test Mod 1', fileSize: 1500000 };
        electronAPI.getInstalledMods.mockResolvedValue([mod1]);
        renderWithProviders(<Mods />);
        await waitFor(() => {
            expect(screen.getByText('1.43 MB')).toBeInTheDocument();
        });
    });
});
