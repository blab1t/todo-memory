// Type definitions for Electron API exposed via preload

export interface ElectronAPI {
    getConfig: () => Promise<{ apiUrl: string; token: string | null }>;
    setConfig: (key: string, value: any) => Promise<boolean>;
    showNotification: (title: string, body: string) => Promise<boolean>;
    windowMinimize: () => Promise<void>;
    windowMaximize: () => Promise<void>;
    windowClose: () => Promise<void>;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

export { };
