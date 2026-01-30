import { vi, afterEach, expect } from 'vitest';
import '@testing-library/jest-dom'; // Side-effect import for auto-extend

// Conditional setup for DOM environment
if (typeof window !== 'undefined') {
  // Use dynamic import for cleanup to avoid import errors in non-DOM envs if any
  const { cleanup } = await import('@testing-library/react');

  // Cleanup React components after each test
  afterEach(() => {
    cleanup();
  });

  // Mock Electron API Bridge
  Object.defineProperty(window, 'electronAPI', {
    value: {
      getInstalledMods: vi.fn(),
      searchOnlineMods: vi.fn(),
      installOnlineMod: vi.fn(),
      toggleMod: vi.fn(),
      getSettings: vi.fn(),
      saveSettings: vi.fn(),
      selectGameDirectory: vi.fn(),
      selectModDirectory: vi.fn(),
      selectBackgroundImage: vi.fn(),
      installMod: vi.fn(),
      checkForUpdates: vi.fn(),
      updateMod: vi.fn(),
      fetchFeaturedMods: vi.fn(),
      fetchGameProfile: vi.fn(),
      checkAppUpdate: vi.fn(),
      installUE4SS: vi.fn(),
      launchGame: vi.fn(),
      openModsDirectory: vi.fn(),
      getModChangelog: vi.fn(),
      getModDetails: vi.fn(),
      setModPriority: vi.fn(),
      searchBySection: vi.fn(),
      fetchCategories: vi.fn(),
      fetchNewMods: vi.fn(),
      getAllOnlineMods: vi.fn(),
      uninstallMod: vi.fn(),

      // Download Manager
      getDownloads: vi.fn(),
      startDownload: vi.fn(),
      pauseDownload: vi.fn(),
      resumeDownload: vi.fn(),
      cancelDownload: vi.fn(),
      clearCompletedDownloads: vi.fn(),
      openDownloadFolder: vi.fn(),
      onDownloadUpdate: vi.fn(),
      onDownloadScanFinished: vi.fn(),

      // Utils
      minimize: vi.fn(),
      maximize: vi.fn(),
      close: vi.fn(),

      on: vi.fn(),
      off: vi.fn(),
      createProfile: vi.fn(),
      loadProfile: vi.fn(),
      deleteProfile: vi.fn(),
      getProfiles: vi.fn(),
    },
    writable: true,
  });
}
