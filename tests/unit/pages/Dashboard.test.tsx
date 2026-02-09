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
            expect(screen.getByText('2')).toBeInTheDocument();
            expect(screen.getByText('1')).toBeInTheDocument();
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
        fireEvent.click(launchBtn);

        expect(window.electronAPI.launchGame).toHaveBeenCalled();
        expect(screen.getByText('INITIALIZING...')).toBeInTheDocument();
    });

    it('should handle launch game failure and reset state', async () => {
        vi.useFakeTimers();
        (window.electronAPI.launchGame as any).mockRejectedValue(new Error('Launch Fail'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        await act(async () => {
            renderWithProviders(<Dashboard onNavigate={vi.fn()} />);
        });

        const launchBtn = screen.getByText('LAUNCH GAME');
        fireEvent.click(launchBtn);

        // State changes to launching (INITIALIZING...)
        await act(async () => {
            // allow promise rejection to process
        });
        expect(screen.getByText('INITIALIZING...')).toBeInTheDocument();

        // Advance timer to trigger reset
        await act(async () => {
            vi.advanceTimersByTime(5100);
        });

        expect(screen.getByText('LAUNCH GAME')).toBeInTheDocument();
        expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
        vi.useRealTimers();
    });

    it('should handle image error', async () => {
        await act(async () => {
            renderWithProviders(<Dashboard onNavigate={vi.fn()} />);
        });

        // Find an image. Featured Mod has iconUrl 'img.jpg' from mock.
        const img = screen.getByAltText('Featured Mod');
        // Trigger error handler to cover the line
        fireEvent.error(img);
    });

    it('should navigate', async () => {
        const mockNavigate = vi.fn();
        await act(async () => {
            renderWithProviders(<Dashboard onNavigate={mockNavigate} />);
        });

        await waitFor(() => screen.getByText('View All'));
        fireEvent.click(screen.getByText('View All'));

        expect(mockNavigate).toHaveBeenCalledWith('mods');
    });

    it('should handle 0 installed mods gracefully', async () => {
        (window.electronAPI.getInstalledMods as any).mockResolvedValue([]);
        await act(async () => {
            renderWithProviders(<Dashboard onNavigate={vi.fn()} />);
        });
        await waitFor(() => {
            expect(screen.getAllByText('0')[0]).toBeInTheDocument();
        });
    });
});
