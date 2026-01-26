# Test Before Implementing - Asset Loading

## Current Issue
Sprites and backdrops are refusing to add. Need to test the method before implementing fixes.

## Test Plan

### Step 1: Test Asset URL Access
Open this test page in browser:
```
http://localhost:8601/test-asset-loading.html
```

This will test:
- ✅ If webpack dev server is serving static assets
- ✅ If asset URLs are correct format
- ✅ If multiple assets are accessible
- ✅ If URL generation logic matches expected format

### Step 2: Test in Browser Console
Open browser console (F12) and run:

```javascript
// Test 1: Check if asset is accessible
fetch('http://localhost:8601/static/assets/images/809d9b47347a6af2860e7a3a35bce057.svg')
  .then(r => r.ok ? console.log('✅ Asset accessible') : console.error('❌ Asset not accessible:', r.status))
  .catch(e => console.error('❌ Error:', e));

// Test 2: Check storage configuration
// Open Scratch GUI and check console for:
// - Storage.getAssetGetConfig logs
// - What URLs are being generated
// - Any errors when adding sprite

// Test 3: Check what vm.addSprite receives
// When adding a sprite, check console for:
// - SpriteLibrary: Item JSON
// - What md5ext values are in the sprite data
// - Any validation errors
```

### Step 3: Check Browser Network Tab
1. Open Scratch GUI: `http://localhost:8601`
2. Open DevTools → Network tab
3. Try to add a sprite
4. Look for:
   - What URLs are being requested
   - HTTP status codes (200 = success, 404 = not found)
   - Any CORS errors
   - Any failed requests

### Step 4: Verify Storage Configuration
Check browser console for storage logs:
```javascript
// Should see logs like:
// Storage.getAssetGetConfig: Returning full URL: http://localhost:8601/static/assets/images/...
```

## Expected Results

### ✅ Working Configuration Should Show:
1. **Asset URLs**: `http://localhost:8601/static/assets/images/{md5ext}`
2. **HTTP Status**: 200 OK for asset requests
3. **Storage Logs**: Full URLs with correct format
4. **No CDN Requests**: No requests to `cdn.assets.scratch.mit.edu`

### ❌ Problems to Look For:
1. **404 Errors**: Assets not found at expected URLs
2. **Wrong URL Format**: URLs don't match expected pattern
3. **CORS Errors**: Cross-origin issues
4. **Validation Errors**: Sprite data format issues
5. **Asset Loading Timeouts**: Assets taking too long to load

## What to Check Based on Test Results

### If Assets Return 404:
- **Problem**: Webpack dev server not serving static files
- **Fix**: Check `devServer.static` configuration in webpack.config.js
- **Verify**: Files exist in `static/assets/images/` directory

### If Assets Return 200 but Sprites Don't Add:
- **Problem**: Asset loading works but sprite addition fails
- **Check**: 
  - Sprite JSON format
  - md5ext values in sprite data
  - VM validation errors
  - Renderer errors

### If Wrong URL Format:
- **Problem**: Storage generating incorrect URLs
- **Fix**: Check `storage.js` `getAssetGetConfig` method
- **Verify**: URL format matches webpack dev server paths

### If CORS Errors:
- **Problem**: Cross-origin request issues
- **Fix**: Ensure assets served from same origin (localhost:8601)

## Next Steps After Testing

Based on test results:
1. **If assets accessible**: Focus on sprite addition logic
2. **If assets not accessible**: Fix webpack dev server configuration
3. **If wrong URLs**: Fix storage URL generation
4. **If validation errors**: Fix sprite data format

## Run Tests Now

1. **Open test page**: `http://localhost:8601/test-asset-loading.html`
2. **Check results**: See which tests pass/fail
3. **Share results**: Tell me what you see so I can fix the right issue
