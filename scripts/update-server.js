const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

// Enable CORS
app.use(cors());

// Serve YAML update information
app.get('/updates/latest.yml', (req, res) => {
    const updateInfo = `version: 1.0.1
files:
  - url: http://localhost:3000/updates/Line.Art.Generator-1.0.1.exe
    sha512: dummy-sha512-for-testing
    size: 1000000
path: Line.Art.Generator-1.0.1.exe
sha512: dummy-sha512-for-testing
releaseDate: ${new Date().toISOString()}`;

    res.setHeader('Content-Type', 'text/yaml');
    res.send(updateInfo);
});

// Mock endpoint for the installer file
app.get('/updates/Line.Art.Generator-1.0.1.exe', (req, res) => {
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send('Mock installer file');
});

// Start server
app.listen(port, () => {
    console.log(`Update server running at http://localhost:${port}`);
});
