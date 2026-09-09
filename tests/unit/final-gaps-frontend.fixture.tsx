import { vi } from 'vitest';
const mockElectronAPI = {
    getInstalledMods: vi.fn(),
    fetchCategories: vi.fn(),
    searchBySection: vi.fn(),
    checkForUpdates: vi.fn(),
    updateAllMods: vi.fn(),
    updateMod: vi.fn(),
    installOnlineMod: vi.fn(),
    uninstallMod: vi.fn(),
    toggleMod: vi.fn(),
    setModPriority: vi.fn(),
    installMod: vi.fn(),
    onDownloadScanFinished: vi.fn(),
    getModChangelog: vi.fn(),
    getProfiles: vi.fn(),
    getSettings: vi.fn(),
    saveSettings: vi.fn(),
    createProfile: vi.fn(),
    deleteProfile: vi.fn(),
    loadProfile: vi.fn(),
    getModDetails: vi.fn(),
    fetchFeaturedMods: vi.fn(),
    fetchNewMods: vi.fn(),
    launchGame: vi.fn()
};
Object.defineProperty(window, 'electronAPI', {
    value: mockElectronAPI,
    writable: true
});
const MockIntersectionObserver = vi.fn(function () {
    this.observe = vi.fn();
    this.unobserve = vi.fn();
    this.disconnect = vi.fn();
});
window.IntersectionObserver = MockIntersectionObserver as any;
window.confirm = vi.fn(() => true) as any;
export { mockElectronAPI, MockIntersectionObserver };
