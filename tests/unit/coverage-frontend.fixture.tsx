import { vi } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MockSettingsProvider, MockToastProvider } from './test-utils';
import React from 'react';
const mockElectron = {
    getInstalledMods: vi.fn(),
    searchBySection: vi.fn(),
    fetchCategories: vi.fn(),
    installOnlineMod: vi.fn(),
    installMod: vi.fn(),
    toggleMod: vi.fn(),
    uninstallMod: vi.fn(),
    updateAllMods: vi.fn(),
    updateMod: vi.fn(),
    setModPriority: vi.fn(),
    getModChangelog: vi.fn(),
    checkForUpdates: vi.fn(),
    getProfiles: vi.fn(),
    getSettings: vi.fn(),
    createProfile: vi.fn(),
    loadProfile: vi.fn(),
    deleteProfile: vi.fn(),
    onDownloadScanFinished: vi.fn(() => () => { }),
    onDownloadProgress: vi.fn(() => () => { }),
    onDownloadComplete: vi.fn(() => () => { })
};
Object.defineProperty(window, 'electronAPI', {
    value: mockElectron,
    writable: true
});
if (!window.confirm) {
    window.confirm = vi.fn();
}
const renderWithProviders = (component: React.ReactNode) => {
    return render(<MockSettingsProvider>
            <MockToastProvider>
                {component}
            </MockToastProvider>
        </MockSettingsProvider>);
};
export { mockElectron, renderWithProviders };
