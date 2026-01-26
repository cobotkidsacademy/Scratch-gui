const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Paths
const LIBRARY_DIR = path.join(__dirname, '..', 'src', 'lib', 'libraries');
const ASSETS_DIR = path.join(__dirname, '..', 'static', 'assets');
const SPRITES_JSON = path.join(LIBRARY_DIR, 'sprites.json');
const BACKDROPS_JSON = path.join(LIBRARY_DIR, 'backdrops.json');
const SOUNDS_JSON = path.join(LIBRARY_DIR, 'sounds.json');

// CDN base URL
const CDN_BASE = 'https://assets.scratch.mit.edu';
const CDN_PATH = '/internalapi/asset';

// Create assets directory structure
fs.mkdirSync(ASSETS_DIR, { recursive: true });
fs.mkdirSync(path.join(ASSETS_DIR, 'images'), { recursive: true });
fs.mkdirSync(path.join(ASSETS_DIR, 'sounds'), { recursive: true });

// Track downloaded assets
const downloadedAssets = new Set();
const failedAssets = [];
let totalAssets = 0;
let downloadedCount = 0;
let skippedCount = 0;

// Download a single asset
function downloadAsset(md5ext, assetType) {
    return new Promise((resolve, reject) => {
        // Check if already downloaded
        const [assetId, ext] = md5ext.split('.');
        const localPath = path.join(
            ASSETS_DIR,
            assetType === 'sound' ? 'sounds' : 'images',
            md5ext
        );

        if (fs.existsSync(localPath)) {
            skippedCount++;
            resolve({ md5ext, status: 'skipped' });
            return;
        }

        // Construct CDN URL
        const url = `${CDN_BASE}${CDN_PATH}/${md5ext}/get/`;
        
        const protocol = url.startsWith('https') ? https : http;
        
        const file = fs.createWriteStream(localPath);
        
        const request = protocol.get(url, (response) => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    downloadedAssets.add(md5ext);
                    downloadedCount++;
                    resolve({ md5ext, status: 'downloaded' });
                });
            } else if (response.statusCode === 301 || response.statusCode === 302) {
                // Handle redirects
                file.close();
                fs.unlinkSync(localPath);
                const redirectUrl = response.headers.location;
                if (redirectUrl) {
                    downloadAsset(md5ext, assetType).then(resolve).catch(reject);
                } else {
                    failedAssets.push({ md5ext, error: `Redirect without location: ${response.statusCode}` });
                    reject(new Error(`Redirect without location: ${response.statusCode}`));
                }
            } else {
                file.close();
                fs.unlinkSync(localPath);
                failedAssets.push({ md5ext, error: `HTTP ${response.statusCode}` });
                reject(new Error(`HTTP ${response.statusCode}`));
            }
        });

        request.on('error', (err) => {
            file.close();
            if (fs.existsSync(localPath)) {
                fs.unlinkSync(localPath);
            }
            failedAssets.push({ md5ext, error: err.message });
            reject(err);
        });

        file.on('error', (err) => {
            file.close();
            if (fs.existsSync(localPath)) {
                fs.unlinkSync(localPath);
            }
            failedAssets.push({ md5ext, error: err.message });
            reject(err);
        });
    });
}

// Extract all assets from library JSON
function extractAssets() {
    const assets = {
        images: new Set(),
        sounds: new Set()
    };

    // Load and process sprites.json
    if (fs.existsSync(SPRITES_JSON)) {
        const sprites = JSON.parse(fs.readFileSync(SPRITES_JSON, 'utf8'));
        sprites.forEach(sprite => {
            if (sprite.costumes) {
                sprite.costumes.forEach(costume => {
                    if (costume.md5ext) {
                        assets.images.add(costume.md5ext);
                    }
                });
            }
            if (sprite.sounds) {
                sprite.sounds.forEach(sound => {
                    if (sound.md5ext) {
                        assets.sounds.add(sound.md5ext);
                    }
                });
            }
        });
        console.log(`Found ${sprites.length} sprites`);
    }

    // Load and process backdrops.json
    if (fs.existsSync(BACKDROPS_JSON)) {
        const backdrops = JSON.parse(fs.readFileSync(BACKDROPS_JSON, 'utf8'));
        backdrops.forEach(backdrop => {
            if (backdrop.md5ext) {
                assets.images.add(backdrop.md5ext);
            }
        });
        console.log(`Found ${backdrops.length} backdrops`);
    }

    // Load and process sounds.json
    if (fs.existsSync(SOUNDS_JSON)) {
        const sounds = JSON.parse(fs.readFileSync(SOUNDS_JSON, 'utf8'));
        sounds.forEach(sound => {
            if (sound.md5ext) {
                assets.sounds.add(sound.md5ext);
            }
        });
        console.log(`Found ${sounds.length} sounds`);
    }

    return assets;
}

// Download assets with concurrency control
async function downloadAllAssets(assets, concurrency = 5) {
    const allAssets = [
        ...Array.from(assets.images).map(md5ext => ({ md5ext, type: 'image' })),
        ...Array.from(assets.sounds).map(md5ext => ({ md5ext, type: 'sound' }))
    ];

    totalAssets = allAssets.length;
    console.log(`\nTotal assets to download: ${totalAssets}`);
    console.log(`  - Images: ${assets.images.size}`);
    console.log(`  - Sounds: ${assets.sounds.size}`);
    console.log(`\nStarting download with concurrency: ${concurrency}...\n`);

    // Process in batches
    for (let i = 0; i < allAssets.length; i += concurrency) {
        const batch = allAssets.slice(i, i + concurrency);
        const promises = batch.map(({ md5ext, type }) => 
            downloadAsset(md5ext, type)
                .catch(err => {
                    console.error(`Failed to download ${md5ext}:`, err.message);
                    return { md5ext, status: 'failed' };
                })
        );

        await Promise.all(promises);

        // Progress update
        const progress = ((i + batch.length) / totalAssets * 100).toFixed(1);
        console.log(`Progress: ${i + batch.length}/${totalAssets} (${progress}%) - Downloaded: ${downloadedCount}, Skipped: ${skippedCount}, Failed: ${failedAssets.length}`);
    }
}

// Main execution
async function main() {
    console.log('Scratch Assets Downloader');
    console.log('==========================\n');
    console.log('Library directory:', LIBRARY_DIR);
    console.log('Assets directory:', ASSETS_DIR);
    console.log('CDN base:', CDN_BASE);

    try {
        // Extract all assets from library files
        console.log('\nExtracting assets from library files...');
        const assets = extractAssets();

        // Download all assets
        await downloadAllAssets(assets, 5); // 5 concurrent downloads

        // Summary
        console.log('\n==========================');
        console.log('Download Summary:');
        console.log(`Total assets: ${totalAssets}`);
        console.log(`Downloaded: ${downloadedCount}`);
        console.log(`Skipped (already exists): ${skippedCount}`);
        console.log(`Failed: ${failedAssets.length}`);

        if (failedAssets.length > 0) {
            console.log('\nFailed assets:');
            failedAssets.slice(0, 10).forEach(({ md5ext, error }) => {
                console.log(`  - ${md5ext}: ${error}`);
            });
            if (failedAssets.length > 10) {
                console.log(`  ... and ${failedAssets.length - 10} more`);
            }
            
            // Save failed assets to file
            const failedFile = path.join(ASSETS_DIR, 'failed-assets.json');
            fs.writeFileSync(failedFile, JSON.stringify(failedAssets, null, 2));
            console.log(`\nFailed assets saved to: ${failedFile}`);
        }

        console.log('\nDownload complete!');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { downloadAsset, extractAssets };
