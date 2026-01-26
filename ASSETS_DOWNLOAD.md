# Downloading and Serving Scratch Assets Locally

This guide explains how to download all Scratch assets from the CDN and serve them locally.

## Overview

The Scratch asset library contains thousands of sprites, backdrops, and sounds. Instead of fetching them from the Scratch CDN every time, you can download them all and serve them from a local server.

## Prerequisites

Make sure dependencies are installed (Express is included in devDependencies):

```bash
cd eidtors/scratch/scratch-gui
npm install
```

## Step 1: Download Assets

Run the download script to fetch all assets from the Scratch CDN:

```bash
npm run download-assets
```

This will:
- Read all assets from `sprites.json`, `backdrops.json`, and `sounds.json`
- Download each asset from `https://assets.scratch.mit.edu/internalapi/asset/{md5ext}/get/`
- Save them to `static/assets/images/` (for sprites/backdrops) and `static/assets/sounds/` (for sounds)
- Show progress and summary

**Note**: This may take a while as there are thousands of assets. The script downloads 5 assets concurrently by default.

### Download Options

The script will:
- Skip assets that are already downloaded
- Retry failed downloads (you can re-run the script)
- Save a list of failed assets to `static/assets/failed-assets.json`

## Step 2: Start Local Asset Server

After downloading assets, start the local asset server:

```bash
npm run serve-assets
```

This starts a server on `http://localhost:8603` that serves assets in the same format as the Scratch CDN:
- `http://localhost:8603/internalapi/asset/{md5ext}/get/`

## Step 3: Update Storage Configuration

The storage configuration in `src/lib/storage.js` is already set to use the local server at `http://localhost:8603`. If you need to change it:

1. Open `src/lib/storage.js`
2. Find the `constructor()` method
3. Update `this.assetHost = 'http://localhost:8603';` to your preferred URL

## File Structure

After downloading, your assets will be organized as:

```
scratch-gui/
├── static/
│   └── assets/
│       ├── images/          # Sprites and backdrops
│       │   ├── abc123.svg
│       │   ├── def456.png
│       │   └── ...
│       └── sounds/          # Sound files
│           ├── xyz789.wav
│           └── ...
└── scripts/
    ├── download-assets.js   # Download script
    └── serve-assets.js      # Local server
```

## Usage

1. **Download assets** (one-time, or when library updates):
   ```bash
   npm run download-assets
   ```

2. **Start asset server** (in a separate terminal):
   ```bash
   npm run serve-assets
   ```

3. **Start Scratch GUI**:
   ```bash
   npm start
   ```

Now Scratch will load all assets from your local server instead of the CDN!

## Troubleshooting

### Assets Not Loading

1. **Check if asset server is running**: Make sure `npm run serve-assets` is running
2. **Check if assets are downloaded**: Verify files exist in `static/assets/`
3. **Check browser console**: Look for 404 errors or CORS issues
4. **Verify storage.js**: Make sure `assetHost` is set to `http://localhost:8603`

### Failed Downloads

If some assets fail to download:
1. Check `static/assets/failed-assets.json` for the list
2. Re-run `npm run download-assets` - it will skip already downloaded assets and retry failed ones
3. Some assets might be missing from the CDN - this is normal

### CDN Fallback

If an asset is not found locally, the server returns a 404. You can modify `serve-assets.js` to proxy to the CDN as a fallback if needed.

## Performance

- **Download time**: ~30-60 minutes for full library (depends on connection)
- **Storage space**: ~500MB - 1GB for all assets
- **Server performance**: Local serving is much faster than CDN for repeated loads

## Updating Assets

When the library JSON files are updated:
1. Re-run `npm run download-assets` to download new assets
2. The script will skip already downloaded assets
3. Only new assets will be downloaded
