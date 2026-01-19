import { app, BrowserWindow, ipcMain, net, shell, dialog } from 'electron';
import path from 'path';
import { ModManager } from './mod-manager.js';
import { DownloadManager } from './download-manager';

let mainWindow: BrowserWindow | null;

// Ensure Mods directory exists
// In production: ./Mods (relative to executable)
// In test: ./Mods (relative to cwd/project root)
const MODS_DIR = process.env.NODE_ENV === 'test'
  ? path.join(process.cwd(), 'Mods')
  : path.join(path.dirname(app.getPath('exe')), 'Mods');

async function ensureModsDir() {
  try {
    let targetDir = MODS_DIR;
    if (!app.isPackaged && process.env.NODE_ENV !== 'test') {
      targetDir = path.join(__dirname, '../../Mods');
const downloadManager = new DownloadManager();
const modManager = new ModManager(downloadManager); // Pass dependency

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    // Handle Protocol on Windows
    const url = commandLine.find(arg => arg.startsWith('kamisama://'));
    if (url) handleProtocolUrl(url);
  });

async function getModsDirPath() {
    let targetDir = MODS_DIR;
    if (!app.isPackaged && process.env.NODE_ENV !== 'test') {
      targetDir = path.join(__dirname, '../../Mods');
  // Protocol Handler registration
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('kamisama', process.execPath, [path.resolve(process.argv[1])]);
    }
  } else {
    app.setAsDefaultProtocolClient('kamisama');
  }

  // Handle Startup URL (Windows)
  const startupsUrl = process.argv.find(arg => arg.startsWith('kamisama://'));
  if (startupsUrl) handleProtocolUrl(startupsUrl);

  app.whenReady().then(async () => {
    await modManager.ensureModsDir();
    createWindow();
  });
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
            response.on('error', (err: Error) => {
                fileStream.close();
                fs.unlink(destPath).catch(() => {});
                reject(err);
            });
}
function handleProtocolUrl(url: string) {
  console.log('Received Protocol URL:', url);
  try {
    const urlObj = new URL(url);
    if (urlObj.host === 'install') {
      const id = urlObj.searchParams.get('id');
      const gameBananaId = id ? parseInt(id) : 0;

      if (gameBananaId > 0) {
        console.log(`Deep link install triggered for ID: ${gameBananaId}`);
        // Create a basic Mod object, the rest will be fetched by installOnlineMod
        const modStub = {
          id: Date.now().toString(),
          name: 'Unknown',
          author: 'Unknown',
          version: '1.0',
          description: '',
          isEnabled: true,
          iconUrl: '',
          gameBananaId: gameBananaId,
          latestVersion: '1.0'
        };

        modManager.installOnlineMod(modStub as any).then((result) => {
          console.log('Deep link install result:', result);
          if (mainWindow) {
            // You might want to notify UI here via IPC if you have a toast system
            mainWindow.webContents.send('download-scan-finished'); // Hacky refresh?
          }
        });
      }
    }
  } catch (e) {
    console.error('Invalid protocol URL', e);
  }
}

function createWindow() {
  // Downloads IPC
  ipcMain.handle('get-downloads', () => downloadManager.getDownloads());
  ipcMain.handle('pause-download', (_, id) => downloadManager.pauseDownload(id));
  ipcMain.handle('resume-download', (_, id) => downloadManager.resumeDownload(id));
  ipcMain.handle('cancel-download', (_, id) => downloadManager.cancelDownload(id));

  // Existing IPC
  // Downloads IPC
  ipcMain.handle('get-downloads', () => downloadManager.getDownloads());
  ipcMain.handle('pause-download', (_, id) => downloadManager.pauseDownload(id));
  ipcMain.handle('resume-download', (_, id) => downloadManager.resumeDownload(id));
  ipcMain.handle('cancel-download', (_, id) => downloadManager.cancelDownload(id));

  // Mods IPC
  ipcMain.handle('get-installed-mods', () => modManager.getInstalledMods());
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false, // Custom frame
    backgroundColor: '#000000', // Start black to match dark theme
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hidden',
  });

  downloadManager.setWindow(mainWindow);

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
    return await modManager.getInstalledMods();
  });

  ipcMain.handle('install-mod', async (_event, filePath) => {
    return await modManager.installMod(filePath);
  });

  ipcMain.handle('toggle-mod', async (_event, modId, isEnabled) => {
    return await modManager.toggleMod(modId, isEnabled);
  });

  ipcMain.handle('get-settings', async () => {
    return await modManager.getSettings();
  });

  ipcMain.handle('save-settings', async (_event, settings) => {
    return await modManager.saveSettings(settings);
  });

  ipcMain.handle('select-game-directory', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Dragon Ball: Sparking! ZERO Game Directory'
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  ipcMain.handle('check-for-updates', async () => {
    return await modManager.checkForUpdates();
  });

  ipcMain.handle('update-mod', async (_event, modId) => {
    return await modManager.updateMod(modId);
  });

  ipcMain.handle('search-online-mods', async (_event, page = 1, search = '') => {
    return await modManager.searchOnlineMods(page, search);
  });

  ipcMain.handle('install-online-mod', async (_event, mod) => {
    return await modManager.installOnlineMod(mod);
  });

  ipcMain.handle('launch-game', async () => {
    return await modManager.launchGame();
  });

  ipcMain.handle('set-mod-priority', async (event, modId, direction) => {
    return await modManager.setModPriority(modId, direction);
  });

  ipcMain.handle('get-profiles', async () => modManager.getProfiles());
  ipcMain.handle('create-profile', async (_event, name) => modManager.createProfile(name));
  ipcMain.handle('delete-profile', async (_event, id) => modManager.deleteProfile(id));
  ipcMain.handle('load-profile', async (_event, id) => modManager.loadProfile(id));

  ipcMain.handle('get-mod-changelog', async (event, modId) => {
    return await modManager.getModChangelog(modId);
  });
}



app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('open-url', (event, url) => {
  event.preventDefault();
  handleProtocolUrl(url);
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
