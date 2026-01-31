// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor, act } from '../test-utils';
import Dashboard from '../../../src/pages/Dashboard';

describe('Dashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (window.electronAPI.getInstalledMods as any).mockResolvedValue([
            { id: '1', isEnabled: true },
            { id: '2', isEnabled: false }
        ]);
        (window.electronAPI.checkForUpdates as any).mockResolvedValue(['1']);
        (window.electronAPI.fetchFeaturedMods as any).mockResolvedValue([
            { id: '10', name: 'Featured Mod', iconUrl: 'img.jpg' }
        ]);
        (window.electronAPI.launchGame as any).mockResolvedValue(true);
    });

    it('should render stats', async () => {
        await act(async () => {
            renderWithProviders(<Dashboard onNavigate={vi.fn()} />);
        });

        await waitFor(() => {
            // Total: 2
            expect(screen.getByText('2')).toBeInTheDocument();
            // Active: 1
            expect(screen.getByText('1')).toBeInTheDocument();
            // Updates: 1
            expect(screen.getByText('1 Updates Available')).toBeInTheDocument();
        });
    });

    it('should render featured mods', async () => {
        await act(async () => {
            renderWithProviders(<Dashboard onNavigate={vi.fn()} />);
        });

        await waitFor(() => {
            expect(screen.getByText('Featured Mod')).toBeInTheDocument();
        });
    });

    it('should launch game', async () => {
        await act(async () => {
            renderWithProviders(<Dashboard onNavigate={vi.fn()} />);
        });

        const launchBtn = screen.getByText('LAUNCH GAME');
        await act(async () => {
             fireEvent.click(launchBtn);
        });

        expect(window.electronAPI.launchGame).toHaveBeenCalled();
        expect(screen.getByText('INITIALIZING...')).toBeInTheDocument();
    });

    it('should navigate', async () => {
        const mockNavigate = vi.fn();
        await act(async () => {
            renderWithProviders(<Dashboard onNavigate={mockNavigate} />);
        });

        await waitFor(() => screen.getByText('View All'));
        await act(async () => {
            fireEvent.click(screen.getByText('View All'));
        });

        expect(mockNavigate).toHaveBeenCalledWith('mods');
    });
});
