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

    const setupDashboard = async () => {
        const utils = render(<Dashboard onNavigate={mockNavigate} />);
        await act(async () => { await Promise.resolve(); });
        return utils;
    };

    it('should handle navigation click on updates banner', async () => {
        window.electronAPI.checkForUpdates = vi.fn().mockResolvedValue(['mod1']);
        window.electronAPI.getInstalledMods = vi.fn().mockResolvedValue([
            { id: 'mod1', isEnabled: true, name: 'Test Mod', author: 'Tester' }
        ]);

        await setupDashboard();

        const updateBanner = await screen.findByText(/1 Updates Available/i);
        expect(updateBanner).toBeInTheDocument();

        fireEvent.click(updateBanner);

        expect(mockNavigate).toHaveBeenCalledWith('mods');
    });

    it('should render featured mods correctly (Line 206)', async () => {
        window.electronAPI.fetchFeaturedMods = vi.fn().mockResolvedValue([
            { id: '1', name: 'Featured 1', iconUrl: 'icon1.png', category: 'Char', author: 'Me', downloadCount: 10, viewCount: 20 }
        ]);

        await setupDashboard();

        expect(await screen.findByText('Featured 1')).toBeInTheDocument();
        expect(screen.getByText('Char • by Me')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
        expect(screen.getByText('20 views')).toBeInTheDocument();
    });

    it('should handle navigation click on View All (Line 189)', async () => {
        await setupDashboard();

        const viewAllBtn = screen.getByText('View All');
        fireEvent.click(viewAllBtn);

        expect(mockNavigate).toHaveBeenCalledWith('mods');
    });

    it('should handle navigation click on Browse Mods (Line 169)', async () => {
        await setupDashboard();

        const browseModsCard = screen.getByText('Browse Mods').closest('.glass-panel');
        fireEvent.click(browseModsCard as HTMLElement);

        expect(mockNavigate).toHaveBeenCalledWith('mods');
    });

    it('should handle data load error gracefully', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        window.electronAPI.getInstalledMods = vi.fn().mockRejectedValue(new Error('Load Error'));

        await setupDashboard();

        expect(consoleSpy).toHaveBeenCalledWith("Dashboard data load error:", expect.any(Error));
    });

    it('should handle missing data effectively', async () => {
        // Should handle null returns from API
        window.electronAPI.getInstalledMods = vi.fn().mockResolvedValue(null);
        window.electronAPI.checkForUpdates = vi.fn().mockResolvedValue(null);

        await setupDashboard();

        const zeros = screen.getAllByText('0');
        expect(zeros.length).toBeGreaterThan(0); // Total and Enabled should be 0
    });

    it('should handle character image error (Line 116)', async () => {
        const { container } = render(<Dashboard onNavigate={mockNavigate} />);

        const charImg = container.querySelector('img[src*="fortniteapi.io"]') as HTMLImageElement;
        expect(charImg).toBeInTheDocument();

        fireEvent.error(charImg);
        expect(charImg.style.display).toBe('none');
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
