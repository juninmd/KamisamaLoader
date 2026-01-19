import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('minimize-window'),
  maximize: () => ipcRenderer.send('maximize-window'),
  close: () => ipcRenderer.send('close-window'),

  // Mod Management
  getInstalledMods: () => ipcRenderer.invoke('get-installed-mods'),
  installMod: (filePath: string) => ipcRenderer.invoke('install-mod', filePath),
  toggleMod: (modId: string, isEnabled: boolean) => ipcRenderer.invoke('toggle-mod', modId, isEnabled),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  selectGameDirectory: () => ipcRenderer.invoke('select-game-directory'),

  // Updates
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  cancelDownload: (id: string) => ipcRenderer.invoke('cancel-download', id),
  onDownloadUpdate: (callback: (downloads: any[]) => void) => {
    // Clean up previous listeners to avoid duplicates if necessary, or just add
    ipcRenderer.removeAllListeners('downloads-update');
    ipcRenderer.on('downloads-update', (_event, value) => callback(value));
  },
  updateMod: (modId: string) => ipcRenderer.invoke('update-mod', modId),

  // Online Mods
  searchOnlineMods: (page: number, search?: string) => ipcRenderer.invoke('search-online-mods', page, search),
  // Profiles
  getProfiles: () => ipcRenderer.invoke('get-profiles'),
  createProfile: (name: string) => ipcRenderer.invoke('create-profile', name),
  deleteProfile: (id: string) => ipcRenderer.invoke('delete-profile', id),
  loadProfile: (id: string) => ipcRenderer.invoke('load-profile', id),

  installOnlineMod: (mod: any) => ipcRenderer.invoke('install-online-mod', mod),
});
