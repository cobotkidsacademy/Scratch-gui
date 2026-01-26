# Storage Configuration

## Overview

The Scratch GUI is configured to fetch all assets (sprites, backdrops, sounds) from a local static server instead of the Scratch CDN.

## Configuration

### Asset Host

The asset host is set to: `http://localhost:8603`

This is configured in `src/lib/storage.js`:
- Default asset host: `http://localhost:8603`
- Asset URL format: `/internalapi/asset/{md5ext}/get/`

### How It Works

1. **Asset Requests**: When Scratch needs an asset (sprite, backdrop, or sound), it calls `getAssetGetConfig()`
2. **URL Generation**: The function constructs the URL using the format: `http://localhost:8603/internalapi/asset/{md5ext}/get/`
3. **Local Server**: The asset server at port 8603 serves the file from `static/assets/` directory
4. **Fallback**: If the local server is not available, requests will fail (you can add CDN fallback if needed)

## Setup Requirements

### 1. Start Asset Server

Before running Scratch GUI, start the local asset server:

```bash
cd eidtors/scratch/scratch-gui
npm run serve-assets
```

This starts the server on `http://localhost:8603`

### 2. Download Assets

Make sure assets are downloaded to `static/assets/`:

```bash
npm run download-assets
```

### 3. Start Scratch GUI

```bash
npm start
```

## Asset URL Format

Assets are requested using the Scratch CDN-compatible format:

```
http://localhost:8603/internalapi/asset/{md5ext}/get/
```

Where `{md5ext}` is the format: `{assetId}.{extension}`

Examples:
- `http://localhost:8603/internalapi/asset/809d9b47347a6af2860e7a3a35bce057.svg/get/`
- `http://localhost:8603/internalapi/asset/c04ebf21e5e19342fa1535e4efcdb43b.wav/get/`

## File Structure

Assets are organized as:

```
static/
└── assets/
    ├── images/          # Sprites and backdrops
    │   ├── abc123.svg
    │   ├── def456.png
    │   └── ...
    └── sounds/          # Sound files
        ├── xyz789.wav
        └── ...
```

## Troubleshooting

### Assets Not Loading

1. **Check asset server is running**:
   ```bash
   # Should see: "Scratch Assets Local Server running on http://localhost:8603"
   npm run serve-assets
   ```

2. **Check assets are downloaded**:
   ```bash
   # Verify files exist in static/assets/
   ls static/assets/images/
   ls static/assets/sounds/
   ```

3. **Check browser console**:
   - Look for 404 errors
   - Check if URLs are correct: `http://localhost:8603/internalapi/asset/...`
   - Verify CORS is not blocking requests

4. **Test asset URL directly**:
   - Open: `http://localhost:8603/internalapi/asset/{md5ext}/get/`
   - Should download or display the asset

### Changing Asset Host

To change the asset host (e.g., to use a different port or server):

1. Edit `src/lib/storage.js`
2. Find `this.assetHost = 'http://localhost:8603';`
3. Change to your desired URL
4. Restart Scratch GUI

### Adding CDN Fallback

If you want to fall back to Scratch CDN when local assets are not available, you can modify `getAssetGetConfig()` to check if the local file exists first, then fall back to:

```javascript
const CDN_URL = 'https://assets.scratch.mit.edu';
// Use CDN as fallback
return `${CDN_URL}/internalapi/asset/${md5ext}/get/`;
```

## Benefits

- **Faster Loading**: Local assets load much faster than CDN
- **Offline Support**: Works without internet connection
- **Custom Assets**: Easy to add your own assets
- **No CDN Dependencies**: No reliance on external services
