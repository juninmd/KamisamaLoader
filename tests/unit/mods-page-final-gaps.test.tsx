// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor, act } from './test-utils';
import Mods from '../../src/pages/Mods';
const mockElectronAPI = {
    getInstalledMods: vi.fn(),
    searchBySection: vi.fn(),
    fetchCategories: vi.fn(),
    installMod: vi.fn(),
    installOnlineMod: vi.fn(),
    updateAllMods: vi.fn(),
    checkForUpdates: vi.fn(),
    onDownloadScanFinished: vi.fn(() => () => { }),
    getProfiles: vi.fn().mockResolvedValue([]),
    saveSettings: vi.fn().mockResolvedValue(true),
    getSettings: vi.fn().mockResolvedValue({}),
    getModChangelog: vi.fn(),
    toggleMod: vi.fn(),
    uninstallMod: vi.fn(),
    setModPriority: vi.fn(),
    updateMod: vi.fn(),
};
Object.defineProperty(window, 'electronAPI', {
    value: mockElectronAPI,
    writable: true
});
const observe = vi.fn();
const disconnect = vi.fn();
let observerCallback: any = null;
window.IntersectionObserver = vi.fn(function (cb) {
    observerCallback = cb;
    return {
        observe,
        disconnect,
        unobserve: vi.fn(),
        takeRecords: vi.fn()
    };
}) as any;
describe('Mods Page Final Gaps', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockElectronAPI.getInstalledMods.mockResolvedValue([]);
        mockElectronAPI.searchBySection.mockResolvedValue([]);
        mockElectronAPI.fetchCategories.mockResolvedValue([]);
    });
    it('should handle drag leave correctly', async () => {
        let container: HTMLElement;
        act(() => {
            container = renderWithProviders(<Mods />).container;
        });
        const dropZone = container.firstChild as HTMLElement;
        act(() => {
            fireEvent.dragEnter(dropZone, {
                dataTransfer: { items: [{ kind: 'file' }] }
            });
        });
        expect(screen.getByText('Drop to Install')).toBeInTheDocument();
        act(() => {
            fireEvent.dragLeave(dropZone);
        });
        expect(screen.queryByText('Drop to Install')).not.toBeInTheDocument();
        await waitFor(() => expect(mockElectronAPI.getInstalledMods).toHaveBeenCalled());
    });
    it('should trigger infinite scroll when intersection occurs', async () => {
        const page1 = Array.from({ length: 20 }, (_, i) => ({ id: `${i + 1}`, name: `Mod ${i + 1}` }));
        mockElectronAPI.searchBySection
            .mockResolvedValueOnce(page1)
            .mockResolvedValueOnce([{ id: '21', name: 'Mod 21' }]);
        act(() => {
            renderWithProviders(<Mods />);
        });
        fireEvent.click(screen.getByText('Browse Online'));
        await waitFor(() => expect(screen.getAllByText('Mod 1').length).toBeGreaterThan(0));
        await act(async () => {
            if (observerCallback) {
                observerCallback([{ isIntersecting: true }]);
            }
        });
        await waitFor(() => expect(screen.getByText('Mod 21')).toBeInTheDocument());
        expect(mockElectronAPI.searchBySection).toHaveBeenCalledWith(expect.objectContaining({
            page: 2
        }));
        await waitFor(() => expect(screen.queryByText('Browse Online')).toBeInTheDocument());
    });
    it('should handle partial success in update all', async () => {
        const installedMods = [
            { id: '1', name: 'Mod1', hasUpdate: true, fileSize: 100, author: 'A', version: '1.0' },
            { id: '2', name: 'Mod2', hasUpdate: true, fileSize: 100, author: 'B', version: '1.0' }
        ];
        mockElectronAPI.getInstalledMods.mockResolvedValue(installedMods);
        mockElectronAPI.updateMod.mockImplementation(async (id: string) => id === '1');
        act(() => {
            renderWithProviders(<Mods />);
        });
        await waitFor(() => expect(screen.getByText('Mod1')).toBeInTheDocument());
        const updateBtn = await screen.findByText('Update All');
        await act(async () => {
            fireEvent.click(updateBtn);
        });
        fireEvent.click(await screen.findByRole('button', { name: /Atualizar selecionados/ }));
        await screen.findByText('Resultado do lote');
        await waitFor(() => expect(mockElectronAPI.updateMod).toHaveBeenLastCalledWith('2'));
        expect(mockElectronAPI.updateMod).toHaveBeenLastCalledWith('2');
    });
});
