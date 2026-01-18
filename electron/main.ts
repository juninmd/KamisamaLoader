import { app, BrowserWindow, ipcMain, net, shell } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { createWriteStream, existsSync } from 'fs';
import AdmZip from 'adm-zip';
import { searchOnlineMods, fetchModProfile } from './gamebanana.js';

let mainWindow: BrowserWindow | null;

// Ensure Mods directory exists
const MODS_DIR = path.join(path.dirname(app.getPath('exe')), 'Mods');

async function ensureModsDir() {
  try {
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

async function getModsDirPath() {
    let targetDir = MODS_DIR;
    if (!app.isPackaged) {
      targetDir = path.join(__dirname, '../../Mods');
    }
    return targetDir;
}

async function getModsFilePath() {
    const dir = await getModsDirPath();
    return path.join(dir, 'mods.json');
}

// Helper: Download File
const downloadFile = (url: string, destPath: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const request = net.request(url);
        request.on('response', (response) => {
            if (response.statusCode !== 200 && response.statusCode !== 302) {
                 reject(new Error(`Download failed with status code: ${response.statusCode}`));
                 return;
            }

            // Handle redirect if needed (GameBanana often redirects)
            if (response.statusCode === 302 && response.headers['location']) {
                 const redirectUrl = Array.isArray(response.headers['location']) ? response.headers['location'][0] : response.headers['location'];
                 downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
                 return;
            }

            const fileStream = createWriteStream(destPath);
            response.on('data', (chunk) => fileStream.write(chunk));
            response.on('end', () => {
                fileStream.end();
                resolve();
            });
            response.on('error', (err) => {
                fileStream.close();
                fs.unlink(destPath).catch(() => {});
                reject(err);
            });
        });
        request.on('error', reject);
        request.end();
    });
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#00000000',
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // IPC Handlers
  ipcMain.on('minimize-window', () => mainWindow?.minimize());
  ipcMain.on('maximize-window', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.on('close-window', () => mainWindow?.close());

  // Mod Management IPC Handlers
  ipcMain.handle('get-installed-mods', async () => {
    try {
      const modsFile = await getModsFilePath();
      const data = await fs.readFile(modsFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  });

  ipcMain.handle('install-mod', async (_event, filePath) => {
    try {
        const modsDir = await getModsDirPath();
        const fileName = path.basename(filePath);
        const modName = path.parse(fileName).name; // Simple name extraction
        const modDestDir = path.join(modsDir, modName);

        // Check if zip
        if (filePath.endsWith('.zip')) {
            const zip = new AdmZip(filePath);
            zip.extractAllTo(modDestDir, true);
        } else {
            // Copy file directly (e.g. .pak)
            await fs.mkdir(modDestDir, { recursive: true });
            await fs.copyFile(filePath, path.join(modDestDir, fileName));
        }

        // Update mods.json
        const modsFile = await getModsFilePath();
        let mods = [];
        try { mods = JSON.parse(await fs.readFile(modsFile, 'utf-8')); } catch {}

        // Check if exists
        const existingIdx = mods.findIndex((m: any) => m.name === modName);
        const newMod = {
            id: existingIdx !== -1 ? mods[existingIdx].id : Date.now().toString(),
            name: modName,
            author: 'Local',
            version: '1.0',
            description: 'Locally installed mod',
            isEnabled: true,
            folderPath: modDestDir
        };

        if (existingIdx !== -1) mods[existingIdx] = { ...mods[existingIdx], ...newMod };
        else mods.push(newMod);

        await fs.writeFile(modsFile, JSON.stringify(mods, null, 2));
        return { success: true, message: 'Mod installed successfully' };
    } catch (e) {
        console.error(e);
        return { success: false, message: `Installation failed: ${(e as Error).message}` };
    }
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

  // Check for Updates
  ipcMain.handle('check-for-updates', async () => {
      const modsFile = await getModsFilePath();
      let mods = [];
      try { mods = JSON.parse(await fs.readFile(modsFile, 'utf-8')); } catch { return []; }

      const updates: string[] = [];

      // Process strictly sequentially or with limited concurrency to prevent "freezing" network
      for (const mod of mods) {
          if (!mod.gameBananaId) continue;

          try {
              // Fetch Profile
              const data = await fetchModProfile(mod.gameBananaId);
              if (data) {
                  const latestFile = data._aFiles?.[0]; // Usually the first one is main/latest
                  if (latestFile) {
                      // Check version or ID
                      const isNewer = (mod.latestFileId && latestFile._idRow > mod.latestFileId) ||
                                      (!mod.latestFileId && data._sVersion !== mod.version);

                      if (isNewer) {
                          mod.hasUpdate = true;
                          mod.latestVersion = data._sVersion;
                          mod.latestFileId = latestFile._idRow;
                          mod.latestFileUrl = latestFile._sDownloadUrl;
                          updates.push(mod.id);
                      } else {
                          mod.hasUpdate = false;
                      }
                  }
              }
          } catch (e) { console.error(e); }
      }

      await fs.writeFile(modsFile, JSON.stringify(mods, null, 2));
      return updates;
  });

  // Update Mod
  ipcMain.handle('update-mod', async (_event, modId) => {
      try {
          const modsFile = await getModsFilePath();
          let mods = [];
          try { mods = JSON.parse(await fs.readFile(modsFile, 'utf-8')); } catch { return false; }

          const mod = mods.find((m: any) => m.id === modId);
          if (!mod || !mod.latestFileUrl) return false;

          const tempDir = app.getPath('temp');
          const tempFile = path.join(tempDir, `update_${mod.id}.zip`);

          // Download
          await downloadFile(mod.latestFileUrl, tempFile);

          // Install (Overwrite)
          const modsDir = await getModsDirPath();
          const modDestDir = mod.folderPath || path.join(modsDir, mod.name);

          // Ensure dir exists
          await fs.mkdir(modDestDir, { recursive: true });

          // Extract
          try {
            const zip = new AdmZip(tempFile);
            zip.extractAllTo(modDestDir, true);
          } catch (e) {
             console.error('Extraction failed', e);
             await fs.unlink(tempFile);
             return false;
          }

          // Cleanup
          await fs.unlink(tempFile);

          // Update Info
          mod.version = mod.latestVersion;
          mod.hasUpdate = false;
          mod.latestFileId = mod.latestFileId; // Keep this for next check

          await fs.writeFile(modsFile, JSON.stringify(mods, null, 2));
          return true;

      } catch (e) {
          console.error('Update failed', e);
          return false;
      }
  });

  // Online Mods
  ipcMain.handle('search-online-mods', async (_event, page = 1, search = '') => {
      return await searchOnlineMods(page);
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
