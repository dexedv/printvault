/// <reference types="vite/client" />

declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

interface FileDialogResult {
  canceled: boolean;
  filePaths: string[];
}

interface ElectronAPI {
  openFile: (options: { filters: { name: string; extensions: string[] }[] }) => Promise<FileDialogResult>;
  getVersion: () => Promise<string>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => void;
  on: (channel: string, callback: (...args: any[]) => void) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
