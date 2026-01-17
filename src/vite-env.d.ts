/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    getInstalledMods: () => Promise<any[]>;
    installMod: (filePath: string) => Promise<{ success: boolean; message: string }>;
    toggleMod: (modId: string, isEnabled: boolean) => Promise<boolean>;
    saveSettings: (settings: any) => Promise<boolean>;
    searchOnlineMods: (page: number, search?: string) => Promise<any[]>;
  }
}
