// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '../test-utils';
import { useSettings, SettingsProvider } from '../../../src/components/SettingsContext';
import { useEffect } from 'react';

const TestComponent = () => {
    const { settings, updateSettings, selectGameDirectory } = useSettings();
    return (
        <div>
            <span data-testid="gamePath">{settings.gamePath}</span>
            <button onClick={() => updateSettings({ gamePath: '/new/path' })}>Update</button>
            <button onClick={selectGameDirectory}>Select</button>
        </div>
    );
};

describe('SettingsContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (window.electronAPI.getSettings as any).mockResolvedValue({ gamePath: '/initial/path' });
        (window.electronAPI.saveSettings as any).mockResolvedValue(true);
        (window.electronAPI.selectGameDirectory as any).mockResolvedValue('/selected/path');
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
            screen.getByText('Select').click();
        });

        await waitFor(() => {
            expect(window.electronAPI.selectGameDirectory).toHaveBeenCalled();
            expect(screen.getByTestId('gamePath')).toHaveTextContent('/selected/path');
        });
    });
});
