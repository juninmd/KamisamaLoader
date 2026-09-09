// @vitest-environment happy-dom
import { mockElectronAPI } from './mods-page-final-coverage.fixture';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Mods from '../../src/pages/Mods';
import { ToastProvider } from '../../src/components/ToastContext';
import { SettingsProvider } from '../../src/components/SettingsContext';
describe('Mods Page Final Coverage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockElectronAPI.getInstalledMods.mockResolvedValue([]);
        mockElectronAPI.getSettings.mockResolvedValue({});
        mockElectronAPI.getDownloads.mockResolvedValue([]);
        mockElectronAPI.onDownloadScanFinished.mockReturnValue(() => { });
        mockElectronAPI.onDownloadProgress.mockReturnValue(() => { });
        mockElectronAPI.onDownloadUpdate.mockReturnValue(() => { });
    });
    const renderMods = () => {
        return render(<SettingsProvider>
                <ToastProvider>
                    <Mods />
                </ToastProvider>
            </SettingsProvider>);
    };
    it('should handle external download trigger (deep link)', async () => {
        let triggerCallback: any;
        mockElectronAPI.onDownloadScanFinished.mockImplementation((cb: any) => {
            triggerCallback = cb;
            return () => { };
        });
        renderMods();
        act(() => {
            if (triggerCallback)
                triggerCallback();
        });
        await waitFor(() => {
            expect(mockElectronAPI.getInstalledMods).toHaveBeenCalledTimes(2);
        });
    });
});
describe('Mods Page Final Coverage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockElectronAPI.getInstalledMods.mockResolvedValue([]);
        mockElectronAPI.getSettings.mockResolvedValue({});
        mockElectronAPI.getDownloads.mockResolvedValue([]);
        mockElectronAPI.onDownloadScanFinished.mockReturnValue(() => { });
        mockElectronAPI.onDownloadProgress.mockReturnValue(() => { });
        mockElectronAPI.onDownloadUpdate.mockReturnValue(() => { });
    });
    const renderMods = () => {
        return render(<SettingsProvider>
                <ToastProvider>
                    <Mods />
                </ToastProvider>
            </SettingsProvider>);
    };
    it('should handle toggle conflict warning', async () => {
        mockElectronAPI.getInstalledMods.mockResolvedValue([
            { id: '1', name: 'Mod1', isEnabled: true }
        ]);
        mockElectronAPI.toggleMod.mockResolvedValue({ success: true, conflict: 'Warning: Conflict' });
        renderMods();
        await waitFor(() => screen.getByText('Mod1'));
        const switchEl = screen.getByRole('checkbox') || screen.getAllByRole('switch')[0];
        const toggle = screen.getAllByRole('checkbox')[0];
        fireEvent.click(toggle);
        await waitFor(() => {
            expect(mockElectronAPI.toggleMod).toHaveBeenCalled();
        });
    });
});
describe('Mods Page Final Coverage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockElectronAPI.getInstalledMods.mockResolvedValue([]);
        mockElectronAPI.getSettings.mockResolvedValue({});
        mockElectronAPI.getDownloads.mockResolvedValue([]);
        mockElectronAPI.onDownloadScanFinished.mockReturnValue(() => { });
        mockElectronAPI.onDownloadProgress.mockReturnValue(() => { });
        mockElectronAPI.onDownloadUpdate.mockReturnValue(() => { });
    });
    const renderMods = () => {
        return render(<SettingsProvider>
                <ToastProvider>
                    <Mods />
                </ToastProvider>
            </SettingsProvider>);
    };
    it('should handle toggle failure revert', async () => {
        mockElectronAPI.getInstalledMods.mockResolvedValue([
            { id: '1', name: 'Mod1', isEnabled: true }
        ]);
        mockElectronAPI.toggleMod.mockResolvedValue({ success: false });
        renderMods();
        await waitFor(() => screen.getByText('Mod1'));
        const toggle = screen.getAllByRole('checkbox')[0];
        fireEvent.click(toggle);
        await waitFor(() => {
            expect(mockElectronAPI.toggleMod).toHaveBeenCalled();
        });
    });
});
