// @vitest-environment happy-dom
import { mockElectronAPI } from './coverage-gaps-frontend.fixture';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Settings from '../../src/pages/Settings';
import { ToastProvider } from '../../src/components/ToastContext';
import { SettingsProvider } from '../../src/components/SettingsContext';
describe('Frontend Coverage Gaps', () => {
    describe('Settings Page Interactions', () => {
        beforeEach(() => {
            vi.clearAllMocks();
            mockElectronAPI.getSettings.mockResolvedValue({ gamePath: '/game' });
            mockElectronAPI.saveSettings.mockResolvedValue(true);
        });
        it('should handle UE4SS install failure', async () => {
            mockElectronAPI.installUE4SS.mockResolvedValue({ success: false, message: 'Install Failed' });
            await act(async () => {
                render(<SettingsProvider>
                        <ToastProvider>
                            <Settings />
                        </ToastProvider>
                    </SettingsProvider>);
            });
            const installBtn = screen.getByText('Install / Update UE4SS');
            await act(async () => {
                fireEvent.click(installBtn);
            });
            expect(await screen.findByText('Install Failed')).toBeInTheDocument();
        });
    });
});
describe('Frontend Coverage Gaps', () => {
    describe('Settings Page Interactions', () => {
        beforeEach(() => {
            vi.clearAllMocks();
            mockElectronAPI.getSettings.mockResolvedValue({ gamePath: '/game' });
            mockElectronAPI.saveSettings.mockResolvedValue(true);
        });
        it('should handle select game directory', async () => {
            mockElectronAPI.selectGameDirectory.mockResolvedValue('/new/game/path');
            await act(async () => {
                render(<SettingsProvider>
                        <ToastProvider>
                            <Settings />
                        </ToastProvider>
                    </SettingsProvider>);
            });
            const browseBtns = screen.getAllByText('Browse');
            const gameDirBrowse = browseBtns[0];
            await act(async () => {
                fireEvent.click(gameDirBrowse);
            });
            expect(mockElectronAPI.selectGameDirectory).toHaveBeenCalled();
            expect(mockElectronAPI.saveSettings).toHaveBeenCalledWith(expect.objectContaining({ gamePath: '/new/game/path' }));
        });
    });
});
describe('Frontend Coverage Gaps', () => {
    describe('Settings Page Interactions', () => {
        beforeEach(() => {
            vi.clearAllMocks();
            mockElectronAPI.getSettings.mockResolvedValue({ gamePath: '/game' });
            mockElectronAPI.saveSettings.mockResolvedValue(true);
        });
        it('should handle select mod directory', async () => {
            mockElectronAPI.selectModDirectory.mockResolvedValue('/new/mod/path');
            await act(async () => {
                render(<SettingsProvider>
                        <ToastProvider>
                            <Settings />
                        </ToastProvider>
                    </SettingsProvider>);
            });
            const browseBtns = screen.getAllByText('Browse');
            const modDirBrowse = browseBtns[1];
            await act(async () => {
                fireEvent.click(modDirBrowse);
            });
            expect(mockElectronAPI.selectModDirectory).toHaveBeenCalled();
            expect(mockElectronAPI.saveSettings).toHaveBeenCalledWith(expect.objectContaining({ modDownloadPath: '/new/mod/path' }));
        });
    });
});
describe('Frontend Coverage Gaps', () => {
    describe('Settings Page Interactions', () => {
        beforeEach(() => {
            vi.clearAllMocks();
            mockElectronAPI.getSettings.mockResolvedValue({ gamePath: '/game' });
            mockElectronAPI.saveSettings.mockResolvedValue(true);
        });
        it('should handle background image selection', async () => {
            mockElectronAPI.selectBackgroundImage.mockResolvedValue('file:///bg.jpg');
            await act(async () => {
                render(<SettingsProvider>
                        <ToastProvider>
                            <Settings />
                        </ToastProvider>
                    </SettingsProvider>);
            });
            const browseBtns = screen.getAllByText('Browse');
            const bgBrowse = browseBtns[2];
            await act(async () => {
                fireEvent.click(bgBrowse);
            });
            expect(mockElectronAPI.selectBackgroundImage).toHaveBeenCalled();
            expect(mockElectronAPI.saveSettings).toHaveBeenCalledWith(expect.objectContaining({ backgroundImage: 'file:///bg.jpg' }));
        });
    });
});
