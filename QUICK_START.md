# Quick Start Guide

## ✅ Current Status

Your asset server is running correctly! The health check shows:
- ✅ Server running on port 8603
- ✅ Assets directory configured: `static/assets`
- ✅ Endpoint available: `/internalapi/asset/:md5ext/get/`

## Setup Checklist

### 1. Asset Server ✅
```bash
npm run serve-assets
```
**Status**: Running (confirmed by health check)

### 2. Scratch GUI
```bash
npm start
```
**Status**: Should be running on http://localhost:8601

### 3. Assets Downloaded (Optional but Recommended)
```bash
npm run download-assets
```
**Status**: Run this to download all assets for faster loading

## Verification Steps

### Test Asset Server
1. Open browser: `http://localhost:8603`
   - Should see: `{"status":"ok","message":"Scratch Assets Local Server",...}` ✅

2. Test an asset URL:
   ```
   http://localhost:8603/internalapi/asset/809d9b47347a6af2860e7a3a35bce057.svg/get/
   ```
   - If downloaded: Should display/download the SVG
   - If not downloaded: Will proxy from CDN (slower but works)

### Test Scratch GUI
1. Open: `http://localhost:8601`
2. Try adding a sprite from the library
3. Check browser console (F12):
   - Should see asset URLs like: `http://localhost:8603/internalapi/asset/...`
   - No 404 errors
   - No question marks on sprites

## Current Configuration

- **Asset Host**: `http://localhost:8603` (configured in `storage.js`)
- **Asset Format**: `/internalapi/asset/{md5ext}/get/`
- **CDN Fallback**: Enabled (proxies from Scratch CDN if asset not found locally)
- **Library Source**: Built-in JSON files (no external API calls)

## Troubleshooting

If assets show as question marks:

1. **Check asset server is running**:
   ```bash
   # Should see: "Scratch Assets Local Server running on http://localhost:8603"
   npm run serve-assets
   ```

2. **Check browser console**:
   - Look for asset URLs
   - Check for 404 or CORS errors

3. **Test asset URL directly**:
   - Copy URL from console
   - Paste in browser
   - Should load or proxy from CDN

4. **Download assets** (if not done):
   ```bash
   npm run download-assets
   ```

## Next Steps

1. ✅ Asset server running
2. ⏭️ Start Scratch GUI (if not running)
3. ⏭️ Download assets (optional, for faster loading)
4. ⏭️ Test adding sprites/backdrops

Everything is configured correctly! Your Scratch app will now fetch assets from the local server.
