/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    getInstalledMods: () => Promise<any[]>;
    installMod: (filePath: string) => Promise<{ success: boolean; message: string }>;
    toggleMod: (modId: string, isEnabled: boolean) => Promise<boolean>;
    getSettings: () => Promise<{ gamePath: string; backgroundImage?: string }>;
    saveSettings: (settings: any) => Promise<boolean>;
    selectGameDirectory: () => Promise<string | null>;
    searchOnlineMods: (page: number, search?: string) => Promise<any[]>;
    checkForUpdates: () => Promise<string[]>; // Returns list of updated mod IDs
    updateMod: (modId: string) => Promise<boolean>;
    installOnlineMod: (mod: any) => Promise<{ success: boolean; message: string }>;
    launchGame: () => Promise<boolean>;
  }
}
