// @vitest-environment happy-dom
import { mockElectronAPI } from './coverage-gaps-frontend.fixture';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Mods from '../../src/pages/Mods';
import Settings from '../../src/pages/Settings';
import { ToastProvider } from '../../src/components/ToastContext';
import { SettingsProvider } from '../../src/components/SettingsContext';
describe('Frontend Coverage Gaps', () => {
    describe('Mods Page - Drag and Drop', () => {
        beforeEach(() => {
            vi.clearAllMocks();
            mockElectronAPI.getInstalledMods.mockResolvedValue([]);
            mockElectronAPI.searchBySection.mockResolvedValue([]);
            mockElectronAPI.fetchCategories.mockResolvedValue([]);
            mockElectronAPI.onDownloadScanFinished.mockReturnValue(() => { });
        });
        it('should show overlay on drag enter and hide on drag leave', async () => {
            const { container } = render(<SettingsProvider>
                    <ToastProvider>
                        <Mods />
                    </ToastProvider>
                </SettingsProvider>);
            await act(async () => { await new Promise(r => setTimeout(r, 0)); });
            const dropZone = container.firstChild as HTMLElement;
            await act(async () => {
                fireEvent.dragEnter(dropZone, {
                    dataTransfer: {
                        items: [{ kind: 'file' }]
                    }
                });
            });
            expect(screen.getByText('Drop to Install')).toBeInTheDocument();
            await act(async () => {
                fireEvent.dragLeave(dropZone);
            });
            expect(screen.queryByText('Drop to Install')).not.toBeInTheDocument();
        });
    });
});
describe('Frontend Coverage Gaps', () => {
    describe('Mods Page - Drag and Drop', () => {
        beforeEach(() => {
            vi.clearAllMocks();
            mockElectronAPI.getInstalledMods.mockResolvedValue([]);
            mockElectronAPI.searchBySection.mockResolvedValue([]);
            mockElectronAPI.fetchCategories.mockResolvedValue([]);
            mockElectronAPI.onDownloadScanFinished.mockReturnValue(() => { });
        });
        it('should handle file drop and trigger install', async () => {
            mockElectronAPI.installMod.mockResolvedValue({ success: true });
            const { container } = render(<SettingsProvider>
                    <ToastProvider>
                        <Mods />
                    </ToastProvider>
                </SettingsProvider>);
            await act(async () => { await new Promise(r => setTimeout(r, 0)); });
            const dropZone = container.firstChild as HTMLElement;
            await act(async () => {
                fireEvent.dragEnter(dropZone, { dataTransfer: { items: [{ kind: 'file' }] } });
            });
            await act(async () => {
                const file = new File(['dummy'], 'mod.zip', { type: 'application/zip' });
                Object.defineProperty(file, 'path', { value: '/path/to/mod.zip' });
                fireEvent.drop(dropZone, {
                    dataTransfer: {
                        files: [file],
                        items: [{ kind: 'file', type: 'application/zip' }]
                    }
                });
            });
            expect(mockElectronAPI.installMod).toHaveBeenCalledWith('/path/to/mod.zip');
            expect(screen.queryByText('Drop to Install')).not.toBeInTheDocument();
        });
    });
});
describe('Frontend Coverage Gaps', () => {
    describe('Mods Page - Drag and Drop', () => {
        beforeEach(() => {
            vi.clearAllMocks();
            mockElectronAPI.getInstalledMods.mockResolvedValue([]);
            mockElectronAPI.searchBySection.mockResolvedValue([]);
            mockElectronAPI.fetchCategories.mockResolvedValue([]);
            mockElectronAPI.onDownloadScanFinished.mockReturnValue(() => { });
        });
        it('should show error toast if install fails', async () => {
            mockElectronAPI.installMod.mockResolvedValue({ success: false, message: 'Invalid File' });
            const { container } = render(<SettingsProvider>
                    <ToastProvider>
                        <Mods />
                    </ToastProvider>
                </SettingsProvider>);
            await act(async () => { await new Promise(r => setTimeout(r, 0)); });
            const dropZone = container.firstChild as HTMLElement;
            await act(async () => {
                fireEvent.dragEnter(dropZone, { dataTransfer: { items: [{ kind: 'file' }] } });
            });
            await act(async () => {
                const file = new File(['dummy'], 'mod.zip');
                Object.defineProperty(file, 'path', { value: '/path/to/mod.zip' });
                fireEvent.drop(dropZone, {
                    dataTransfer: { files: [file] }
                });
            });
            expect(await screen.findByText('Invalid File')).toBeInTheDocument();
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
        it('should handle UE4SS install success', async () => {
            mockElectronAPI.installUE4SS.mockResolvedValue({ success: true, message: 'UE4SS Installed' });
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
            expect(mockElectronAPI.installUE4SS).toHaveBeenCalled();
            expect(await screen.findByText('UE4SS Installed')).toBeInTheDocument();
        });
    });
});
