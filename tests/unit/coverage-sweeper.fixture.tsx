import { vi } from 'vitest';
const electronAPI = {
    getSettings: vi.fn().mockResolvedValue({}),
    getInstalledMods: vi.fn().mockResolvedValue([]),
    fetchCategories: vi.fn().mockResolvedValue([]),
    searchBySection: vi.fn().mockResolvedValue([]),
    onDownloadScanFinished: vi.fn().mockReturnValue(() => { }),
    installMod: vi.fn(),
    updateAllMods: vi.fn().mockResolvedValue({ results: [], failCount: 0 }),
    checkForUpdates: vi.fn().mockResolvedValue([]),
    setModPriority: vi.fn(),
    toggleMod: vi.fn(),
    installOnlineMod: vi.fn(),
    uninstallMod: vi.fn(),
    updateMod: vi.fn(),
    getModChangelog: vi.fn().mockResolvedValue([]),
    getModDetails: vi.fn().mockResolvedValue(null),
    getProfiles: vi.fn().mockResolvedValue([]),
    createProfile: vi.fn(),
    deleteProfile: vi.fn(),
    loadProfile: vi.fn(),
    getDownloads: vi.fn().mockResolvedValue([]),
    onDownloadProgress: vi.fn().mockReturnValue(() => { }),
    onDownloadUpdate: vi.fn().mockReturnValue(() => { })
};
(window as any).electronAPI = electronAPI;
const originalConfirm = window.confirm;
export { electronAPI, originalConfirm };
