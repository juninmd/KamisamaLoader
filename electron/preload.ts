import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('minimize-window'),
  maximize: () => ipcRenderer.send('maximize-window'),
  close: () => ipcRenderer.send('close-window'),

  // Mod Management
  getInstalledMods: () => ipcRenderer.invoke('get-installed-mods'),
  installMod: (filePath: string) => ipcRenderer.invoke('install-mod', filePath),
  toggleMod: (modId: string, isEnabled: boolean) => ipcRenderer.invoke('toggle-mod', modId, isEnabled),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
});
