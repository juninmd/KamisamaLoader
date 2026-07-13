/**
 * @vitest-environment happy-dom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, waitFor, screen } from '@testing-library/react';
import Mods from '../../src/pages/Mods';
import { renderWithProviders } from './test-utils';

describe('Mods Component - FilterBar coverage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.IntersectionObserver = vi.fn(function() {
            return {
                observe: vi.fn(),
                unobserve: vi.fn(),
                disconnect: vi.fn(),
            };
        }) as any;

        if (!window.electronAPI) {
            (window as any).electronAPI = {};
        }

        window.electronAPI.getInstalledMods = vi.fn().mockResolvedValue([]);
        window.electronAPI.checkForUpdates = vi.fn().mockResolvedValue([]);
        window.electronAPI.getSettings = vi.fn().mockResolvedValue({});
        window.electronAPI.getProfiles = vi.fn().mockResolvedValue([]);
        window.electronAPI.getDownloads = vi.fn().mockResolvedValue([]);
        window.electronAPI.onDownloadProgress = vi.fn();
        window.electronAPI.onDownloadUpdate = vi.fn();
        window.electronAPI.searchMods = vi.fn().mockResolvedValue({ mods: [], hasMore: false, total: 0 });
        window.electronAPI.searchBySection = vi.fn().mockResolvedValue([]);
        window.electronAPI.fetchCategories = vi.fn().mockResolvedValue([
            { id: 'cat1', name: 'Category 1', count: 10 }
        ]);
        window.electronAPI.fetchFeaturedMods = vi.fn().mockResolvedValue([]);
    });

    it('should trigger onFilterChange in FilterBar', async () => {
        renderWithProviders(<Mods />);

        const browseBtn = await screen.findByRole('button', { name: /Browse Online/i });
        fireEvent.click(browseBtn);

        await waitFor(() => {
            expect(window.electronAPI.fetchCategories).toHaveBeenCalled();
        });

        // Click NSFW button to trigger onFilterChange
        const nsfwBtn = await screen.findByRole('button', { name: /NSFW/i });
        fireEvent.click(nsfwBtn);

        // Click it again to untoggle
        fireEvent.click(nsfwBtn);
    });
});
