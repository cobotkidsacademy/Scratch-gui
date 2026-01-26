# Fix CDN Errors - Complete Guide

## Issue
Still seeing CDN errors like:
```
GET https://cdn.assets.scratch.mit.edu/internalapi/asset/.../get/ net::ERR_INTERNET_DISCONNECTED
```

## Root Cause
The fix is applied in code, but browser is using **cached JavaScript** from before the fix.

## Solution

### Step 1: Restart Webpack Dev Server
The webpack dev server needs to rebuild with the new code:

```bash
# Stop webpack (Ctrl+C in terminal)
# Then restart:
cd eidtors/scratch/scratch-gui
npm start
```

Wait for: `webpack compiled successfully`

### Step 2: Hard Refresh Browser
Clear browser cache and reload:

**Windows/Linux:**
- `Ctrl + F5` (hard refresh)
- OR `Ctrl + Shift + R`

**Mac:**
- `Cmd + Shift + R`

### Step 3: Clear Browser Cache (If Hard Refresh Doesn't Work)

**Chrome:**
1. Press `F12` to open DevTools
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

**Or manually:**
1. `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
2. Select "Cached images and files"
3. Click "Clear data"
4. Refresh page

### Step 4: Verify Fix
After restarting and refreshing:
- Open browser console (F12)
- Look for Network tab
- Add a sprite or open sprite library
- Should see requests to: `http://localhost:8601/static/assets/images/...`
- Should NOT see requests to: `cdn.assets.scratch.mit.edu`

## What Was Fixed

The fix in `src/containers/library-item.jsx` changes:
- **Before**: `https://cdn.assets.scratch.mit.edu/internalapi/asset/${iconMd5}/get/`
- **After**: `http://localhost:8601/static/assets/images/${iconMd5}`

## If Errors Persist

1. **Check webpack compiled successfully** - Make sure new code was built
2. **Check browser console** - Look for any JavaScript errors
3. **Check Network tab** - See what URLs are actually being requested
4. **Try incognito/private window** - This bypasses cache completely

## Verification

After fix, you should see in Network tab:
- ✅ `http://localhost:8601/static/assets/images/...` (200 OK)
- ❌ NO `cdn.assets.scratch.mit.edu` requests

If you still see CDN requests, the browser hasn't loaded the new code yet.
