// @vitest-environment happy-dom
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Mods from '../../src/pages/Mods';
import { ToastProvider } from '../../src/components/ToastContext';
import { MockSettingsProvider } from './test-utils';
import ModDetailsModal from '../../src/components/ModDetailsModal';
import CategorySidebar from '../../src/components/CategorySidebar';
const mockElectronAPI = {
    getInstalledMods: vi.fn(),
    fetchCategories: vi.fn(),
    searchBySection: vi.fn(),
    checkForUpdates: vi.fn(),
    updateAllMods: vi.fn(),
    updateMod: vi.fn(),
    toggleMod: vi.fn(),
    installOnlineMod: vi.fn(),
    installMod: vi.fn(),
    uninstallMod: vi.fn(),
    setModPriority: vi.fn(),
    getModChangelog: vi.fn(),
    getModDetails: vi.fn(),
    onDownloadScanFinished: vi.fn(() => vi.fn()),
    removeListener: vi.fn(),
    getDownloads: vi.fn(),
    onDownloadProgress: vi.fn(() => vi.fn()),
    onDownloadUpdate: vi.fn(() => vi.fn())
};
Object.defineProperty(window, 'electronAPI', { value: mockElectronAPI });
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();
window.IntersectionObserver = class {
    constructor(callback: any) {
        (window as any).__intersectionCallback = callback;
    }
    observe = mockObserve;
    disconnect = mockDisconnect;
    unobserve = vi.fn();
} as any;
describe('Frontend Sweep', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockElectronAPI.getModChangelog.mockResolvedValue([]);
        mockElectronAPI.getModDetails.mockResolvedValue({});
        mockElectronAPI.getDownloads.mockResolvedValue([]);
    });
    it('Mods - should handle Drag and Drop events', async () => {
        mockElectronAPI.getInstalledMods.mockResolvedValue([]);
        mockElectronAPI.fetchCategories.mockResolvedValue([]);
        render(<MockSettingsProvider>
                <ToastProvider>
                    <Mods />
                </ToastProvider>
            </MockSettingsProvider>);
        const container = screen.getByRole('navigation', { name: 'Biblioteca de mods' }).parentElement;
        fireEvent.dragEnter(container!, {
            dataTransfer: { items: ['file'] }
        });
        expect(screen.getByText('Drop to Install')).toBeInTheDocument();
        fireEvent.dragLeave(container!);
        expect(screen.queryByText('Drop to Install')).not.toBeInTheDocument();
        const file = new File(['content'], 'mod.zip', { type: 'application/zip' });
        mockElectronAPI.installMod.mockResolvedValue({ success: true });
        fireEvent.dragEnter(container!, { dataTransfer: { items: ['file'] } });
        await act(async () => {
            fireEvent.drop(container!, {
                dataTransfer: { files: [file] }
            });
        });
        expect(mockElectronAPI.installMod).toHaveBeenCalled();
        expect(screen.queryByText('Drop to Install')).not.toBeInTheDocument();
    });
    it('Mods - should handle Deep Link event', async () => {
        mockElectronAPI.getInstalledMods.mockResolvedValue([]);
        let linkCallback: any;
        mockElectronAPI.onDownloadScanFinished.mockImplementation((cb: any) => {
            linkCallback = cb;
            return vi.fn();
        });
        render(<MockSettingsProvider>
                <ToastProvider>
                    <Mods />
                </ToastProvider>
            </MockSettingsProvider>);
        await act(async () => {
            if (linkCallback)
                linkCallback();
        });
        expect(mockElectronAPI.getInstalledMods).toHaveBeenCalledTimes(2);
    });
    it('Mods - should filter local mods (Enabled/Disabled/Updates)', async () => {
        const mods = [
            { id: '1', name: 'Enabled Mod', author: 'A', isEnabled: true, hasUpdate: false, fileSize: 100 },
            { id: '2', name: 'Disabled Mod', author: 'B', isEnabled: false, hasUpdate: false, fileSize: 100 },
            { id: '3', name: 'Update Mod', author: 'C', isEnabled: true, hasUpdate: true, fileSize: 100 }
        ];
        mockElectronAPI.getInstalledMods.mockResolvedValue(mods);
        render(<MockSettingsProvider>
                <ToastProvider>
                    <Mods />
                </ToastProvider>
            </MockSettingsProvider>);
        await waitFor(() => expect(screen.getByText('Enabled Mod')).toBeInTheDocument());
        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'enabled' } });
        expect(screen.queryByText('Disabled Mod')).not.toBeInTheDocument();
        expect(screen.getByText('Enabled Mod')).toBeInTheDocument();
        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'disabled' } });
        expect(screen.queryByText('Enabled Mod')).not.toBeInTheDocument();
        expect(screen.getByText('Disabled Mod')).toBeInTheDocument();
        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'updates' } });
        expect(screen.queryByText('Disabled Mod')).not.toBeInTheDocument();
        expect(screen.getByText('Update Mod')).toBeInTheDocument();
    });
    it('CategorySidebar - should handle empty or invalid props gracefully', () => {
        const { rerender } = render(<CategorySidebar categories={undefined as any} selectedCategories={[]} onCategorySelect={vi.fn()}/>);
        expect(screen.getByText('Categories')).toBeInTheDocument();
        rerender(<CategorySidebar categories={[]} selectedCategories={[]} onCategorySelect={vi.fn()}/>);
        expect(screen.getByText('All Categories')).toBeInTheDocument();
    });
    it('ModDetailsModal - should handle image loading error fallback', () => {
        const mod = { id: '1', name: 'Test', gameBananaId: 123, iconUrl: 'fallback.jpg' };
        render(<ModDetailsModal mod={mod as any} isOpen={true} onClose={vi.fn()} onInstall={vi.fn()}/>);
        const img = screen.getAllByRole('img')[0];
        fireEvent.error(img);
        expect(img).toHaveAttribute('src', 'fallback.jpg');
        fireEvent.error(img);
        expect(img).not.toBeVisible();
    });
    it('ModDetailsModal - should handle fetchModDetails failure', async () => {
        const mod = { id: '1', name: 'Test', gameBananaId: 123 };
        mockElectronAPI.getInstalledMods.mockResolvedValue([]);
        (mockElectronAPI as any).getModDetails = vi.fn().mockRejectedValue(new Error('API Fail'));
        render(<ModDetailsModal mod={mod as any} isOpen={true} onClose={vi.fn()} onInstall={vi.fn()}/>);
        await waitFor(() => expect(screen.getByText('Test')).toBeInTheDocument());
        expect((mockElectronAPI as any).getModDetails).toHaveBeenCalledWith(123);
    });
});
