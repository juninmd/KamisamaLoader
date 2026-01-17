import { app, BrowserWindow, ipcMain, net } from 'electron';
import path from 'path';
import fs from 'fs/promises';

let mainWindow: BrowserWindow | null;

// Ensure Mods directory exists
const MODS_DIR = path.join(path.dirname(app.getPath('exe')), 'Mods');
const MODS_JSON = path.join(MODS_DIR, 'mods.json');

async function ensureModsDir() {
  try {
    // Check if we are in dev (dev usually runs from node_modules or similar)
    // For dev, we might want to store in project root 'Mods'
    let targetDir = MODS_DIR;
    if (!app.isPackaged) {
      targetDir = path.join(__dirname, '../../Mods');
    }

    await fs.mkdir(targetDir, { recursive: true });
    return targetDir;
  } catch (error) {
    console.error('Failed to create Mods directory:', error);
    return null;
  }
}

async function getModsFilePath() {
    let targetDir = MODS_DIR;
    if (!app.isPackaged) {
      targetDir = path.join(__dirname, '../../Mods');
    }
    return path.join(targetDir, 'mods.json');
}


function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false, // Custom frame
    transparent: true, // For glass effect
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#00000000', // Transparent background
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // IPC Handlers
  ipcMain.on('minimize-window', () => {
    mainWindow?.minimize();
  });

  ipcMain.on('maximize-window', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.on('close-window', () => {
    mainWindow?.close();
  });

  // Mod Management IPC Handlers
  ipcMain.handle('get-installed-mods', async () => {
    try {
      const modsFile = await getModsFilePath();
      const data = await fs.readFile(modsFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // If file doesn't exist or error, return empty array
      return [];
    }
  });

  ipcMain.handle('install-mod', async (_event, filePath) => {
    // TODO: Implement zip extraction and logic placement
    console.log(`Installing mod from: ${filePath}`);
    // Simulate adding to list for now as we don't have zip logic yet,
    // but the user wants real data. We can't fabricate a mod install without a real file.
    // For now we just return success.
    return { success: true, message: 'Mod installation logic pending (requires zip handling).' };
  });

  ipcMain.handle('toggle-mod', async (_event, modId, isEnabled) => {
    try {
      const modsFile = await getModsFilePath();
      const data = await fs.readFile(modsFile, 'utf-8');
      const mods = JSON.parse(data);
      const modIndex = mods.findIndex((m: any) => m.id === modId);
      if (modIndex !== -1) {
        mods[modIndex].isEnabled = isEnabled;
        await fs.writeFile(modsFile, JSON.stringify(mods, null, 2));
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  });

  ipcMain.handle('save-settings', async (_event, settings) => {
    console.log('Saving settings:', settings);
    return true;
  });

  // Online Mods
  ipcMain.handle('search-online-mods', async (_event, page = 1, search = '') => {
    return new Promise((resolve, reject) => {
      // GameBanana API: Sparking Zero ID = 21179
      // If search is provided, we might need a different endpoint, but Subfeed is reliable for latest.
      // We will stick to Subfeed for now as "Search" endpoint is tricky to find documented.
      // If we find a search parameter for subfeed, we'll use it.

      const request = net.request(`https://gamebanana.com/apiv11/Game/21179/Subfeed?_nPage=${page}&_nPerpage=15`);

      request.on('response', (response) => {
        let body = '';
        response.on('data', (chunk) => {
          body += chunk.toString();
        });
        response.on('end', () => {
          try {
            const json = JSON.parse(body);
            if (json._aRecords) {
                const mods = json._aRecords.map((record: any) => {
                    const image = record._aPreviewMedia?._aImages?.[0];
                    const iconUrl = image ? `${image._sBaseUrl}/${image._sFile220}` : '';

                    return {
                        id: record._idRow.toString(),
                        name: record._sName,
                        author: record._aSubmitter?._sName || 'Unknown',
                        version: record._sVersion || '1.0',
                        description: `Category: ${record._aRootCategory?._sName || 'Misc'}`,
                        isEnabled: false, // Online mods aren't installed yet
                        iconUrl: iconUrl,
                        gameBananaId: record._idRow,
                        latestVersion: record._sVersion || '1.0'
                    };
                });
                resolve(mods);
            } else {
                resolve([]);
            }
          } catch (e) {
            console.error('Failed to parse GameBanana response', e);
            resolve([]);
          }
        });
      });

      request.on('error', (error) => {
         console.error('GameBanana request failed', error);
         resolve([]);
      });

      request.end();
    });
  });
}

app.whenReady().then(async () => {
    await ensureModsDir();
    createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
