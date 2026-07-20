import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { createServer } from 'node:http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, '..');

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST;

let win: BrowserWindow | null;
let miniWin: BrowserWindow | null = null;
let tray: Tray | null = null;
let serverPort = 0;

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('taskroot', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('taskroot');
}

function handleDeepLink(url: string) {
  if (!url.startsWith('taskroot://')) return;
  const route = url.replace('taskroot://', '').replace(/\/$/, '');
  if (win && !win.isDestroyed() && route) {
    win.webContents.send('deep-link', route);
  }
}

app.on('second-instance', (event, commandLine) => {
  if (win && !win.isDestroyed()) {
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  }
  const url = commandLine.find(arg => arg.startsWith('taskroot://'));
  if (url) {
    handleDeepLink(url);
  }
});

// macOS deep link handling
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

// Handle file logging from renderer
ipcMain.on('log-to-file', (event, level, message) => {
  const logPath = path.join(process.env.APP_ROOT as string, 'taskroot.log');
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
  try {
    fs.appendFileSync(logPath, logLine);
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
});

// Window controls
ipcMain.on('window-minimize', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window === win) {
    win?.minimize();
    createMiniWindow();
  } else {
    window?.minimize();
  }
});
ipcMain.on('window-maximize', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window?.isMaximized()) {
    window?.unmaximize();
  } else {
    window?.maximize();
  }
});
ipcMain.on('window-close', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window === win) {
    win?.hide();
    createMiniWindow();
  } else {
    window?.close();
  }
});
ipcMain.on('window-restore-main', () => {
  if (win && !win.isDestroyed()) {
    if (win.isMinimized()) win.restore();
    win.show();
  }
});

function createMiniWindow() {
  if (miniWin) return;
  miniWin = new BrowserWindow({
    width: 300,
    height: 100,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  const url = VITE_DEV_SERVER_URL ? `${VITE_DEV_SERVER_URL}?minitracker=true` : `http://localhost:${serverPort}?minitracker=true`;
  miniWin.loadURL(url);

  miniWin.on('closed', () => {
    miniWin = null;
    if (!win || win.isDestroyed() || !win.isVisible()) {
      app.quit();
    }
  });

  miniWin.on('maximize', () => {
    if (win && !win.isDestroyed()) {
      if (win.isMinimized()) win.restore();
      win.show();
    }
  });
}


function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    icon: path.join(process.env.VITE_PUBLIC as string, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    const server = createServer((req: any, res: any) => {
      let pathname = new URL(req.url || '', `http://${req.headers.host}`).pathname;
      if (pathname === '/') pathname = '/index.html';
      let filePath = path.join(RENDERER_DIST, pathname);
      
      if (!filePath.startsWith(RENDERER_DIST)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      
      if (!fs.existsSync(filePath)) {
        filePath = path.join(RENDERER_DIST, 'index.html');
      }

      const ext = path.extname(filePath);
      const mimeTypes: Record<string, string> = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon'
      };
      
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      
      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(500);
          res.end('Internal Server Error');
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content, 'utf-8');
        }
      });
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      serverPort = typeof addr === 'string' ? 0 : addr?.port || 0;
      win?.loadURL(`http://localhost:${serverPort}`);
    });
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

function createTray() {
  if (tray) return;
  const iconPath = path.join(process.env.VITE_PUBLIC as string, 'icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  
  tray = new Tray(icon);
  tray.setToolTip('Taskroot');
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Taskroot',
      click: () => {
        if (win && !win.isDestroyed()) {
          if (win.isMinimized()) win.restore();
          win.show();
        } else {
          createWindow();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Exit',
      click: () => {
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    if (win && !win.isDestroyed()) {
      if (win.isMinimized()) win.restore();
      win.show();
    } else {
      createWindow();
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  createMiniWindow();
  createTray();

  const url = process.argv.find(arg => arg.startsWith('taskroot://'));
  if (url) {
    if (win && !win.isDestroyed()) {
      win.webContents.once('did-finish-load', () => {
        handleDeepLink(url);
      });
    }
  }
});
