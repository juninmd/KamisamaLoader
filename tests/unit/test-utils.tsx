import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ToastProvider } from '../../src/components/ToastContext';
import { SettingsProvider } from '../../src/components/SettingsContext';
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

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ToastProvider>
        <SettingsProvider>
            {children}
        </SettingsProvider>
    </ToastProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as renderWithProviders };
