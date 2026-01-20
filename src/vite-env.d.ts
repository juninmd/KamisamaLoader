/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;

    // Mod Management
    getInstalledMods: () => Promise<any[]>;
    installMod: (filePath: string) => Promise<{ success: boolean; message: string }>;
    toggleMod: (modId: string, isEnabled: boolean) => Promise<{ success: boolean; conflict?: string }>;
    getSettings: () => Promise<{ gamePath: string; backgroundImage?: string }>;
    saveSettings: (settings: any) => Promise<boolean>;
    selectGameDirectory: () => Promise<string | null>;
    setModPriority: (modId: string, direction: 'up' | 'down') => Promise<boolean>;

    // Updates
    checkForUpdates: () => Promise<string[]>;
    updateMod: (modId: string) => Promise<boolean>;
    getModChangelog: (modId: string) => Promise<{ version: string; date: number; changes: { cat: string; text: string }[]; title?: string } | null>;

    // Online Mods & Search
    searchOnlineMods: (page: number, search?: string) => Promise<any[]>;
    searchBySection: (options: any) => Promise<any[]>;
    fetchCategories: (gameId?: number) => Promise<any[]>;
    fetchNewMods: (page?: number) => Promise<any[]>;
    fetchFeaturedMods: () => Promise<any[]>;
    getModDetails: (gameBananaId: number) => Promise<any>;
    installOnlineMod: (mod: any) => Promise<{ success: boolean; message: string; downloadId?: string }>;

    // Profiles
    getProfiles: () => Promise<any[]>;
    createProfile: (name: string) => Promise<{ success: boolean; profile?: any; message?: string }>;
    deleteProfile: (id: string) => Promise<boolean>;
    loadProfile: (id: string) => Promise<{ success: boolean; message?: string }>;

    // Downloads
    getDownloads: () => Promise<any[]>;
    pauseDownload: (id: string) => Promise<void>;
    resumeDownload: (id: string) => Promise<void>;
    cancelDownload: (id: string) => Promise<void>;
    onDownloadUpdate: (callback: (downloads: any[]) => void) => void;
    onDownloadScanFinished: (callback: () => void) => void;

    // Game
    launchGame: () => Promise<boolean>;
  }
}
