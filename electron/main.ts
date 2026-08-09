import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'path';
import { pathToFileURL } from 'url';
import { ModManager } from './mod-manager.js';
import { DownloadManager } from './download-manager.js';
import { configureWindowSecurity, extractGameBananaModId, isGameBananaUrl } from './window-security.js';
import {
  asBoolean, asDirection, asId, asOnlineMod, asPage, asPositiveId,
  asSearchOptions, asSettings, asString, asStringArray,
} from './ipc-validation.js';

let mainWindow: BrowserWindow | null;
let modBrowserWindow: BrowserWindow | null = null;

const GAMEBANANA_GAME_ID = 21179; // Dragon Ball Sparking! ZERO

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
  ipcMain.handle('pause-download', (_, id) => downloadManager.pauseDownload(asId(id)));
  ipcMain.handle('resume-download', (_, id) => downloadManager.resumeDownload(asId(id)));
  ipcMain.handle('cancel-download', (_, id) => downloadManager.cancelDownload(asId(id)));
  ipcMain.handle('open-download-folder', (_, id) => downloadManager.openDownloadFolder(asId(id)));
  ipcMain.handle('clear-completed-downloads', () => downloadManager.clearCompleted());

  // Window Controls
  ipcMain.on('minimize-window', () => mainWindow?.minimize());
  ipcMain.on('maximize-window', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.on('close-window', () => mainWindow?.close());
  ipcMain.handle('open-mods-directory', () => modManager.openModsDirectory());
  ipcMain.handle('verify-deployment', () => modManager.verifyDeployment());
  ipcMain.handle('open-mod-browser', () => openModBrowser());
  ipcMain.handle('set-mod-order', (_event, orderedIds) => modManager.setModOrder(asStringArray(orderedIds)));

  // Mod Management IPC Handlers
  ipcMain.handle('get-installed-mods', async () => {
    return await modManager.getInstalledMods();
  });

  ipcMain.handle('install-mod', async (_event, filePath) => {
    return await modManager.installMod(asString(filePath, 'mod file path', 32_767));
  });

  ipcMain.handle('uninstall-mod', async (_event, modId) => {
    return await modManager.uninstallMod(asId(modId));
  });

  ipcMain.handle('toggle-mod', async (_event, modId, isEnabled) => {
    return await modManager.toggleMod(asId(modId), asBoolean(isEnabled));
  });

  ipcMain.handle('get-settings', async () => {
    return await modManager.getSettings();
  });

  ipcMain.handle('save-settings', async (_event, settings) => {
    return await modManager.saveSettings(asSettings(settings));
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

  ipcMain.handle('select-background-image', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }],
      title: 'Select Background Image'
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return pathToFileURL(result.filePaths[0]).toString();
    }
    return null;
  });

  ipcMain.handle('check-for-updates', async () => {
    return await modManager.checkForUpdates();
  });

  ipcMain.handle('update-mod', async (_event, modId) => {
    return await modManager.updateMod(asId(modId));
  });

  ipcMain.handle('update-all-mods', async (_event, modIds) => {
    return await modManager.updateAllMods(asStringArray(modIds));
  });

  ipcMain.handle('search-online-mods', async (_event, page = 1, search = '') => {
    return await modManager.searchOnlineMods(asPage(page), asString(search, 'search', 256));
  });

  ipcMain.handle('install-online-mod', async (_event, mod) => {
    return await modManager.installOnlineMod(asOnlineMod(mod));
  });

  ipcMain.handle('launch-game', async () => {
    return await modManager.launchGame();
  });

  ipcMain.handle('install-ue4ss', async () => {
    return await modManager.installUE4SS();
  });

  ipcMain.handle('set-mod-priority', async (event, modId, direction) => {
    return await modManager.setModPriority(asId(modId), asDirection(direction));
  });

  // Profiles
  ipcMain.handle('get-profiles', async () => modManager.getProfiles());
  ipcMain.handle('create-profile', async (_event, name) => modManager.createProfile(asId(name)));
  ipcMain.handle('delete-profile', async (_event, id) => modManager.deleteProfile(asId(id)));
  ipcMain.handle('load-profile', async (_event, id) => modManager.loadProfile(asId(id)));

  ipcMain.handle('get-mod-changelog', async (event, modId) => {
    return await modManager.getModChangelog(asId(modId));
  });

  ipcMain.handle('get-mod-details', async (event, gameBananaId) => {
    return await modManager.getModDetails(asPositiveId(gameBananaId, 'GameBanana identifier'));
  });

  // New API methods for categories and advanced search
  ipcMain.handle('search-by-section', async (_event, options) => {
    return await modManager.searchBySection(asSearchOptions(options));
  });

  ipcMain.handle('fetch-categories', async (_event, gameId) => {
    return await modManager.fetchCategories(gameId === undefined ? undefined : asPositiveId(gameId, 'game identifier'));
  });

  ipcMain.handle('fetch-new-mods', async (_event, page) => {
    return await modManager.fetchNewMods(asPage(page));
  });

  ipcMain.handle('fetch-featured-mods', async () => {
    return await modManager.fetchFeaturedMods();
  });

  ipcMain.handle('get-all-online-mods', async (_, forceRefresh) => {
    return await modManager.getAllOnlineMods(forceRefresh === undefined ? false : asBoolean(forceRefresh));
  });

  // Cloud Sync
  ipcMain.handle('export-cloud-sync', async () => {
    if (!mainWindow) return { success: false, message: 'No main window' };
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Mod Data for Cloud Sync',
      defaultPath: 'kamisama-cloud-sync.zip',
      filters: [{ name: 'ZIP Archives', extensions: ['zip'] }]
    });
    if (!result.canceled && result.filePath) {
      return await modManager.exportCloudSync(result.filePath);
    }
    return { success: false, message: 'Export cancelled' };
  });

  ipcMain.handle('import-cloud-sync', async () => {
    if (!mainWindow) return { success: false, message: 'No main window' };
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Mod Data from Cloud Sync',
      properties: ['openFile'],
      filters: [{ name: 'ZIP Archives', extensions: ['zip'] }]
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return await modManager.importCloudSync(result.filePaths[0]);
    }
    return { success: false, message: 'Import cancelled' };
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
      sandbox: true,
    },
    titleBarStyle: 'hidden',
  });

  downloadManager.setWindow(mainWindow);

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  // Open DevTools for debugging (remove in final release if desired, but good for beta)
  // mainWindow.webContents.openDevTools(); // Disabled for tests

  configureWindowSecurity(mainWindow.webContents, url => shell.openExternal(url));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function installFromGameBananaId(gameBananaId: number) {
  console.log(`Install triggered for GameBanana ID: ${gameBananaId}`);

  // Basic stub matching OnlineMod interface; installOnlineMod only needs the id
  const modStub: any = {
    id: Date.now().toString(),
    name: 'Unknown',
    author: 'Unknown',
    version: '1.0',
    description: '',
    isEnabled: true,
    iconUrl: '',
    gameBananaId,
    latestVersion: '1.0',
  };

  return modManager.installOnlineMod(modStub).then((result) => {
    console.log('Install result:', result);
    if (mainWindow) {
      mainWindow.webContents.send('download-scan-finished');
    }
    return result;
  });
}

