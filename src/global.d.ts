export type __Placeholder = unknown;

declare global {
    interface ImportMetaEnv {
        readonly VITE_GOOGLE_CLIENT_ID: string;
        readonly VITE_GOOGLE_CLIENT_SECRET: string;
        readonly VITE_OFFLINE_MODE: string;
    }

    interface ElectronAPI {
        logToFile: (level: string, message: string) => void;
        minimizeWindow: () => void;
        maximizeWindow: () => void;
        closeWindow: () => void;
        restoreMainWindow: () => void;
        onDeepLink: (callback: (route: string) => void) => void;
        shutdownPC: () => void;
    }

    interface Window {
        electronAPI?: ElectronAPI;
        google?: {
            accounts: {
                oauth2: {
                    initCodeClient: (config: {
                        client_id: string;
                        scope: string;
                        ux_mode: string;
                        callback: (response: { code?: string; error?: string }) => void;
                        error_callback: (error: { message?: string }) => void;
                    }) => { requestCode: () => void };
                };
            };
        };
    }
}
