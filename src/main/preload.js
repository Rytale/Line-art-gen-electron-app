const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Image processing functions
    uploadImage: (file) => ipcRenderer.invoke('upload-image', file),
    convertToLineArt: (imageData, settings) => ipcRenderer.invoke('convert-to-line-art', imageData, settings),
    saveImage: (imageData, filePath) => ipcRenderer.invoke('save-image', imageData, filePath),
    
    // Settings management
    getSettings: () => ipcRenderer.invoke('get-settings'),
    updateSettings: (settings) => ipcRenderer.invoke('update-settings', settings)
});
