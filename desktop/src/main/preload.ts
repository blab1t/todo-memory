import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    getConfig: () => ipcRenderer.invoke('get-config'),
    setConfig: (key: string, value: any) => ipcRenderer.invoke('set-config', key, value),
    showNotification: (title: string, body: string) => ipcRenderer.invoke('show-notification', title, body),
    windowMinimize: () => ipcRenderer.invoke('window-minimize'),
    windowMaximize: () => ipcRenderer.invoke('window-maximize'),
    windowClose: () => ipcRenderer.invoke('window-close'),
});

export { };
