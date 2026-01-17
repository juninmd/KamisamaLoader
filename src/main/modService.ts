import { IpcMain, app, dialog } from 'electron'
import { promises as fs } from 'fs'
import * as path from 'path'

// Types
interface Mod {
  id: string
  name: string
  fileName: string
  isEnabled: boolean
  priority: number
  path: string
}

interface Settings {
  gamePath: string
  backgroundImage?: string
}

let settings: Settings = {
  gamePath: '',
  backgroundImage: 'https://images4.alphacoders.com/134/1341409.png'
}

const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json')
const MODS_DIR_NAME = '~mods'
const LOGIC_MODS_DIR_NAME = 'LogicMods'

async function ensureDirs(gamePath: string) {
  const paksDir = path.join(gamePath, 'SparkingZERO', 'Content', 'Paks')
  const modsDir = path.join(paksDir, MODS_DIR_NAME)
  const logicModsDir = path.join(paksDir, LOGIC_MODS_DIR_NAME)

  try {
    await fs.access(modsDir)
  } catch {
    await fs.mkdir(modsDir, { recursive: true })
  }
  return { modsDir, logicModsDir }
}

async function loadSettings() {
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8')
    const loaded = JSON.parse(data)
    settings = { ...settings, ...loaded }
  } catch {
    // ignore missing file
  }
}

async function saveSettings() {
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2))
}

export function registerModHandlers(ipcMain: IpcMain) {
  // Load settings on startup
  loadSettings()

  // Settings
  ipcMain.handle('get-settings', async () => {
    return settings
  })

  ipcMain.handle('save-settings', async (_, newSettings) => {
    settings = { ...settings, ...newSettings }
    await saveSettings()
  })

  ipcMain.handle('select-file', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Mods', extensions: ['pak'] }]
    })
    if (canceled) return null
    return filePaths[0]
  })

  // Scan Mods
  ipcMain.handle('scan-mods', async () => {
    if (!settings.gamePath) return []

    const { modsDir } = await ensureDirs(settings.gamePath)

    try {
      const files = await fs.readdir(modsDir)
      const mods: Mod[] = []

      for (const file of files) {
        const isPak = file.endsWith('.pak')
        const isDisabled = file.endsWith('.pak.disabled')

        if (isPak || isDisabled) {
          const name = file.replace('.pak.disabled', '').replace('.pak', '')

          mods.push({
            id: file,
            name: name,
            fileName: file,
            isEnabled: isPak,
            priority: 0, // Todo: parse priority from filename if needed
            path: path.join(modsDir, file)
          })
        }
      }
      return mods
    } catch (error) {
      console.error('Error scanning mods:', error)
      return []
    }
  })

  // Install Mod
  // Logic: Copy .pak file to ~mods.
  // DO NOT WIPE ~mods. Just add the file.
  ipcMain.handle('install-mod', async (_, filePath: string) => {
    if (!settings.gamePath) throw new Error('Game path not set')

    const { modsDir } = await ensureDirs(settings.gamePath)
    const fileName = path.basename(filePath)
    const dest = path.join(modsDir, fileName)

    try {
      await fs.copyFile(filePath, dest)
      return true
    } catch (err) {
      console.error('Install failed', err)
      return false
    }
  })

  // Toggle Mod (Enable/Disable)
  // For Unreal, usually disabling means moving it out of ~mods or renaming extension
  // We will rename to .pak.disabled
  ipcMain.handle('toggle-mod', async (_, modId: string, enabled: boolean) => {
     if (!settings.gamePath) throw new Error('Game path not set')
     const { modsDir } = await ensureDirs(settings.gamePath)

     // modId is currently filename
     const currentPath = path.join(modsDir, modId)

     if (enabled) {
         // It was disabled, so it should be .pak.disabled -> .pak
         if (modId.endsWith('.disabled')) {
             const newName = modId.replace('.disabled', '')
             await fs.rename(currentPath, path.join(modsDir, newName))
         }
     } else {
         // Disable it
         if (!modId.endsWith('.disabled')) {
             const newName = modId + '.disabled'
             await fs.rename(currentPath, path.join(modsDir, newName))
         }
     }
     return true
  })
}
