import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Dialog
  openFile: (options?: any) => ipcRenderer.invoke('dialog:openFile', options),
  saveFile: (options?: any) => ipcRenderer.invoke('dialog:saveFile', options),

  // Shell
  openPath: (path: string) => ipcRenderer.invoke('shell:openPath', path),

  // App
  getPath: (name: string) => ipcRenderer.invoke('app:getPath', name),
  getVersion: () => ipcRenderer.invoke('app:getVersion'),

  // Auto-updater
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),

  // Platform info
  platform: process.platform,

  // Listen for events
  on: (channel: string, callback: (...args: any[]) => void) => {
    const subscription = (_event: any, ...args: any[]) => callback(...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },
});

// Type declaration for the exposed API
declare global {
  interface Window {
    electronAPI: {
      openFile: (options?: any) => Promise<any>;
      saveFile: (options?: any) => Promise<any>;
      openPath: (path: string) => Promise<string>;
      getPath: (name: string) => Promise<string>;
      getVersion: () => Promise<string>;
      checkForUpdates: () => Promise<any>;
      downloadUpdate: () => Promise<boolean>;
      installUpdate: () => void;
      platform: string;
      on: (channel: string, callback: (...args: any[]) => void) => () => void;
    };
  }
}
