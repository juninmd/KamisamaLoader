import { app, BrowserWindow, ipcMain, net, shell } from 'electron';
import path from 'path';
import { ModManager } from './mod-manager.js';

let mainWindow: BrowserWindow | null;
const modManager = new ModManager();

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
    return await modManager.getInstalledMods();
  });

  ipcMain.handle('install-mod', async (_event, filePath) => {
    return await modManager.installMod(filePath);
  });

  ipcMain.handle('toggle-mod', async (_event, modId, isEnabled) => {
    return await modManager.toggleMod(modId, isEnabled);
  });

  ipcMain.handle('save-settings', async (_event, settings) => {
    console.log('Saving settings:', settings);
    return true;
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
}

app.whenReady().then(async () => {
    await modManager.ensureModsDir();
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
