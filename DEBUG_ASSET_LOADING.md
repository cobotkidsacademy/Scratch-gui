# Debugging Asset Loading

## Current Status

- ✅ Assets downloaded: 973 images, 355 sounds
- ✅ Webpack configured to copy `static/assets/`
- ✅ Storage returns paths: `/static/assets/images/{md5ext}`
- ❌ Sprites not displaying when clicked

## Debugging Steps

### 1. Check Browser Console

Open browser console (F12) and look for:

1. **Storage logs**: Should see `Storage.getAssetGetConfig: Returning static path: ...`
2. **Network requests**: Check what URLs are being requested
3. **404 errors**: If assets return 404, the path is wrong or file doesn't exist
4. **CORS errors**: Shouldn't happen (same origin), but check anyway

### 2. Test Asset URL Directly

In browser, try accessing an asset directly:

```
http://localhost:8601/static/assets/images/809d9b47347a6af2860e7a3a35bce057.svg
```

- **If 404**: Webpack dev server isn't serving static files correctly
- **If works**: Asset exists, issue is in how ScratchStorage loads it

### 3. Check Actual Asset Filename

Verify the asset exists with exact filename:

```powershell
# In PowerShell
cd eidtors/scratch/scratch-gui
Get-ChildItem "static/assets/images" -Filter "809d9b47347a6af2860e7a3a35bce057.svg"
```

### 4. Check Webpack Dev Server Configuration

The webpack dev server should serve files from `build/static/` directory. Check if:
- Files are copied to `build/static/assets/` during build
- Dev server is configured to serve static files

### 5. Verify ScratchStorage is Using Correct Paths

In browser console, check:
```javascript
// Check what storage is configured
console.log(storage.assetHost); // Should be null

// Check what path is returned for an asset
const testAsset = {assetId: '809d9b47347a6af2860e7a3a35bce057', dataFormat: 'svg'};
console.log(storage.getAssetGetConfig(testAsset)); // Should return /static/assets/images/...
```

## Common Issues

### Issue 1: Webpack Dev Server Not Serving Static Files

**Symptom**: 404 errors for `/static/assets/...`

**Fix**: Ensure webpack dev server is configured to serve static files from `build/` directory. The `CopyWebpackPlugin` should copy files during dev server startup.

### Issue 2: Path Mismatch

**Symptom**: Asset exists but wrong path is requested

**Fix**: Check that `getAssetGetConfig` returns the correct path format. Should be `/static/assets/images/{md5ext}` (absolute path from root).

### Issue 3: Asset Not Found

**Symptom**: 404 for specific asset

**Fix**: Verify asset exists with exact filename. Check `sprites.json` to see what `md5ext` is expected.

### Issue 4: ScratchStorage Using Wrong URL

**Symptom**: Requests going to wrong server (e.g., CDN instead of localhost)

**Fix**: Ensure `assetHost` is `null` and `setAssetHost` is not being called with external URL.

## Next Steps

1. **Check browser console** for actual errors
2. **Test asset URL directly** in browser
3. **Verify webpack is serving static files** from build directory
4. **Check network tab** to see what URLs are being requested
