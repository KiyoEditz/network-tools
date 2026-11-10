// src/main/index.ts
import { app, BrowserWindow, session } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerIpcHandlers } from './ipc/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic registry for custom headers in Chromium native requests/WebSockets
export const customChromiumHeaders = new Map<string, Record<string, string>>();

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0f172a',
    title: 'Antigravity Network Tester',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  registerIpcHandlers(mainWindow);

  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL(devServerUrl).catch(() => {
      // Fallback if dev server is starting
      setTimeout(() => mainWindow?.loadURL(devServerUrl), 1000);
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Intercept outgoing Chromium requests (including WebSockets) to inject custom headers (Origin, User-Agent, Cookie)
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    try {
      const urlObj = new URL(details.url);
      const host = urlObj.hostname.toLowerCase();

      for (const [pattern, headers] of customChromiumHeaders.entries()) {
        const lowerPattern = pattern.toLowerCase();
        if (host.includes(lowerPattern) || lowerPattern.includes(host)) {
          for (const [k, v] of Object.entries(headers)) {
            details.requestHeaders[k] = v;
          }
        }
      }
    } catch {
      // Ignore invalid URL parsing
    }
    callback({ requestHeaders: details.requestHeaders });
  });

  createWindow();

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
