/**
 * @vitest-environment happy-dom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, waitFor, screen } from '@testing-library/react';
import Mods from '../../src/pages/Mods';
import { renderWithProviders } from './test-utils';

describe('Mods Component - loadInstalledMods onProfileLoaded Coverage', () => {
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

        window.electronAPI.getInstalledMods = vi.fn().mockResolvedValue([
            { id: 'mod1', name: 'Mod 1', gameBananaId: '123', priority: 1, type: 'zip' }
        ]);
        window.electronAPI.checkForUpdates = vi.fn().mockResolvedValue([]);
        window.electronAPI.getSettings = vi.fn().mockResolvedValue({});
        window.electronAPI.getProfiles = vi.fn().mockResolvedValue([
             { id: 'p1', name: 'Profile 1', modIds: [] } // Add modIds: []
        ]);
        window.electronAPI.getDownloads = vi.fn().mockResolvedValue([]);
        window.electronAPI.onDownloadProgress = vi.fn();
        window.electronAPI.onDownloadUpdate = vi.fn();
        window.electronAPI.searchMods = vi.fn().mockResolvedValue({ mods: [], hasMore: false, total: 0 });
        window.electronAPI.searchBySection = vi.fn().mockResolvedValue([]);
        window.electronAPI.fetchCategories = vi.fn().mockResolvedValue([]);
        window.electronAPI.fetchFeaturedMods = vi.fn().mockResolvedValue([]);
        window.electronAPI.loadProfile = vi.fn().mockResolvedValue({ success: true });

        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('should trigger onProfileLoaded and reload mods', async () => {
        renderWithProviders(<Mods />);

        // Wait for it to be on Installed
        await waitFor(() => {
            expect(screen.getByText('Installed')).toBeInTheDocument();
        });

        // Find profile manager by title
        const profileBtn = await screen.findByTitle(/Manage Mod Profiles/i);
        fireEvent.click(profileBtn);

        // Click a profile to load it
        const loadBtn = await screen.findByText('Profile 1');
        fireEvent.click(loadBtn);

        // Expect getInstalledMods to be called again
        await waitFor(() => {
            // 1st time on mount, 2nd time on profile loaded
            expect(window.electronAPI.getInstalledMods).toHaveBeenCalledTimes(2);
        });
    });

    it('should hit check updates error path', async () => {
         window.electronAPI.checkForUpdates = vi.fn().mockRejectedValue(new Error('Update Check Error'));

         renderWithProviders(<Mods />);

         // Trigger Check Updates via the FilterBar button
         const checkBtn = await screen.findByRole('button', { name: /Check Updates/i });
         fireEvent.click(checkBtn);

         await waitFor(() => {
             expect(console.error).toHaveBeenCalled();
         });
    });
});
