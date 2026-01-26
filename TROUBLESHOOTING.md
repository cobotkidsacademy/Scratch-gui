# Troubleshooting Guide

## Issue: Assets Showing as Question Marks

When assets appear as question marks (❓) in Scratch, it means the asset failed to load.

### Common Causes

1. **Asset server not running**
2. **Assets not downloaded yet**
3. **Wrong file path or missing files**
4. **CORS issues**
5. **Network errors**

### Solutions

#### 1. Check Asset Server is Running

Make sure the asset server is running:

```bash
cd eidtors/scratch/scratch-gui
npm run serve-assets
```

You should see:
```
Scratch Assets Local Server running on http://localhost:8603
```

#### 2. Check Assets are Downloaded

Verify assets exist in the directory:

```bash
# Check images
ls static/assets/images/ | head -10

# Check sounds
ls static/assets/sounds/ | head -10
```

If directories are empty, download assets:

```bash
npm run download-assets
```

#### 3. Test Asset URL Directly

Open a browser and test an asset URL:

```
http://localhost:8603/internalapi/asset/809d9b47347a6af2860e7a3a35bce057.svg/get/
```

- **If it works**: Asset server is working, check browser console for other errors
- **If 404**: Asset not downloaded, run `npm run download-assets`
- **If connection refused**: Asset server not running

#### 4. Check Browser Console

Open browser DevTools (F12) and check:

- **404 errors**: Asset not found locally (will fallback to CDN)
- **CORS errors**: Check asset server CORS headers
- **Network errors**: Check if asset server is accessible

#### 5. Verify Storage Configuration

Check `src/lib/storage.js`:

```javascript
this.assetHost = 'http://localhost:8603';
```

Make sure it matches your asset server port.

#### 6. CDN Fallback

The asset server now automatically falls back to Scratch CDN if assets aren't found locally. This means:

- If asset exists locally → served from local server (fast)
- If asset missing locally → proxied from CDN (slower but works)

Check server logs to see which assets are being proxied.

## Issue: Webpack Dev Server Disconnecting

If you see `[webpack-dev-server] Disconnected!`:

### Causes

1. **Port conflict**
2. **Network issues**
3. **File system changes**
4. **Memory issues**

### Solutions

1. **Restart webpack dev server**:
   ```bash
   # Stop (Ctrl+C) and restart
   npm start
   ```

2. **Check for port conflicts**:
   - Make sure port 8601 is not used by another process
   - Check if asset server (8603) is running

3. **Clear cache and rebuild**:
   ```bash
   npm run clean
   npm start
   ```

4. **Check file watchers**:
   - Too many files can cause issues
   - Try excluding `node_modules` and `static/assets` from watching

## Issue: Assets Loading Slowly

### Solutions

1. **Download all assets locally**:
   ```bash
   npm run download-assets
   ```

2. **Check asset server is running**:
   - Local assets load much faster than CDN

3. **Verify assets are in correct location**:
   - Images: `static/assets/images/`
   - Sounds: `static/assets/sounds/`

## Issue: Some Assets Work, Others Don't

### Solutions

1. **Check specific asset exists**:
   ```bash
   # Find asset by md5ext
   find static/assets -name "809d9b47347a6af2860e7a3a35bce057.svg"
   ```

2. **Re-download failed assets**:
   ```bash
   # Check failed-assets.json
   cat static/assets/failed-assets.json
   
   # Re-run download (will skip existing, retry failed)
   npm run download-assets
   ```

3. **Check asset format in JSON**:
   - Verify `md5ext` matches actual filename
   - Check `dataFormat` is correct (svg, png, wav, etc.)

## Quick Diagnostic Checklist

- [ ] Asset server running on port 8603?
- [ ] Assets downloaded to `static/assets/`?
- [ ] Storage.js configured with correct assetHost?
- [ ] Browser console shows no CORS errors?
- [ ] Asset URLs are correct format?
- [ ] Files exist with correct names?

## Getting Help

If issues persist:

1. Check browser console for specific error messages
2. Check asset server logs for 404s or errors
3. Verify asset URLs in network tab
4. Test asset server directly in browser
5. Check if CDN fallback is working
