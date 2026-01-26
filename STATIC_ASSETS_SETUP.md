# Static Assets Setup

## Issue: Sprites Not Displaying

If sprites aren't displaying when you click them, it's likely because:

1. **Assets haven't been downloaded yet**
2. **Assets are in wrong location**
3. **Webpack not serving static files correctly**

## Quick Fix

### Step 1: Download Assets

The assets directory exists but is empty. Download all assets:

```bash
cd eidtors/scratch/scratch-gui
npm run download-assets
```

This will download all sprites, backdrops, and sounds to:
- `static/assets/images/` (for sprites and backdrops)
- `static/assets/sounds/` (for sounds)

### Step 2: Verify Assets Downloaded

Check if files exist:

```bash
# Check images
ls static/assets/images/ | head -10

# Check sounds  
ls static/assets/sounds/ | head -10
```

### Step 3: Restart Webpack Dev Server

After downloading assets, restart webpack:

```bash
# Stop (Ctrl+C) then:
npm start
```

## How It Works Now

- **Asset Paths**: `/static/assets/images/{md5ext}` or `/static/assets/sounds/{md5ext}`
- **Served By**: Webpack dev server (port 8601)
- **No Separate Server**: Port 8603 asset server is NOT needed
- **URL Format**: `http://localhost:8601/static/assets/images/{md5ext}`

## Troubleshooting

### Sprites Still Not Displaying

1. **Check browser console (F12)**:
   - Look for 404 errors
   - Check what URLs are being requested
   - Should see: `http://localhost:8601/static/assets/images/...`

2. **Test asset URL directly**:
   - Open: `http://localhost:8601/static/assets/images/809d9b47347a6af2860e7a3a35bce057.svg`
   - If 404: Asset not downloaded or wrong path
   - If works: Asset exists, check why Scratch isn't loading it

3. **Verify webpack is serving static files**:
   - Check webpack config has CopyWebpackPlugin copying `static/` directory
   - Files should be accessible at `/static/assets/...`

4. **Check asset exists**:
   ```bash
   # Find a specific asset
   find static/assets -name "809d9b47347a6af2860e7a3a35bce057.svg"
   ```

## Current Configuration

- **Storage**: Returns paths like `/static/assets/images/{md5ext}`
- **Web Store**: Makes HTTP requests to webpack dev server
- **No assetHost**: Uses relative paths (same origin)
- **Webpack**: Serves files from `static/` directory

## Next Steps

1. **Download assets** (if not done):
   ```bash
   npm run download-assets
   ```

2. **Restart webpack**:
   ```bash
   npm start
   ```

3. **Test in browser**:
   - Open: `http://localhost:8601`
   - Try adding a sprite
   - Check browser console for errors
