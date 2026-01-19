/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    getInstalledMods: () => Promise<any[]>;
    installMod: (filePath: string) => Promise<{ success: boolean; message: string }>;
    toggleMod: (modId: string, isEnabled: boolean) => Promise<{ success: boolean; conflict?: string }>;
    getSettings: () => Promise<{ gamePath: string; backgroundImage?: string }>;
    saveSettings: (settings: any) => Promise<boolean>;
    selectGameDirectory: () => Promise<string | null>;
    searchOnlineMods: (page: number, search?: string) => Promise<any[]>;
    checkForUpdates: () => Promise<string[]>; // Returns list of updated mod IDs
    updateMod: (modId: string) => Promise<boolean>;
    installOnlineMod: (mod: any) => Promise<{ success: boolean; message: string }>;
    launchGame: () => Promise<boolean>;
    setModPriority: (modId: string, direction: 'up' | 'down') => Promise<boolean>;
    getModChangelog: (modId: string) => Promise<{ version: string; date: number; changes: { cat: string; text: string }[]; title?: string } | null>;
    getDownloads(): Promise<any[]>;
    pauseDownload(id: string): Promise<void>;
    resumeDownload(id: string): Promise<void>;
    cancelDownload(id: string): Promise<void>;
    onDownloadUpdate(callback: (downloads: any[]) => void): void;
    onDownloadScanFinished(callback: () => void): void;

    // Profiles
    getProfiles: () => Promise<any[]>;
    createProfile: (name: string) => Promise<{ success: boolean; profile?: any; message?: string }>;
    deleteProfile: (id: string) => Promise<boolean>;
    loadProfile: (id: string) => Promise<{ success: boolean; message?: string }>;
  }
}
