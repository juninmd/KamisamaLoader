// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '../test-utils';
import Settings from '../../../src/pages/Settings';

describe('Settings Page', () => {
    const mockSettings = {
        gamePath: '/game/path',
        modDownloadPath: '/mod/path',
        backgroundImage: 'bg.jpg',
        launchArgs: '-test',
        backgroundOpacity: 0.5
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (window.electronAPI.getSettings as any).mockResolvedValue(mockSettings);
        (window.electronAPI.installUE4SS as any).mockResolvedValue({ success: true, message: 'Done' });
        (window.electronAPI.selectGameDirectory as any).mockResolvedValue('/new/game/path');
        (window.electronAPI.selectModDirectory as any).mockResolvedValue(undefined); // Canceled
        (window.electronAPI.saveSettings as any).mockResolvedValue(true);
        (window.electronAPI.selectBackgroundImage as any).mockResolvedValue('new-bg.jpg');
    });

    it('should render settings', async () => {
        renderWithProviders(<Settings />, { initialSettings: mockSettings });

        await waitFor(() => {
            expect(screen.getByDisplayValue('/game/path')).toBeInTheDocument();
            expect(screen.getByDisplayValue('/mod/path')).toBeInTheDocument();
            expect(screen.getByDisplayValue('-test')).toBeInTheDocument();
        });
    });

    it('should update launch args', async () => {
        renderWithProviders(<Settings />, { initialSettings: mockSettings });
        await waitFor(() => screen.getByDisplayValue('-test'));

        const input = screen.getByDisplayValue('-test');
        fireEvent.change(input, { target: { value: '-new' } });

        expect(window.electronAPI.saveSettings).toHaveBeenCalledWith(expect.objectContaining({ launchArgs: '-new' }));
    });

    it('should select game directory', async () => {
        renderWithProviders(<Settings />, { initialSettings: mockSettings });
        const buttons = screen.getAllByText('Browse');
        fireEvent.click(buttons[0]);

        await waitFor(() => {
             expect(window.electronAPI.selectGameDirectory).toHaveBeenCalled();
             expect(window.electronAPI.saveSettings).toHaveBeenCalledWith(expect.objectContaining({ gamePath: '/new/game/path' }));
        });
    });

    it('should select mod directory', async () => {
        renderWithProviders(<Settings />, { initialSettings: mockSettings });
        const buttons = screen.getAllByText('Browse');
        fireEvent.click(buttons[1]);

        expect(window.electronAPI.selectModDirectory).toHaveBeenCalled();
    });

    it('should select background image', async () => {
        renderWithProviders(<Settings />, { initialSettings: mockSettings });
        const buttons = screen.getAllByText('Browse');
        fireEvent.click(buttons[2]); // 3rd browse button

        await waitFor(() => {
             expect(window.electronAPI.selectBackgroundImage).toHaveBeenCalled();
             expect(window.electronAPI.saveSettings).toHaveBeenCalledWith(expect.objectContaining({ backgroundImage: 'new-bg.jpg' }));
        });
    });

    it('should update background image text manually', async () => {
        renderWithProviders(<Settings />, { initialSettings: mockSettings });
        await waitFor(() => screen.getByDisplayValue('bg.jpg'));

        const input = screen.getByDisplayValue('bg.jpg');
        fireEvent.change(input, { target: { value: 'manual.jpg' } });

        expect(window.electronAPI.saveSettings).toHaveBeenCalledWith(expect.objectContaining({ backgroundImage: 'manual.jpg' }));
    });

    it('should update background opacity', async () => {
        renderWithProviders(<Settings />, { initialSettings: mockSettings });
        await waitFor(() => screen.getByText('50%'));

        const slider = screen.getByRole('slider');
        fireEvent.change(slider, { target: { value: '0.8' } });

        expect(window.electronAPI.saveSettings).toHaveBeenCalledWith(expect.objectContaining({ backgroundOpacity: 0.8 }));
    });

    it('should install UE4SS', async () => {
        renderWithProviders(<Settings />, { initialSettings: mockSettings });

        fireEvent.click(screen.getByText('Install / Update UE4SS'));

        await waitFor(() => {
            expect(window.electronAPI.installUE4SS).toHaveBeenCalled();
        });
    });

    it('should handle UE4SS failure', async () => {
         (window.electronAPI.installUE4SS as any).mockResolvedValue({ success: false, message: 'Fail' });
         renderWithProviders(<Settings />, { initialSettings: mockSettings });
         fireEvent.click(screen.getByText('Install / Update UE4SS'));
         await waitFor(() => {
             expect(window.electronAPI.installUE4SS).toHaveBeenCalled();
         });
    });

    it('should handle UE4SS exception', async () => {
         (window.electronAPI.installUE4SS as any).mockRejectedValue(new Error('Crash'));
         renderWithProviders(<Settings />, { initialSettings: mockSettings });
         fireEvent.click(screen.getByText('Install / Update UE4SS'));
         await waitFor(() => {
             expect(window.electronAPI.installUE4SS).toHaveBeenCalled();
         });
    });
});
