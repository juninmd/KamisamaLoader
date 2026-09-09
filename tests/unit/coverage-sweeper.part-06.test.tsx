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
