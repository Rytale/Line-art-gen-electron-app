const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("path");
const updateHandler = require("./ipcHandlers/updateHandler");

// Force software rendering
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-software-rasterizer");
app.commandLine.appendSwitch("disable-gpu-compositing");
app.disableHardwareAcceleration();

// Import IPC handlers
require("./ipcHandlers/uploadHandler").registerHandlers();
require("./ipcHandlers/conversionHandler").registerHandlers();

let mainWindow = null;
let splashWindow = null;
let updateDecisionMade = false;

// Register IPC handlers
ipcMain.handle("download-update", () => {
  updateDecisionMade = true;
  return updateHandler.downloadUpdate();
});

ipcMain.handle("skip-update", () => {
  updateDecisionMade = true;
  proceedToMainWindow();
});

function createSplashWindow() {
  // Get the primary display dimensions
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  splashWindow = new BrowserWindow({
    width: 420,
    height: 520,
    frame: false,
    transparent: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      sandbox: false,
    },
    x: Math.floor(width / 2 - 210), // Center horizontally
    y: Math.floor(height / 2 - 260), // Center vertically
    backgroundColor: "#00000000",
    hasShadow: true,
    roundedCorners: true,
    titleBarStyle: "hidden",
    vibrancy: "under-window",
    visualEffectState: "active",
    skipTaskbar: true,
    alwaysOnTop: true,
  });

  const splashPath = path.join(
    __dirname,
    "..",
    "renderer",
    "pages",
    "splash",
    "splash.html"
  );
  splashWindow.loadFile(splashPath);

  // Initialize update handler with splash window
  updateHandler.initialize(null, splashWindow);

  // Check for updates immediately after splash screen loads
  splashWindow.webContents.on("did-finish-load", () => {
    splashWindow.webContents.send("splash-message", "Checking for updates...");
    updateHandler.checkForUpdates();

    // Wait for update check to complete
    setTimeout(() => {
      if (!updateHandler.isUpdateAvailable()) {
        proceedToMainWindow();
      }
    }, 3000);
  });
}

function proceedToMainWindow() {
  if (!updateDecisionMade && updateHandler.isUpdateAvailable()) {
    return; // Wait for update decision
  }

  const messages = [
    "Loading image processor...",
    "Preparing canvas elements...",
    "Configuring settings...",
    "Setting up workspace...",
    "Almost ready...",
    "Starting application...",
  ];

  let messageIndex = 0;
  const messageInterval = setInterval(() => {
    if (splashWindow && messageIndex < messages.length) {
      splashWindow.webContents.send("splash-message", messages[messageIndex]);
      messageIndex++;
    } else {
      clearInterval(messageInterval);
      setTimeout(() => {
        createWindow();
      }, 1000);
    }
  }, 1000);
}

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
      preload: path.join(__dirname, "preload.js"),
      sandbox: false,
    },
    show: false,
    backgroundColor: "#ffffff",
  });

  // Update the main window reference in the handler
  updateHandler.initialize(mainWindow, null);

  // Resolve the HTML file path
  const htmlPath = path.join(
    __dirname,
    "..",
    "renderer",
    "pages",
    "home",
    "home.html"
  );
  console.log("Loading HTML from:", htmlPath);

  // Load the HTML file
  mainWindow.loadFile(htmlPath).catch((err) => {
    console.error("Failed to load HTML:", err);
  });

  // Show window when ready
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    if (splashWindow) {
      splashWindow.close();
      splashWindow = null;
    }
    console.log("Window shown");
  });

  // Error handling
  mainWindow.webContents.on("crashed", () => {
    console.error("Window crashed! Attempting to reload...");
    createWindow(); // Recreate window on crash
  });

  mainWindow.on("unresponsive", () => {
    console.error("Window became unresponsive! Attempting to reload...");
    mainWindow.reload();
  });

  // Log navigation events
  mainWindow.webContents.on("did-start-loading", () => {
    console.log("Started loading content");
  });

  mainWindow.webContents.on("did-finish-load", () => {
    console.log("Finished loading content");
  });

  mainWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription) => {
      console.error("Failed to load:", errorCode, errorDescription);
    }
  );
}

// Initialize app
app
  .whenReady()
  .then(() => {
    console.log("App is ready");
    createSplashWindow();

    app.on("activate", function () {
      console.log("App activated");
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  })
  .catch((err) => {
    console.error("Failed to initialize app:", err);
  });

app.on("window-all-closed", function () {
  console.log("All windows closed");
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Error handling
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled Rejection:", error);
});

app.on("gpu-process-crashed", (event, killed) => {
  console.error("GPU Process Crashed:", { killed });
});

app.on("render-process-crashed", (event, webContents, killed) => {
  console.error("Render Process Crashed:", { killed });
  if (mainWindow) {
    createWindow(); // Recreate window on render process crash
  }
});

// Log app events
app.on("will-quit", () => {
  console.log("App will quit");
});

app.on("before-quit", () => {
  console.log("App before quit");
});
