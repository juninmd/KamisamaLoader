// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '../test-utils';
import { useSettings, SettingsProvider } from '../../../src/components/SettingsContext';
import { useEffect } from 'react';

const TestComponent = () => {
    const { settings, updateSettings, selectGameDirectory, selectModDirectory, selectBackgroundImage } = useSettings();
    return (
        <div>
            <span data-testid="gamePath">{settings.gamePath}</span>
            <span data-testid="modPath">{settings.modDownloadPath}</span>
            <span data-testid="bgImage">{settings.backgroundImage}</span>
            <button onClick={() => updateSettings({ gamePath: '/new/path' })}>Update</button>
            <button onClick={selectGameDirectory}>Select Game</button>
            <button onClick={selectModDirectory}>Select Mod Dir</button>
            <button onClick={selectBackgroundImage}>Select BG</button>
        </div>
    );
};

describe('SettingsContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (window.electronAPI.getSettings as any).mockResolvedValue({ gamePath: '/initial/path' });
        (window.electronAPI.saveSettings as any).mockResolvedValue(true);
        (window.electronAPI.selectGameDirectory as any).mockResolvedValue('/selected/path');
        (window.electronAPI.selectModDirectory as any).mockResolvedValue('/mod/path');
        (window.electronAPI.selectBackgroundImage as any).mockResolvedValue('image.png');
    });

    it('should load settings on mount', async () => {
        render(
            <SettingsProvider>
                <TestComponent />
            </SettingsProvider>
        );
        await waitFor(() => {
            expect(screen.getByTestId('gamePath')).toHaveTextContent('/initial/path');
        });
    });

    it('should update settings', async () => {
        render(
            <SettingsProvider>
                <TestComponent />
            </SettingsProvider>
        );
        await waitFor(() => screen.getByTestId('gamePath'));

        act(() => {
            screen.getByText('Update').click();
        });

        await waitFor(() => {
            expect(screen.getByTestId('gamePath')).toHaveTextContent('/new/path');
            expect(window.electronAPI.saveSettings).toHaveBeenCalledWith(expect.objectContaining({ gamePath: '/new/path' }));
        });
    });

    it('should select game directory', async () => {
        render(
            <SettingsProvider>
                <TestComponent />
            </SettingsProvider>
        );
        await waitFor(() => screen.getByTestId('gamePath'));

        act(() => {
            screen.getByText('Select Game').click();
        });

        await waitFor(() => {
            expect(window.electronAPI.selectGameDirectory).toHaveBeenCalled();
            expect(screen.getByTestId('gamePath')).toHaveTextContent('/selected/path');
        });
    });

    it('should select mod directory', async () => {
        render(
            <SettingsProvider>
                <TestComponent />
            </SettingsProvider>
        );
        await waitFor(() => screen.getByTestId('gamePath'));

        act(() => {
            screen.getByText('Select Mod Dir').click();
        });

        await waitFor(() => {
            expect(window.electronAPI.selectModDirectory).toHaveBeenCalled();
            expect(screen.getByTestId('modPath')).toHaveTextContent('/mod/path');
        });
    });

    it('should select background image', async () => {
        render(
            <SettingsProvider>
                <TestComponent />
            </SettingsProvider>
        );
        await waitFor(() => screen.getByTestId('gamePath'));

        act(() => {
            screen.getByText('Select BG').click();
        });

        await waitFor(() => {
            expect(window.electronAPI.selectBackgroundImage).toHaveBeenCalled();
            expect(screen.getByTestId('bgImage')).toHaveTextContent('image.png');
        });
    });

    it('should handle load settings error', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        (window.electronAPI.getSettings as any).mockRejectedValue(new Error('Fail'));

        render(
            <SettingsProvider>
                <TestComponent />
            </SettingsProvider>
        );

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith('Failed to load settings:', expect.anything());
        });
    });

    it('should throw error if useSettings used outside provider', () => {
        // Suppress React error boundary logging for this test
        const consoleError = console.error;
        console.error = vi.fn();

        expect(() => {
            render(<TestComponent />);
        }).toThrow('useSettings must be used within a SettingsProvider');

        console.error = consoleError;
    });
});
