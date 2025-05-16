const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Define CDN URL (can be changed to your actual CDN when deployed)
const CDN_URL = process.env.CDN_URL || '';

// Set cache headers for static assets
const setStaticAssetHeaders = (res) => {
    // Cache for 1 day (86400 seconds)
    res.setHeader('Cache-Control', 'public, max-age=86400');
    // Set ETag for efficient caching
    res.setHeader('ETag', true);
};

// Intercept .js requests to set correct MIME type and cache headers
app.get('*.js', (req, res, next) => {
    const filePath = path.join(__dirname, req.path);
    // Check if the file exists before sending
    require('fs').access(filePath, require('fs').constants.F_OK, (err) => {
        if (err) {
            // If file doesn't exist, pass to the next middleware
            next();
            return;
        }
        res.setHeader('Content-Type', 'application/javascript');
        setStaticAssetHeaders(res);
        res.sendFile(filePath);
    });
});

// Serve static assets with cache headers
app.use(express.static('.', {
    etag: true,
    lastModified: true,
    maxAge: '1d', // Cache for 1 day
    setHeaders: setStaticAssetHeaders
}));

// Helper function to generate CDN URLs (used in templates)
app.locals.cdnUrl = (assetPath) => {
    return `${CDN_URL}${assetPath}`;
};

// Increase timeout values to handle more connections
const server = app.listen(port, () => {
    console.log(`Level editor running at http://localhost:${port}`);
});

// Configure server for higher load
server.keepAliveTimeout = 30000; // 30 seconds
server.headersTimeout = 35000; // 35 seconds
