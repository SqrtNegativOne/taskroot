
/**
 * A universal logger that logs to the browser console and, 
 * if running inside Electron, also appends to taskroot.log.
 */
export const logger = {
  info: (message: string) => {
    console.log(`[INFO] ${message}`);
    if (window.electronAPI) {
      window.electronAPI.logToFile('info', message);
    }
  },
  warn: (message: string) => {
    console.warn(`[WARN] ${message}`);
    if (window.electronAPI) {
      window.electronAPI.logToFile('warn', message);
    }
  },
  error: (message: string) => {
    console.error(`[ERROR] ${message}`);
    if (window.electronAPI) {
      window.electronAPI.logToFile('error', message);
    }
  },
};
