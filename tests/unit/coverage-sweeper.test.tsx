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
            expect(electronAPI.searchBySection).toHaveBeenCalledWith(expect.objectContaining({ search: 'New Test Query' }));
        }, { timeout: 1500 });
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
    it('2. should close ModDetailsModal via prop', async () => {
        const mod = { id: 'm1', name: 'Details Mod Test', author: 'Author' };
        electronAPI.getInstalledMods.mockResolvedValue([mod]);
        renderWithProviders(<Mods />);
        await waitFor(() => expect(screen.getByText('Details Mod Test')).toBeInTheDocument());
        const modText = screen.getByText('Details Mod Test');
        const modCard = modText.closest('div[class*="bg-black"]') || modText.parentElement;
        await act(async () => {
            if (modCard)
                fireEvent.click(modCard);
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
});
