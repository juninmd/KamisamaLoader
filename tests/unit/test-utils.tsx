import React, { ReactElement, useState } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ToastProvider } from '../../src/components/ToastContext';
import { SettingsContext } from '../../src/components/SettingsContext';
import { Settings } from '../../src/types';
import { vi } from 'vitest';

// Ensure default mocks prevent crashes
if (typeof window !== 'undefined' && window.electronAPI) {
    if (!window.electronAPI.getSettings) {
        window.electronAPI.getSettings = vi.fn();
    }
    (window.electronAPI.getSettings as any).mockResolvedValue({ gamePath: '/mock/game/path' });

    if (!window.electronAPI.getProfiles) {
        window.electronAPI.getProfiles = vi.fn();
    }
    (window.electronAPI.getProfiles as any).mockResolvedValue([]);

    if (!window.electronAPI.getInstalledMods) {
        window.electronAPI.getInstalledMods = vi.fn();
    }
    (window.electronAPI.getInstalledMods as any).mockResolvedValue([]);
}

const MockSettingsProvider = ({ children, initialSettings }: { children: React.ReactNode, initialSettings?: Partial<Settings> }) => {
    const [settings, setSettings] = useState<Settings>({
        gamePath: '/mock/game/path',
        modDownloadPath: '/mock/mods',
        backgroundImage: '',
        activeProfileId: 'default',
        launchArgs: '',
        backgroundOpacity: 0.5,
        ...initialSettings
    });

    const updateSettings = async (newSettings: Partial<Settings>) => {
        const merged = { ...settings, ...newSettings };
        setSettings(merged);
        if (window.electronAPI?.saveSettings) {
            await window.electronAPI.saveSettings(merged);
        }
    };

    const selectGameDirectory = async () => {
        if (window.electronAPI?.selectGameDirectory) {
            const path = await window.electronAPI.selectGameDirectory();
            if (path) updateSettings({ gamePath: path });
        }
    };

    const selectModDirectory = async () => {
        if (window.electronAPI?.selectModDirectory) {
            const path = await window.electronAPI.selectModDirectory();
            if (path) updateSettings({ modDownloadPath: path });
        }
    };

    const selectBackgroundImage = async () => {
         if (window.electronAPI?.selectBackgroundImage) {
            const path = await window.electronAPI.selectBackgroundImage();
            if (path) updateSettings({ backgroundImage: path });
        }
    };

    return (
        <SettingsContext.Provider value={{
            settings,
            updateSettings,
            selectGameDirectory,
            selectModDirectory,
            selectBackgroundImage,
            loading: false
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
    initialSettings?: Partial<Settings>;
}

const customRender = (
  ui: ReactElement,
  options?: CustomRenderOptions,
) => {
    const { initialSettings, ...renderOptions } = options || {};

    const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
      return (
        <ToastProvider>
            <MockSettingsProvider initialSettings={initialSettings}>
                {children}
            </MockSettingsProvider>
        </ToastProvider>
      );
    };

    return render(ui, { wrapper: AllTheProviders, ...renderOptions });
};

export * from '@testing-library/react';
export { customRender as renderWithProviders };
