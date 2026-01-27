import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('minimize-window'),
  maximize: () => ipcRenderer.send('maximize-window'),
  close: () => ipcRenderer.send('close-window'),

  // Mod Management
  getInstalledMods: () => ipcRenderer.invoke('get-installed-mods'),
  installMod: (filePath: string) => ipcRenderer.invoke('install-mod', filePath),
  uninstallMod: (modId: string) => ipcRenderer.invoke('uninstall-mod', modId),
  toggleMod: (modId: string, isEnabled: boolean) => ipcRenderer.invoke('toggle-mod', modId, isEnabled),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  selectGameDirectory: () => ipcRenderer.invoke('select-game-directory'),
  selectModDirectory: () => ipcRenderer.invoke('select-mod-directory'),
  selectBackgroundImage: () => ipcRenderer.invoke('select-background-image'),
  openModsDirectory: () => ipcRenderer.invoke('open-mods-directory'),

  // Updates
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  cancelDownload: (id: string) => ipcRenderer.invoke('cancel-download', id),
  openDownloadFolder: (id: string) => ipcRenderer.invoke('open-download-folder', id),
  clearCompletedDownloads: () => ipcRenderer.invoke('clear-completed-downloads'),
  onDownloadUpdate: (callback: (downloads: any[]) => void) => {
    const subscription = (_event: any, value: any) => callback(value);
    ipcRenderer.on('downloads-update', subscription);
    return () => ipcRenderer.removeListener('downloads-update', subscription);
  },
  updateMod: (modId: string) => ipcRenderer.invoke('update-mod', modId),

  // Online Mods
  searchOnlineMods: (page: number, search?: string) => ipcRenderer.invoke('search-online-mods', page, search),
  searchBySection: (options: any) => ipcRenderer.invoke('search-by-section', options),
  fetchCategories: (gameId?: number) => ipcRenderer.invoke('fetch-categories', gameId),
  fetchNewMods: (page?: number) => ipcRenderer.invoke('fetch-new-mods', page),
  getModDetails: (gameBananaId: number) => ipcRenderer.invoke('get-mod-details', gameBananaId),
  getAllOnlineMods: (forceRefresh?: boolean) => ipcRenderer.invoke('get-all-online-mods', forceRefresh),
  fetchFeaturedMods: () => ipcRenderer.invoke('fetch-featured-mods'),

  // Profiles
  getProfiles: () => ipcRenderer.invoke('get-profiles'),
  createProfile: (name: string) => ipcRenderer.invoke('create-profile', name),
  deleteProfile: (id: string) => ipcRenderer.invoke('delete-profile', id),
  loadProfile: (id: string) => ipcRenderer.invoke('load-profile', id),

  installOnlineMod: (mod: any) => ipcRenderer.invoke('install-online-mod', mod),

  // Additional helpers
  launchGame: () => ipcRenderer.invoke('launch-game'),
  installUE4SS: () => ipcRenderer.invoke('install-ue4ss'),
  setModPriority: (modId: string, direction: 'up' | 'down') => ipcRenderer.invoke('set-mod-priority', modId, direction),
  getModChangelog: (modId: string) => ipcRenderer.invoke('get-mod-changelog', modId),
  getDownloads: () => ipcRenderer.invoke('get-downloads'),
  pauseDownload: (id: string) => ipcRenderer.invoke('pause-download', id),
  resumeDownload: (id: string) => ipcRenderer.invoke('resume-download', id),
  onDownloadScanFinished: (callback: () => void) => {
    const subscription = () => callback();
    ipcRenderer.on('download-scan-finished', subscription);
    return () => ipcRenderer.removeListener('download-scan-finished', subscription);
  },
});