/**
 * Built-in GameBanana browser. Navigation is pinned to GameBanana, downloads
 * are handed to the normal install pipeline instead of hitting the disk raw,
 * and 1-click links are resolved in-process.
 */
function openModBrowser() {
  if (modBrowserWindow && !modBrowserWindow.isDestroyed()) {
    modBrowserWindow.focus();
    return true;
  }

  modBrowserWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    parent: mainWindow ?? undefined,
    title: 'GameBanana',
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      partition: 'persist:gamebanana',
    },
  });

  const browserContents = modBrowserWindow.webContents;

  const handleCandidateUrl = (url: string) => {
    if (url.startsWith('kamisama://') || url.startsWith('gb-modmanager://')) {
      handleProtocolUrl(url);
      return true;
    }
    return false;
  };

  browserContents.setWindowOpenHandler(({ url }) => {
    if (handleCandidateUrl(url)) return { action: 'deny' };
    if (isGameBananaUrl(url)) {
      browserContents.loadURL(url);
      return { action: 'deny' };
    }
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  browserContents.on('will-navigate', (event, url) => {
    if (handleCandidateUrl(url)) {
      event.preventDefault();
      return;
    }
    if (!isGameBananaUrl(url)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  // A download inside the browser means "install this mod" - route it through
  // the same pipeline as the 1-click button so it lands in the Mods folder.
  browserContents.session.on('will-download', (event, item) => {
    const modId = extractGameBananaModId(browserContents.getURL())
      ?? extractGameBananaModId(item.getURL());
    if (!modId) return;

    event.preventDefault();
    void installFromGameBananaId(modId);
    mainWindow?.focus();
  });

  modBrowserWindow.on('closed', () => {
    modBrowserWindow = null;
  });

  modBrowserWindow.loadURL(`https://gamebanana.com/games/${GAMEBANANA_GAME_ID}`);
  return true;
}

function handleProtocolUrl(url: string) {
  console.log('Received Protocol URL:', url);
  try {
    const urlObj = new URL(url);

    // Support kamisama://install?id=123
    // Support gb-modmanager://install/21179/123 (GameID/ModID)

    if (urlObj.host === 'install') {
      let gameBananaId = 0;

      const idParam = urlObj.searchParams.get('id');
      if (idParam && /^\d+$/.test(idParam)) {
        gameBananaId = parseInt(idParam, 10);
      } else {
        // Parse path: /21179/12345
        const parts = urlObj.pathname.split('/').filter(p => p.length > 0);
        if (parts.length >= 2 && /^\d+$/.test(parts[1])) {
           // parts[0] is likely GameId, parts[1] is ModId
           gameBananaId = parseInt(parts[1], 10);
        } else if (parts.length === 1 && /^\d+$/.test(parts[0])) {
           gameBananaId = parseInt(parts[0], 10);
        }
      }

      if (gameBananaId > 0) {
        void installFromGameBananaId(gameBananaId);
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
    const url = commandLine.find(arg => arg.startsWith('kamisama://') || arg.startsWith('gb-modmanager://'));
    if (url) handleProtocolUrl(url);
  });

  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('kamisama', process.execPath, [path.resolve(process.argv[1])]);
      app.setAsDefaultProtocolClient('gb-modmanager', process.execPath, [path.resolve(process.argv[1])]);
    }
  } else {
    app.setAsDefaultProtocolClient('kamisama');
    app.setAsDefaultProtocolClient('gb-modmanager');
  }

  const startupsUrl = process.argv.find(arg => arg.startsWith('kamisama://') || arg.startsWith('gb-modmanager://'));
  if (startupsUrl) handleProtocolUrl(startupsUrl);

  app.whenReady().then(async () => {
    await modManager.ensureModsDir();
    registerIpcHandlers();
    createWindow();
    // Re-deploy anything a game patch removed, so mods survive updates
    modManager.verifyDeployment().catch(e => console.error('Deployment verification failed', e));
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
