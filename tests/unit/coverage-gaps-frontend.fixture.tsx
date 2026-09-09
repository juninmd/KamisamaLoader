import { vi } from 'vitest';
const mockElectronAPI = {
    getInstalledMods: vi.fn(),
    searchBySection: vi.fn(),
    fetchCategories: vi.fn(),
    installMod: vi.fn(),
    installOnlineMod: vi.fn(),
    uninstallMod: vi.fn(),
    toggleMod: vi.fn(),
    setModPriority: vi.fn(),
    onDownloadScanFinished: vi.fn(),
    checkForUpdates: vi.fn(),
    updateMod: vi.fn(),
    updateAllMods: vi.fn(),
    getSettings: vi.fn(),
    saveSettings: vi.fn(),
    selectGameDirectory: vi.fn(),
    selectModDirectory: vi.fn(),
    selectBackgroundImage: vi.fn(),
    installUE4SS: vi.fn()
};
Object.defineProperty(window, 'electronAPI', {
    value: mockElectronAPI,
    writable: true
});
vi.mock('lucide-react', async (importOriginal) => ({
    ...await importOriginal<typeof import('lucide-react')>(),
    Search: () => <div data-testid="icon-search"/>,
    Download: () => <div data-testid="icon-download"/>,
    RefreshCw: () => <div data-testid="icon-refresh"/>,
    Wrench: () => <div data-testid="icon-wrench"/>,
    Globe: () => <div data-testid="icon-globe"/>,
    UploadCloud: () => <div data-testid="icon-upload"/>,
    ChevronDown: () => <div data-testid="icon-chevron"/>,
    Filter: () => <div data-testid="icon-filter"/>,
    MoreVertical: () => <div data-testid="icon-more"/>,
    Trash2: () => <div data-testid="icon-trash"/>,
    Play: () => <div data-testid="icon-play"/>,
    Pause: () => <div data-testid="icon-pause"/>,
    FolderOpen: () => <div data-testid="icon-folder"/>,
    X: () => <div data-testid="icon-close"/>,
    XCircle: () => <div data-testid="icon-x-circle"/>,
    Info: () => <div data-testid="icon-info"/>,
    CheckCircle: () => <div data-testid="icon-check-circle"/>,
    AlertCircle: () => <div data-testid="icon-alert-circle"/>,
    AlertTriangle: () => <div data-testid="icon-alert-triangle"/>,
    LogOut: () => <div data-testid="icon-logout"/>
}));
vi.mock('../../src/components/ProfileManager', () => ({
    default: () => <div data-testid="profile-manager"/>
}));
export { mockElectronAPI };
