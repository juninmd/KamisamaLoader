import { vi } from 'vitest';
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
    onDownloadScanFinished: vi.fn(),
    getSettings: vi.fn(),
    saveSettings: vi.fn(),
    selectGameDirectory: vi.fn(),
    selectModDirectory: vi.fn(),
    openModsDirectory: vi.fn(),
    getDownloads: vi.fn(),
    onDownloadProgress: vi.fn(),
    onDownloadUpdate: vi.fn(),
};
Object.defineProperty(window, 'electronAPI', {
    value: mockElectronAPI,
    writable: true
});
const observe = vi.fn();
const disconnect = vi.fn();
const unobserve = vi.fn();
window.IntersectionObserver = vi.fn(function (callback, options) {
    (window.IntersectionObserver as any).callback = callback;
    return {
        observe,
        disconnect,
        unobserve,
        takeRecords: () => []
    };
}) as any;
export { mockElectronAPI, observe, disconnect, unobserve };
