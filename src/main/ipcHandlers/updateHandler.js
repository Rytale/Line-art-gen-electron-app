const { app } = require("electron");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");

// Configure logging
log.transports.file.level = "info";
autoUpdater.logger = log;
autoUpdater.autoDownload = false;

// Force updates in development
autoUpdater.forceDevUpdateConfig = true;

let mainWindow = null;
let splashWindow = null;
let updateAvailable = false;

function initialize(mainWin, splashWin) {
  if (mainWin) mainWindow = mainWin;
  if (splashWin) splashWindow = splashWin;

  autoUpdater.on("checking-for-update", () => {
    sendStatusToWindow("Checking for updates...");
  });

  autoUpdater.on("update-available", (info) => {
    updateAvailable = true;
    sendStatusToWindow(`New version ${info.version} is available!`);
  });

  autoUpdater.on("update-not-available", () => {
    updateAvailable = false;
    sendStatusToWindow("Loading application...");
  });

  autoUpdater.on("error", (err) => {
    updateAvailable = false;
    sendStatusToWindow("Error checking for updates");
    log.error("Error in auto-updater:", err);
  });

  autoUpdater.on("download-progress", (progressObj) => {
    const progress = Math.round(progressObj.percent);
    sendStatusToWindow(`Downloading update: ${progress}%`);
    if (progress === 100) {
      sendStatusToWindow("Preparing to install update...");
    }
  });

  autoUpdater.on("update-downloaded", () => {
    sendStatusToWindow("Update ready! Restarting...");
    setTimeout(() => {
      autoUpdater.quitAndInstall(false, true);
    }, 3000);
  });
}

function sendStatusToWindow(text) {
  log.info(text);
  if (splashWindow) {
    splashWindow.webContents.send("splash-message", text);
  }
  if (mainWindow) {
    mainWindow.webContents.send("update-status", text);
  }
}

function checkForUpdates() {
  // Set a fake update server URL for development testing
  if (process.env.NODE_ENV !== "production") {
    autoUpdater.updateConfigPath = "dev-app-update.yml";
    autoUpdater.setFeedURL({
      provider: "generic",
      url: "http://localhost:3000/updates",
    });
  }

  autoUpdater.checkForUpdates().catch((err) => {
    log.error("Error checking for updates:", err);
    sendStatusToWindow("Update check failed");
  });
}

function downloadUpdate() {
  if (updateAvailable) {
    return autoUpdater.downloadUpdate().catch((err) => {
      log.error("Error downloading update:", err);
      sendStatusToWindow("Error downloading update");
    });
  }
}

function isUpdateAvailable() {
  return updateAvailable;
}

module.exports = {
  initialize,
  checkForUpdates,
  downloadUpdate,
  isUpdateAvailable,
};