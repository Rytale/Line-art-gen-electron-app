const { ipcMain } = require('electron');

// Handle line art conversion events
ipcMain.handle('convert-to-line-art', async (event, imageData, settings) => {
    try {
        if (!imageData) {
            throw new Error('No image data provided');
        }

        // Just pass the data back to renderer for processing
        return {
            success: true,
            data: imageData
        };
    } catch (error) {
        console.error('Error in line art conversion:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

module.exports = {
    registerHandlers: () => {
        console.log('Conversion handlers registered');
    }
};
