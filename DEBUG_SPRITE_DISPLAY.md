# Debugging Sprite Display on Stage

## Issue
Sprites are being added but not displaying instantly on the stage.

## Debugging Features Added

### 1. Performance Timing
- Tracks how long sprite addition takes
- Logs start and end times
- Helps identify if delays are in asset loading or rendering

### 2. Renderer Update Forcing
- Calls `renderer.draw()` immediately after sprite addition
- Emits `targetsUpdate` event to notify UI components
- Ensures renderer is aware of new sprite

### 3. Sprite Verification
- Checks if sprite was actually added to VM targets
- Verifies sprite visibility and position
- Checks if costumes are loaded
- Re-checks after 500ms delay to catch async asset loading

### 4. Detailed Console Logging
- Timestamped logs for asset loading
- Step-by-step sprite addition process
- Error details if something fails

## How to Use

1. **Open Browser Console** (F12)
2. **Add a Sprite** from the library
3. **Watch Console Logs** - you'll see:
   ```
   SpriteLibrary: Starting sprite addition at [timestamp]
   Storage.getAssetGetConfig: Returning full URL: ...
   SpriteLibrary: Sprite added successfully in [X]ms
   SpriteLibrary: Forcing renderer update...
   SpriteLibrary: Sprite found on stage: [name]
   SpriteLibrary: [After 500ms] Sprite still on stage: [name]
   ```

## What to Look For

### If Sprite Doesn't Appear:

1. **Check Timing**:
   - If addition takes > 1000ms, assets might be loading slowly
   - If < 100ms, assets are fast but rendering might be issue

2. **Check Sprite Status**:
   - Is sprite in targets? (Should see "Sprite found on stage")
   - Is sprite visible? (Should be `true`)
   - Does sprite have costumes? (Should see costume count > 0)

3. **Check Asset Loading**:
   - Look for `Storage.getAssetGetConfig` logs
   - Check Network tab for asset requests
   - Verify assets return 200 (not 404)

4. **Check Renderer**:
   - Should see "Renderer draw() called"
   - Check if renderer.draw() is being called multiple times
   - Verify no errors in console

## Common Issues

### Issue 1: Assets Not Loading
**Symptom**: No `Storage.getAssetGetConfig` logs or 404 errors
**Fix**: Check webpack is serving static files correctly

### Issue 2: Sprite Added But Not Visible
**Symptom**: Sprite in targets but `visible: false`
**Fix**: Check sprite initialization code

### Issue 3: Costumes Not Loaded
**Symptom**: Sprite has 0 costumes or costume.skinId is null
**Fix**: Asset loading might be async - wait for assets to load

### Issue 4: Renderer Not Updating
**Symptom**: No "Renderer draw() called" log
**Fix**: Renderer might not be attached - check VM setup

## Next Steps

Based on console logs, we can:
1. Identify where the delay occurs
2. Add asset preloading if needed
3. Fix renderer update timing
4. Optimize sprite addition process
