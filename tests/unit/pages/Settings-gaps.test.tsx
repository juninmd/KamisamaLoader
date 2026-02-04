// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, waitFor } from '../test-utils';
import Settings from '../../../src/pages/Settings';

describe('Settings Gaps', () => {
    it('should render with undefined optional settings', async () => {
        const minimalSettings = {
            gamePath: '/game',
            modDownloadPath: undefined,
            backgroundImage: undefined,
            backgroundOpacity: undefined,
            launchArgs: undefined
        };
        (window.electronAPI.getSettings as any).mockResolvedValue(minimalSettings);

        renderWithProviders(<Settings />, { initialSettings: minimalSettings });

        await waitFor(() => {
            expect(screen.getByDisplayValue('/game')).toBeInTheDocument();
        });

        // Check defaults
        // Opacity should default to 70% (0.7) -> 70% text
        expect(screen.getByText('70%')).toBeInTheDocument();

        // Inputs should be empty string, not undefined (controlled inputs)
        const bgInput = screen.getByPlaceholderText('URL or Path to background image') as HTMLInputElement;
        expect(bgInput.value).toBe('');
    });
});
