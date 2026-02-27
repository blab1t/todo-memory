import { app, BrowserWindow, ipcMain, Notification, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import Store from 'electron-store';

const store = new Store();

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        frame: false,
        titleBarStyle: 'hidden',
        backgroundColor: '#0a0a0f',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Minimize to tray instead of closing
    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow?.hide();
        }
    });
}

function createTray() {
    // Create a simple tray icon
    const icon = nativeImage.createFromDataURL(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAABhklEQVR4nO2WvUoDQRSFv4iNjRZWvoGNnYVv4AtYWFj5BjaClY1vYGFjZyFYWFgIFj6Aha1gYWEhWFgIFiZZmCGMm83O7G7cLRY8cGCZvffM3Llzd+Af/0UJ6AM9oAO0gBbQBBpAHagBVaACVIAyUAKKQAEoAHkgB+SAHJAS/wbwArgFroEr4BK4AC6Ac+AMOAVOgGPgCDgEDoB9YA/YBXaAbeAL8CTEHXADXANXwCVwAZwDZ8ApcAIcA0fAIXAA7AN7wC6wA2wDX4FHIc6AY+AIOAS+A/vAHrAL7ADbwBfgQYhT4Bg4Ag6B78A+sEvjC3AnxClwDBwBh8Ah8B3YB/aAXeAL8CDEKXAMHAGHwHdgH9ijsQvcCHEKHANHwCFwCHwH9oG9r8C9EGfAMXAEHAKHwCFwAOwDe8Auj8C9EGfAMXAEHAKHwCFwCBwAe8Auj8CdEGfAMXAEHAKHwCHwE9gD9nkE7oQ4A46BI+AQOASCIPAD2AN2eQTuhTgDjoEj4BCo4hfxB0YOsLLxGO4AAAAASUVORK5CYII='
    );

    tray = new Tray(icon);

    const contextMenu = Menu.buildFromTemplate([
        { label: 'Show App', click: () => mainWindow?.show() },
        { type: 'separator' },
        { label: 'Quit', click: () => { isQuitting = true; app.quit(); } },
    ]);

    tray.setToolTip('Todo Memory');
    tray.setContextMenu(contextMenu);

    tray.on('double-click', () => {
        mainWindow?.show();
    });
}

// IPC handlers
ipcMain.handle('get-config', () => {
    return {
        apiUrl: store.get('apiUrl', 'http://localhost:3000'),
        token: store.get('token', null),
    };
});

ipcMain.handle('set-config', (_, key: string, value: any) => {
    store.set(key, value);
    return true;
});

ipcMain.handle('show-notification', (_, title: string, body: string) => {
    new Notification({ title, body }).show();
    return true;
});

ipcMain.handle('window-minimize', () => {
    mainWindow?.minimize();
});

ipcMain.handle('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow?.maximize();
    }
});

ipcMain.handle('window-close', () => {
    mainWindow?.hide();
});

// App lifecycle
app.whenReady().then(() => {
    createWindow();
    createTray();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    isQuitting = true;
});
