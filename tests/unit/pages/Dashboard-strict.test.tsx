// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '../test-utils';
import Dashboard from '../../../src/pages/Dashboard';

describe('Dashboard Strict Coverage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render fully populated dashboard', async () => {
        const mockMods = [
            { id: '1', name: 'Mod 1', isEnabled: true, fileSize: 100 },
            { id: '2', name: 'Mod 2', isEnabled: false, fileSize: 200 }
        ];
        const mockUpdates = ['1'];
        const mockFeatured = [
            { id: 'f1', name: 'Feat 1', downloadCount: 10, viewCount: 20, author: 'A', category: 'C', iconUrl: 'url' },
            { id: 'f2', name: 'Feat 2', downloadCount: 11, viewCount: 21, author: 'B', category: 'D', iconUrl: 'url' }
        ];

        (window.electronAPI.getInstalledMods as any).mockResolvedValue(mockMods);
        (window.electronAPI.checkForUpdates as any).mockResolvedValue(mockUpdates);
        (window.electronAPI.fetchFeaturedMods as any).mockResolvedValue(mockFeatured);
        (window.electronAPI.fetchNewMods as any).mockResolvedValue([]);

        renderWithProviders(<Dashboard />);

        await waitFor(() => {
            // Check stats rendering
            expect(screen.getByText('2')).toBeInTheDocument(); // Total
            expect(screen.getByText('1')).toBeInTheDocument(); // Enabled
            expect(screen.getByText('1 Updates Available')).toBeInTheDocument(); // Updates

            // Check featured mods rendering
            expect(screen.getByText('Feat 1')).toBeInTheDocument();
            expect(screen.getByText('Feat 2')).toBeInTheDocument();
            expect(screen.getByText('10')).toBeInTheDocument(); // Download count
            expect(screen.getByText('20 views')).toBeInTheDocument(); // View count
        });
    });

    it('should handle zero updates state', async () => {
        (window.electronAPI.getInstalledMods as any).mockResolvedValue([]);
        (window.electronAPI.checkForUpdates as any).mockResolvedValue([]);
        (window.electronAPI.fetchFeaturedMods as any).mockResolvedValue([]);

        renderWithProviders(<Dashboard />);

        await waitFor(() => {
            // "Updates Available" banner should NOT be present
            expect(screen.queryByText(/Updates Available/)).not.toBeInTheDocument();
        });
    });
});
