const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Force software rendering
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.disableHardwareAcceleration();

// Import IPC handlers
require('./ipcHandlers/uploadHandler').registerHandlers();
require('./ipcHandlers/conversionHandler').registerHandlers();

let mainWindow = null;

function createWindow() {
    // Ensure previous instance is destroyed
    if (mainWindow !== null) {
        mainWindow.destroy();
    }

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            sandbox: false
        },
        show: false,
        backgroundColor: '#ffffff'
    });

    // Resolve the HTML file path
    const htmlPath = path.join(__dirname, '..', 'renderer', 'pages', 'home', 'home.html');
    console.log('Loading HTML from:', htmlPath);

    // Load the HTML file
    mainWindow.loadFile(htmlPath).catch(err => {
        console.error('Failed to load HTML:', err);
    });

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        console.log('Window shown');
    });

    // Error handling
    mainWindow.webContents.on('crashed', () => {
        console.error('Window crashed! Attempting to reload...');
        createWindow(); // Recreate window on crash
    });

    mainWindow.on('unresponsive', () => {
        console.error('Window became unresponsive! Attempting to reload...');
        mainWindow.reload();
    });

    // Log navigation events
    mainWindow.webContents.on('did-start-loading', () => {
        console.log('Started loading content');
    });

    mainWindow.webContents.on('did-finish-load', () => {
        console.log('Finished loading content');
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('Failed to load:', errorCode, errorDescription);
    });
}

// Initialize app
app.whenReady().then(() => {
    console.log('App is ready');
    createWindow();

    app.on('activate', function () {
        console.log('App activated');
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
}).catch(err => {
    console.error('Failed to initialize app:', err);
});

app.on('window-all-closed', function () {
    console.log('All windows closed');
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});

app.on('gpu-process-crashed', (event, killed) => {
    console.error('GPU Process Crashed:', { killed });
});

app.on('render-process-crashed', (event, webContents, killed) => {
    console.error('Render Process Crashed:', { killed });
    if (mainWindow) {
        createWindow(); // Recreate window on render process crash
    }
});

// Log app events
app.on('will-quit', () => {
    console.log('App will quit');
});

app.on('before-quit', () => {
    console.log('App before quit');
});
