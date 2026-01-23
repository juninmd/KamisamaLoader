import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'path';
import { ModManager } from './mod-manager.js';
import { DownloadManager } from './download-manager.js';

let mainWindow: BrowserWindow | null;

const downloadManager = new DownloadManager();
const modManager = new ModManager(downloadManager); // Pass dependency

// Handle unhandled exceptions/rejections to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('CRITICAL: Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection:', reason);
});

function registerIpcHandlers() {
  // Downloads IPC
  ipcMain.handle('get-downloads', () => downloadManager.getDownloads());
  ipcMain.handle('pause-download', (_, id) => downloadManager.pauseDownload(id));
  ipcMain.handle('resume-download', (_, id) => downloadManager.resumeDownload(id));
  ipcMain.handle('cancel-download', (_, id) => downloadManager.cancelDownload(id));
  ipcMain.handle('open-download-folder', (_, id) => downloadManager.openDownloadFolder(id));
  ipcMain.handle('clear-completed-downloads', () => downloadManager.clearCompleted());

  // Window Controls
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

  ipcMain.handle('uninstall-mod', async (_event, modId) => {
    return await modManager.uninstallMod(modId);
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

  ipcMain.handle('select-mod-directory', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Mod Download Directory'
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

  ipcMain.handle('install-ue4ss', async () => {
    return await modManager.installUE4SS();
  });

  ipcMain.handle('set-mod-priority', async (event, modId, direction) => {
    return await modManager.setModPriority(modId, direction);
  });

  // Profiles
  ipcMain.handle('get-profiles', async () => modManager.getProfiles());
  ipcMain.handle('create-profile', async (_event, name) => modManager.createProfile(name));
  ipcMain.handle('delete-profile', async (_event, id) => modManager.deleteProfile(id));
  ipcMain.handle('load-profile', async (_event, id) => modManager.loadProfile(id));

  ipcMain.handle('get-mod-changelog', async (event, modId) => {
    return await modManager.getModChangelog(modId);
  });

  ipcMain.handle('get-mod-details', async (event, gameBananaId) => {
    return await modManager.getModDetails(gameBananaId);
  });

  // New API methods for categories and advanced search
  ipcMain.handle('search-by-section', async (_event, options) => {
    return await modManager.searchBySection(options);
  });

  ipcMain.handle('fetch-categories', async (_event, gameId) => {
    return await modManager.fetchCategories(gameId);
  });

  ipcMain.handle('fetch-new-mods', async (_event, page) => {
    return await modManager.fetchNewMods(page);
  });

  ipcMain.handle('fetch-featured-mods', async () => {
    return await modManager.fetchFeaturedMods();
  });

  ipcMain.handle('get-all-online-mods', async (_, forceRefresh) => {
    return await modManager.getAllOnlineMods(forceRefresh);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false, // Custom frame
    backgroundColor: '#000000', // Start black to match dark theme
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
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

  // Open DevTools for debugging (remove in final release if desired, but good for beta)
  // mainWindow.webContents.openDevTools(); // Disabled for tests

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
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
        // Basic stub
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
            mainWindow.webContents.send('download-scan-finished');
          }
        });
      }
    }
  } catch (e) {
    console.error('Invalid protocol URL', e);
  }
}

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    const url = commandLine.find(arg => arg.startsWith('kamisama://'));
    if (url) handleProtocolUrl(url);
  });

  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('kamisama', process.execPath, [path.resolve(process.argv[1])]);
    }
  } else {
    app.setAsDefaultProtocolClient('kamisama');
  }

  const startupsUrl = process.argv.find(arg => arg.startsWith('kamisama://'));
  if (startupsUrl) handleProtocolUrl(startupsUrl);

  app.whenReady().then(async () => {
    await modManager.ensureModsDir();
    registerIpcHandlers();
    createWindow();
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
