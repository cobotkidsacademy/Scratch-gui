const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 8603;
const ASSETS_DIR = path.join(__dirname, '..', 'static', 'assets');
const SCRATCH_CDN = 'https://assets.scratch.mit.edu';

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Serve assets from local directory
app.get('/internalapi/asset/:md5ext/get/', (req, res) => {
    const md5ext = req.params.md5ext;
    const startTime = Date.now();
    
    // Determine if it's an image or sound based on extension
    const ext = path.extname(md5ext).toLowerCase();
    const isSound = ['.wav', '.mp3', '.ogg'].includes(ext);
    const subDir = isSound ? 'sounds' : 'images';
    
    const filePath = path.join(ASSETS_DIR, subDir, md5ext);
    
    console.log(`[Asset Server] GET request for: ${md5ext} (${req.method})`);
    
    // Check if file exists locally
    if (fs.existsSync(filePath)) {
        // Set appropriate content type
        const contentType = getContentType(ext);
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }
        
        // Set CORS headers explicitly
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        // Get file stats for Content-Length header
        const stats = fs.statSync(filePath);
        res.setHeader('Content-Length', stats.size);
        
        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        
        fileStream.on('end', () => {
            const duration = Date.now() - startTime;
            console.log(`[Asset Server] ✅ Served ${md5ext} in ${duration}ms (${stats.size} bytes)`);
        });
        
        fileStream.on('error', (err) => {
            console.error(`[Asset Server] ❌ Error serving ${md5ext}:`, err);
            if (!res.headersSent) {
                res.status(500).send('Error serving file');
            }
        });
    } else {
        // File not found locally, proxy to Scratch CDN as fallback
        console.log(`[Asset Server] ⚠️ Asset not found locally, proxying from CDN: ${md5ext}`);
        console.log(`[Asset Server] File path checked: ${filePath}`);
        const cdnUrl = `${SCRATCH_CDN}/internalapi/asset/${md5ext}/get/`;
        
        // Proxy request to Scratch CDN
        const protocol = cdnUrl.startsWith('https') ? https : http;
        const cdnRequest = protocol.get(cdnUrl, (cdnResponse) => {
            // Forward status code
            res.status(cdnResponse.statusCode);
            
            // Forward headers
            Object.keys(cdnResponse.headers).forEach(key => {
                res.setHeader(key, cdnResponse.headers[key]);
            });
            
            // Pipe CDN response to client
            cdnResponse.pipe(res);
            
            cdnResponse.on('error', (err) => {
                console.error(`Error proxying ${md5ext} from CDN:`, err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Failed to fetch from CDN', md5ext });
                }
            });
        });
        
        cdnRequest.on('error', (err) => {
            console.error(`Error requesting ${md5ext} from CDN:`, err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'CDN request failed', md5ext });
            }
        });
        
        // Handle client disconnect
        req.on('close', () => {
            cdnRequest.destroy();
        });
    }
});

// Helper function to get content type
function getContentType(ext) {
    const contentTypes = {
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.wav': 'audio/wav',
        '.mp3': 'audio/mpeg',
        '.ogg': 'audio/ogg'
    };
    return contentTypes[ext.toLowerCase()] || 'application/octet-stream';
}

// Handle OPTIONS requests for CORS preflight
app.options('/internalapi/asset/:md5ext/get/', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(200).end();
});

// Health check
app.get('/', (req, res) => {
    // Check if assets directory exists and count files
    const imagesDir = path.join(ASSETS_DIR, 'images');
    const soundsDir = path.join(ASSETS_DIR, 'sounds');
    let imageCount = 0;
    let soundCount = 0;
    
    try {
        if (fs.existsSync(imagesDir)) {
            imageCount = fs.readdirSync(imagesDir).length;
        }
        if (fs.existsSync(soundsDir)) {
            soundCount = fs.readdirSync(soundsDir).length;
        }
    } catch (err) {
        console.error('Error counting assets:', err);
    }
    
    res.json({
        status: 'ok',
        message: 'Scratch Assets Local Server',
        assetsDir: ASSETS_DIR,
        assetCounts: {
            images: imageCount,
            sounds: soundCount,
            total: imageCount + soundCount
        },
        endpoints: {
            assets: '/internalapi/asset/:md5ext/get/'
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Scratch Assets Local Server running on http://localhost:${PORT}`);
    console.log(`Assets directory: ${ASSETS_DIR}`);
    console.log(`\nTo use this server, update storage.js assetHost to: http://localhost:${PORT}`);
});
