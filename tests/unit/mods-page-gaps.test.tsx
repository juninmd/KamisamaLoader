/**
 * @vitest-environment happy-dom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, waitFor, screen } from '@testing-library/react';
import Mods from '../../src/pages/Mods';
import { renderWithProviders } from './test-utils';

describe('Mods Component - ModDetailsModal installation', () => {
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
             { id: 'installed1', name: 'Installed Mod 1', gameBananaId: '100', hasUpdate: true }
        ]);
        window.electronAPI.checkForUpdates = vi.fn().mockResolvedValue(['installed1']);
        window.electronAPI.getSettings = vi.fn().mockResolvedValue({});
        window.electronAPI.getProfiles = vi.fn().mockResolvedValue([]);
        window.electronAPI.getDownloads = vi.fn().mockResolvedValue([]);
        window.electronAPI.onDownloadProgress = vi.fn();
        window.electronAPI.onDownloadUpdate = vi.fn();
        window.electronAPI.searchMods = vi.fn().mockResolvedValue({ mods: [], hasMore: false, total: 0 });
        window.electronAPI.searchBySection = vi.fn().mockResolvedValue([
            { id: '1000', name: 'Cool Mod', author: 'Author', gameBananaId: '1000' }
        ]);
        window.electronAPI.fetchCategories = vi.fn().mockResolvedValue([]);
        window.electronAPI.fetchFeaturedMods = vi.fn().mockResolvedValue([]);
        window.electronAPI.updateAllMods = vi.fn().mockResolvedValue(true);
        window.electronAPI.updateMod = vi.fn().mockResolvedValue(true);
        window.electronAPI.getModChangelog = vi.fn().mockResolvedValue([]);
        window.electronAPI.installOnlineMod = vi.fn().mockResolvedValue(true);
    });

    it('should handle cancel update via ModDetailsModal', async () => {
        // Setup initial installed mods that need update
        window.electronAPI.getInstalledMods = vi.fn().mockResolvedValue([
            { id: 'installed1', name: 'Installed Mod 1', gameBananaId: '100', hasUpdate: true, version: '1.0' }
        ]);
        window.electronAPI.checkForUpdates = vi.fn().mockResolvedValue(['installed1']);
        window.electronAPI.getModChangelog = vi.fn().mockResolvedValue([{ version: '2.0', text: 'Update notes' }]);

        renderWithProviders(<Mods />);

        // The exact aria-label used by ModCard for update
        const updateButton = await screen.findByRole('button', { name: 'Update' });
        fireEvent.click(updateButton);

        // Wait for changelog fetch
        await waitFor(() => {
            expect(window.electronAPI.getModChangelog).toHaveBeenCalled();
        });

        // The update dialog should appear
        await waitFor(() => {
            expect(screen.getByText('Update Available')).toBeInTheDocument();
        });

        const cancelBtn = screen.getByText('Skip Update');
        fireEvent.click(cancelBtn);

        await waitFor(() => {
             expect(screen.queryByText('Update Available')).not.toBeInTheDocument();
        });
    });
});
