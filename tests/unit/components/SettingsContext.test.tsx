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
            <button onClick={selectGameDirectory}>Select</button>
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
        (window.electronAPI.selectBackgroundImage as any).mockResolvedValue('/bg.png');
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

    it('should handle save settings failure', async () => {
        (window.electronAPI.saveSettings as any).mockResolvedValue(false);
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(
            <SettingsProvider>
                <TestComponent />
            </SettingsProvider>
        );
        await waitFor(() => screen.getByTestId('gamePath'));

        act(() => {
            screen.getByText('Update').click();
        });

        // Should revert or not update?
        // Logic says: setSettings(new) -> save(new) -> if fail ?
        // Usually optimistic update is done. If fail, maybe we don't rollback but we log error.
        await waitFor(() => {
             expect(consoleSpy).toHaveBeenCalledWith('Failed to save settings');
        });
    });

    it('should handle save settings exception', async () => {
        (window.electronAPI.saveSettings as any).mockRejectedValue(new Error('Fail'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

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
             expect(consoleSpy).toHaveBeenCalledWith('Failed to save settings:', expect.any(Error));
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

    it('should handle select game directory cancellation', async () => {
        (window.electronAPI.selectGameDirectory as any).mockResolvedValue(null);
        render(
            <SettingsProvider>
                <TestComponent />
            </SettingsProvider>
        );
        await waitFor(() => screen.getByTestId('gamePath'));
        const initialPath = screen.getByTestId('gamePath').textContent;

        act(() => {
            screen.getByText('Select').click();
        });

        await waitFor(() => {
            expect(window.electronAPI.selectGameDirectory).toHaveBeenCalled();
            expect(screen.getByTestId('gamePath')).toHaveTextContent(initialPath || '');
        });
    });

     it('should handle load settings failure', async () => {
        (window.electronAPI.getSettings as any).mockRejectedValue(new Error('Fail'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(
            <SettingsProvider>
                <TestComponent />
            </SettingsProvider>
        );

        await waitFor(() => {
             expect(consoleSpy).toHaveBeenCalledWith('Failed to load settings:', expect.any(Error));
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
            expect(window.electronAPI.saveSettings).toHaveBeenCalledWith(expect.objectContaining({ modDownloadPath: '/mod/path' }));
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
            expect(window.electronAPI.saveSettings).toHaveBeenCalledWith(expect.objectContaining({ backgroundImage: '/bg.png' }));
        });
    });

    it('should handle select mod directory failure', async () => {
        (window.electronAPI.selectModDirectory as any).mockRejectedValue(new Error('Fail'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(<SettingsProvider><TestComponent /></SettingsProvider>);
        await waitFor(() => screen.getByTestId('gamePath'));

        act(() => { screen.getByText('Select Mod Dir').click(); });

        await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error)));
    });

    it('should handle select background image failure', async () => {
        (window.electronAPI.selectBackgroundImage as any).mockRejectedValue(new Error('Fail'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(<SettingsProvider><TestComponent /></SettingsProvider>);
        await waitFor(() => screen.getByTestId('gamePath'));

        act(() => { screen.getByText('Select BG').click(); });

        await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error)));
    });
});
