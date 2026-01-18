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
  updateMod: (modId: string) => ipcRenderer.invoke('update-mod', modId),

  // Online Mods
  searchOnlineMods: (page: number, search?: string) => ipcRenderer.invoke('search-online-mods', page, search),
  installOnlineMod: (mod: any) => ipcRenderer.invoke('install-online-mod', mod),
});
