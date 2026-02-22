// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Dashboard from '../../../src/pages/Dashboard.tsx';

describe('Dashboard Final Gaps', () => {
    const mockNavigate = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        window.electronAPI = {
            getInstalledMods: vi.fn().mockResolvedValue([]),
            checkForUpdates: vi.fn().mockResolvedValue([]),
            fetchFeaturedMods: vi.fn().mockResolvedValue([]),
            launchGame: vi.fn().mockRejectedValue(new Error('Launch Failed'))
        } as any;
    });

    it('should handle launch game error', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // Mock setTimeout to run immediately to verify recovery logic
        const setTimeoutSpy = vi.spyOn(window, 'setTimeout').mockImplementation((cb: any) => {
            try { cb(); } catch (e) { }
            return 0 as any;
        });

        render(<Dashboard onNavigate={mockNavigate} />);

        // Flush initial effects
        await act(async () => { await Promise.resolve(); });

        const launchButton = screen.getByRole('button', { name: /LAUNCH GAME/i });
        fireEvent.click(launchButton);

        expect(window.electronAPI.launchGame).toHaveBeenCalled();

        // Wait for rejected promise handling and effects
        await act(async () => { await Promise.resolve(); });
        await act(async () => { await Promise.resolve(); });

        expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));

        // Verify state reset happened (because setTimeout mock ran immediately)
        // We use findByText to allow React a moment to render the update
        setTimeoutSpy.mockRestore(); // Restore so findByText can use real timers if needed
        expect(await screen.findByText('LAUNCH GAME')).toBeInTheDocument();
    });
});
