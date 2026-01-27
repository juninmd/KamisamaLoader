// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '../test-utils';
import Settings from '../../../src/pages/Settings';

describe('Settings Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (window.electronAPI.getSettings as any).mockResolvedValue({
            gamePath: '/game/path',
            modDownloadPath: '/mod/path',
            backgroundImage: 'bg.jpg',
            launchArgs: '-test'
        });
        (window.electronAPI.installUE4SS as any).mockResolvedValue({ success: true, message: 'Done' });
    });

    it('should render settings', async () => {
        renderWithProviders(<Settings />);

        await waitFor(() => {
            expect(screen.getByDisplayValue('/game/path')).toBeInTheDocument();
            expect(screen.getByDisplayValue('/mod/path')).toBeInTheDocument();
            expect(screen.getByDisplayValue('-test')).toBeInTheDocument();
        });
    });

    it('should update launch args', async () => {
        renderWithProviders(<Settings />);
        await waitFor(() => screen.getByDisplayValue('-test'));

        const input = screen.getByDisplayValue('-test');
        fireEvent.change(input, { target: { value: '-new' } });

        expect(window.electronAPI.saveSettings).toHaveBeenCalledWith(expect.objectContaining({ launchArgs: '-new' }));
    });

    it('should install UE4SS', async () => {
        renderWithProviders(<Settings />);

        fireEvent.click(screen.getByText('Install / Update UE4SS'));

        await waitFor(() => {
            expect(window.electronAPI.installUE4SS).toHaveBeenCalled();
        });
    });
});
