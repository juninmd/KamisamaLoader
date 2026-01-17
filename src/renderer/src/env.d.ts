export interface IElectronAPI {
  loadPreferences: () => Promise<void>
}

export interface IAPI {
  scanMods: () => Promise<any[]>
  installMod: (filePath: string) => Promise<boolean>
  toggleMod: (modId: string, enabled: boolean) => Promise<boolean>
  getSettings: () => Promise<any>
  saveSettings: (settings: any) => Promise<void>
  selectFile: () => Promise<string | null>
}

declare global {
  interface Window {
    electron: IElectronAPI
    api: IAPI
  }
}
