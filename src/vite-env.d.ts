/// <reference types="vite/client" />
import { LocalMod, OnlineMod, Profile, Settings, Download, SearchOptions, ModChangelog } from '../shared/types';

declare global {
  interface Window {
    electronAPI: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;

      // Mod Management
      getInstalledMods: () => Promise<LocalMod[]>;
      installMod: (filePath: string) => Promise<{ success: boolean; message?: string }>;
      uninstallMod: (modId: string) => Promise<{ success: boolean; message?: string }>;
      toggleMod: (modId: string, isEnabled: boolean) => Promise<{ success: boolean; conflict?: string }>;
      getSettings: () => Promise<Settings>;
      saveSettings: (settings: Settings) => Promise<boolean>;
      selectGameDirectory: () => Promise<string | null>;
      selectModDirectory: () => Promise<string | null>;
      selectBackgroundImage: () => Promise<string | null>;
      openModsDirectory: () => Promise<boolean>;
      setModPriority: (modId: string, direction: 'up' | 'down') => Promise<boolean>;

      // Updates
      checkForUpdates: () => Promise<string[]>;
      updateMod: (modId: string) => Promise<boolean>;
      updateAllMods: (modIds: string[]) => Promise<{ successCount: number; failCount: number; results: { id: string; success: boolean }[] }>;
      getModChangelog: (modId: string) => Promise<ModChangelog | null>;

      // Online Mods & Search
      searchOnlineMods: (page: number, search?: string) => Promise<OnlineMod[]>;
      searchBySection: (options: SearchOptions) => Promise<OnlineMod[]>;
      fetchCategories: (gameId?: number) => Promise<any[]>;
      fetchNewMods: (page?: number) => Promise<OnlineMod[]>;
      getAllOnlineMods: (forceRefresh?: boolean) => Promise<OnlineMod[]>;
      fetchFeaturedMods: () => Promise<OnlineMod[]>;
      getModDetails: (gameBananaId: number) => Promise<any>;
      installOnlineMod: (mod: OnlineMod) => Promise<{ success: boolean; message: string; downloadId?: string }>;

      // Profiles
      getProfiles: () => Promise<Profile[]>;
      createProfile: (name: string) => Promise<{ success: boolean; profile?: Profile; message?: string }>;
      deleteProfile: (id: string) => Promise<boolean>;
      loadProfile: (id: string) => Promise<{ success: boolean; message?: string }>;

      // Downloads
      getDownloads: () => Promise<Download[]>;
      pauseDownload: (id: string) => Promise<void>;
      resumeDownload: (id: string) => Promise<void>;
      cancelDownload: (id: string) => Promise<void>;
      openDownloadFolder: (id: string) => Promise<void>;
      clearCompletedDownloads: () => Promise<void>;
      onDownloadUpdate: (callback: (downloads: Download[]) => void) => () => void;
      onDownloadScanFinished: (callback: () => void) => () => void;

      // Game
      launchGame: () => Promise<boolean>;
      installUE4SS: () => Promise<{ success: boolean; message: string }>;
    }
  }
}
