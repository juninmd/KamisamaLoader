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
    it('should handle Drag and Drop file installation', async () => {
        const { container } = renderMods();
        const dropZone = container.firstChild as HTMLElement;
        fireEvent.dragEnter(dropZone!, {
            dataTransfer: { items: [{ kind: 'file' }] }
        });
        expect(screen.getByText(/Drop to Install/i)).toBeInTheDocument();
        fireEvent.dragLeave(dropZone!);
        await waitFor(() => {
            expect(screen.queryByText(/Drop to Install/i)).not.toBeInTheDocument();
        });
        const file = new File(['content'], 'mod.pak', { type: 'application/octet-stream' });
        Object.defineProperty(file, 'path', { value: '/path/to/mod.pak' });
        mockElectronAPI.installMod.mockResolvedValue({ success: true });
        fireEvent.dragEnter(dropZone!, { dataTransfer: { items: [file] } });
        fireEvent.drop(dropZone!, {
            dataTransfer: { files: [file] }
        });
        await waitFor(() => {
            expect(mockElectronAPI.installMod).toHaveBeenCalledWith('/path/to/mod.pak');
            expect(screen.queryByText(/Drop to Install/i)).not.toBeInTheDocument();
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
    it('should handle batch update partial failures', async () => {
        mockElectronAPI.getInstalledMods.mockResolvedValue([
            { id: '1', name: 'Mod1', hasUpdate: true, version: '1.0' },
            { id: '2', name: 'Mod2', hasUpdate: true, version: '1.0' }
        ]);
        mockElectronAPI.updateMod.mockImplementation(async (id: string) => id === '1');
        renderMods();
        await waitFor(() => expect(screen.getByText('Update All')).toBeInTheDocument());
        fireEvent.click(screen.getByText('Update All'));
        fireEvent.click(await screen.findByRole('button', { name: /Atualizar selecionados/ }));
        await screen.findByText('Resultado do lote');
        await waitFor(() => {
            expect(mockElectronAPI.updateMod).toHaveBeenLastCalledWith('2');
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
    it('should handle batch update exception', async () => {
        mockElectronAPI.getInstalledMods.mockResolvedValue([
            { id: '1', name: 'Mod1', hasUpdate: true }
        ]);
        mockElectronAPI.updateMod.mockRejectedValue(new Error('Batch fail'));
        renderMods();
        await waitFor(() => expect(screen.getByText('Update All')).toBeInTheDocument());
        fireEvent.click(screen.getByText('Update All'));
        fireEvent.click(await screen.findByRole('button', { name: /Atualizar selecionados/ }));
        await screen.findByText('Resultado do lote');
        await waitFor(() => {
            expect(mockElectronAPI.updateMod).toHaveBeenCalled();
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
    it('should handle infinite scroll intersection', async () => {
        mockElectronAPI.fetchCategories.mockResolvedValue([]);
        mockElectronAPI.searchBySection.mockResolvedValueOnce(Array(20).fill({ id: 'm', name: 'M' }));
        mockElectronAPI.searchBySection.mockResolvedValueOnce(Array(5).fill({ id: 'm2', name: 'M2' }));
        renderMods();
        fireEvent.click(screen.getByText('Browse Online'));
        await waitFor(() => {
            expect(mockElectronAPI.searchBySection).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
        });
        const callback = (window.IntersectionObserver as any).callback;
        act(() => {
            callback([{ isIntersecting: true }]);
        });
        await waitFor(() => {
            expect(mockElectronAPI.searchBySection).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
        });
    });
});
