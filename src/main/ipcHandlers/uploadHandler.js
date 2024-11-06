const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Handle image upload events
ipcMain.handle('upload-image', async (event, imageData) => {
    try {
        // Validate image data
        if (!imageData || !imageData.startsWith('data:image/')) {
            throw new Error('Invalid image data provided');
        }

        // Return the validated image data
        return {
            success: true,
            data: imageData
        };
    } catch (error) {
        console.error('Upload error:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// Handle image save events
ipcMain.handle('save-image', async (event, imageData, fileName) => {
    try {
        if (!imageData || !imageData.startsWith('data:image/')) {
            throw new Error('Invalid image data');
        }

        // Create downloads directory if it doesn't exist
        const downloadsPath = path.join(process.env.USERPROFILE, 'Downloads');
        const filePath = path.join(downloadsPath, fileName);

        // Convert base64 to buffer
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        // Write the file
        fs.writeFileSync(filePath, buffer);

        return {
            success: true,
            filePath
        };
    } catch (error) {
        console.error('Save error:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

module.exports = {
    registerHandlers: () => {
        console.log('Upload handlers registered');
    }
};
