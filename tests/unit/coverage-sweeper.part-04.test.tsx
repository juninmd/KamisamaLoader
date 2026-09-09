// @vitest-environment happy-dom
import { electronAPI, originalConfirm } from './coverage-sweeper.fixture';
import React from 'react';
import { screen, waitFor, render } from '@testing-library/react';
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
    it('8. should show 0 Bytes when mod has no fileSize', async () => {
        const mod1 = { id: 'test-mod-1', name: 'Test Mod 1' };
        electronAPI.getInstalledMods.mockResolvedValue([mod1]);
        renderWithProviders(<Mods />);
        await waitFor(() => {
            expect(screen.getByText('0 Bytes')).toBeInTheDocument();
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
    it('9. should catch error when fetching categories fails', async () => {
        electronAPI.fetchCategories.mockRejectedValue(new Error('Fetch Categories Failed'));
        renderWithProviders(<Mods />);
        await waitFor(() => {
            expect(screen.getByText('Installed')).toBeInTheDocument();
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
    it('10. should catch error when loadInstalledMods fails', async () => {
        electronAPI.getInstalledMods.mockRejectedValue(new Error('Get Installed Mods Failed'));
        renderWithProviders(<Mods />);
        await waitFor(() => {
            expect(screen.getByText('Installed')).toBeInTheDocument();
        });
    });
});
