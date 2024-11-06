const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    "electronAPI", {
        saveImage: (imageData, suggestedName) => 
            ipcRenderer.invoke('save-image', imageData, suggestedName),
        onSplashMessage: (callback) => 
            ipcRenderer.on('splash-message', (event, message) => callback(message)),
        onUpdateStatus: (callback) =>
            ipcRenderer.on('update-status', (event, message) => callback(message)),
        checkForUpdates: () =>
            ipcRenderer.invoke('check-for-updates'),
        downloadUpdate: () =>
            ipcRenderer.invoke('download-update'),
        skipUpdate: () =>
            ipcRenderer.invoke('skip-update')
    }
);
