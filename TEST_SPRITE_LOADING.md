# Test Sprite Loading

## Quick Test Steps

### 1. Ensure Webpack Dev Server is Running

```bash
cd eidtors/scratch/scratch-gui
npm start
```

Wait for: `webpack compiled successfully`

### 2. Open Scratch GUI

Open browser: `http://localhost:8601`

### 3. Open Browser Console (F12)

Keep console open to see logs and errors.

### 4. Test Asset URL Directly

In a new browser tab, test if webpack is serving assets:

```
http://localhost:8601/static/assets/images/809d9b47347a6af2860e7a3a35bce057.svg
```

**Expected**: Should see the SVG image (Abby sprite)
**If 404**: Webpack dev server isn't serving static files correctly

### 5. Add a Sprite

1. Click the **"Choose a Sprite"** button (cat icon with +)
2. Select any sprite (e.g., "Abby")
3. Watch the browser console for logs

**Expected Console Logs**:
```
Storage.getAssetGetConfig: Returning static path: /static/assets/images/809d9b47347a6af2860e7a3a35bce057.svg
SpriteLibrary: handleItemSelect called with item: {...}
SpriteLibrary: Adding sprite: Abby
SpriteLibrary: Calling vm.addSprite...
SpriteLibrary: Sprite added successfully
```

**If Error**: Check the error message in console

### 6. Check Network Tab

In browser DevTools → Network tab:
- Filter by "svg" or "png"
- Look for requests to `/static/assets/images/...`
- Check if they return 200 (success) or 404 (not found)

## Troubleshooting

### Issue: Asset URL Returns 404

**Problem**: Webpack dev server not serving static files

**Fix**:
1. Stop webpack (Ctrl+C)
2. Check if `build/static/assets/` directory exists
3. Restart: `npm start`
4. Webpack should copy `static/assets/` to `build/static/assets/`

### Issue: Sprite Shows Question Mark

**Problem**: Asset not loading

**Check**:
1. Browser console for errors
2. Network tab for failed requests
3. Verify asset file exists: `static/assets/images/{md5ext}`

### Issue: Console Shows Wrong Path

**Problem**: Storage returning incorrect path

**Check**:
- Console log: `Storage.getAssetGetConfig: Returning static path: ...`
- Should be: `/static/assets/images/{md5ext}`
- If different, check `storage.js` configuration

## Expected Behavior

✅ **Success**: Sprite appears on stage, no errors in console
❌ **Failure**: Question mark icon, errors in console, 404 in network tab

## Test Assets

Test with these known assets:

- **Abby sprite**: `809d9b47347a6af2860e7a3a35bce057.svg`
- **Cat sprite**: `bcf454acf82e4504149f7ffe07081dbc.svg`
- **Gobo sprite**: `c1d7d5e5e3b0b5e5e5e5e5e5e5e5e5e5.svg`

Test URL format:
```
http://localhost:8601/static/assets/images/{md5ext}
```
