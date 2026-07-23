export {};

declare global {
  interface ElectronAPI {
    logToFile: (level: string, message: string) => void;
    minimizeWindow: () => void;
    maximizeWindow: () => void;
    closeWindow: () => void;
    restoreMainWindow: () => void;
    onDeepLink: (callback: (route: string) => void) => void;
  }

  interface Window {
    electronAPI?: ElectronAPI;
    google?: any; // To be typed later if needed, but this prevents the need for `window as any`
  }
}
