import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null;

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

  // Mod Management IPC Handlers (Stubs)
  ipcMain.handle('get-installed-mods', async () => {
    // TODO: Implement actual file system scan in ./Mods directory
    console.log('Fetching installed mods...');
    return [];
  });

  ipcMain.handle('install-mod', async (_event, filePath) => {
    // TODO: Implement zip extraction and logic placement
    console.log(`Installing mod from: ${filePath}`);
    return { success: true, message: 'Mod installation simulated.' };
  });

  ipcMain.handle('toggle-mod', async (_event, modId, isEnabled) => {
    // TODO: Update mods.txt or rename files
    console.log(`Toggling mod ${modId} to ${isEnabled}`);
    return true;
  });

  ipcMain.handle('save-settings', async (_event, settings) => {
    // TODO: Persist settings to config file
    console.log('Saving settings:', settings);
    return true;
  });
}

app.whenReady().then(createWindow);

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
