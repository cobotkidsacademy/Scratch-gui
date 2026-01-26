import {ScratchStorage} from 'scratch-storage';

import defaultProject from './default-project';

/**
 * Wrapper for ScratchStorage which adds default web sources.
 * @todo make this more configurable
 */
class Storage extends ScratchStorage {
    constructor () {
        super();
        // Use webpack dev server (port 8601) for assets - same origin, no CORS issues
        // Assets are served from /static/assets/ directory by webpack dev server
        this.assetHost = null; // null = use same origin (webpack dev server)
        console.log('[GUI.DEBUG] Storage constructor: Initialized - using webpack dev server (same origin)');
        
        // Intercept ALL network requests (fetch AND XMLHttpRequest) to monitor asset loading
        if (typeof window !== 'undefined') {
            // Intercept fetch
            if (window.fetch) {
                const originalFetch = window.fetch;
                window.fetch = (...args) => {
                    const url = args[0];
                    const options = args[1] || {};
                    
                    // Log all asset requests
                    if (typeof url === 'string' && (url.includes('/static/assets/') || url.includes('assets'))) {
                        const requestId = `fetch_${performance.now().toFixed(0)}`;
                        console.log('[GUI.DEBUG] ========================================');
                        console.log(`[GUI.DEBUG] FETCH REQUEST [${requestId}]`);
                        console.log('[GUI.DEBUG] URL:', url);
                        console.log('[GUI.DEBUG] Method:', options.method || 'GET');
                        console.log('[GUI.DEBUG] ========================================');
                        
                        const fetchPromise = originalFetch(...args);
                        
                        fetchPromise.then(
                            (response) => {
                                console.log(`[GUI.DEBUG] ✅ FETCH SUCCESS [${requestId}]`);
                                console.log('[GUI.DEBUG] Status:', response.status, response.statusText);
                                console.log('[GUI.DEBUG] URL:', url);
                            },
                            (error) => {
                                console.error(`[GUI.DEBUG] ❌ FETCH FAILED [${requestId}]`);
                                console.error('[GUI.DEBUG] URL:', url);
                                console.error('[GUI.DEBUG] Error:', error);
                            }
                        );
                        
                        return fetchPromise;
                    }
                    
                    return originalFetch(...args);
                };
                console.log('[GUI.DEBUG] Fetch interceptor installed');
            }
            
            // Intercept XMLHttpRequest (scratch-storage might use this)
            if (window.XMLHttpRequest) {
                const OriginalXHR = window.XMLHttpRequest;
                window.XMLHttpRequest = function(...args) {
                    const xhr = new OriginalXHR(...args);
                    const originalOpen = xhr.open;
                    
                    xhr.open = function(method, url, ...rest) {
                        // Log asset requests
                        if (typeof url === 'string' && (url.includes('/static/assets/') || url.includes('assets'))) {
                            const requestId = `xhr_${performance.now().toFixed(0)}`;
                            console.log('[GUI.DEBUG] ========================================');
                            console.log(`[GUI.DEBUG] XMLHttpRequest [${requestId}]`);
                            console.log('[GUI.DEBUG] Method:', method);
                            console.log('[GUI.DEBUG] URL:', url);
                            console.log('[GUI.DEBUG] ========================================');
                            
                            xhr.addEventListener('load', function() {
                                console.log(`[GUI.DEBUG] ✅ XHR SUCCESS [${requestId}]`);
                                console.log('[GUI.DEBUG] Status:', xhr.status, xhr.statusText);
                                console.log('[GUI.DEBUG] URL:', url);
                            });
                            
                            xhr.addEventListener('error', function() {
                                console.error(`[GUI.DEBUG] ❌ XHR FAILED [${requestId}]`);
                                console.error('[GUI.DEBUG] URL:', url);
                                console.error('[GUI.DEBUG] Status:', xhr.status);
                            });
                            
                            xhr.addEventListener('timeout', function() {
                                console.error(`[GUI.DEBUG] ⏱️ XHR TIMEOUT [${requestId}]`);
                                console.error('[GUI.DEBUG] URL:', url);
                            });
                        }
                        
                        return originalOpen.call(this, method, url, ...rest);
                    };
                    
                    return xhr;
                };
                console.log('[GUI.DEBUG] XMLHttpRequest interceptor installed');
            }
        }
        
        // CRITICAL: Intercept loadCostume calls via VM patching
        // Store reference to VM for backdrop asset injection
        this._vmReference = null;
        this.setVMReference = (vm) => {
            this._vmReference = vm;
            // Patch VM.addBackdrop to inject asset before loadCostume is called
            if (vm && vm.addBackdrop) {
                const originalAddBackdrop = vm.addBackdrop.bind(vm);
                vm.addBackdrop = function(md5ext, backdropObject) {
                    // Check if this backdrop has a pending asset
                    const backdropMd5 = md5ext.split('.')[0];
                    const pendingBackdrop = window._pendingBackdrops?.get(backdropMd5);
                    
                    if (pendingBackdrop && !backdropObject.asset) {
                        console.log('[GUI.DEBUG] 🔧 INJECTING asset into backdrop BEFORE addBackdrop()');
                        backdropObject.asset = pendingBackdrop.asset;
                        backdropObject.assetId = pendingBackdrop.asset.assetId;
                        // Clean up pending backdrop
                        window._pendingBackdrops.delete(backdropMd5);
                    }
                    
                    return originalAddBackdrop.call(this, md5ext, backdropObject);
                };
                console.log('[GUI.DEBUG] ✅ Patched VM.addBackdrop() to inject asset');
            }
        };
        
        // Intercept load method - check cache first, then fallback to original
        const originalLoad = this.load.bind(this);
        this.load = (assetType, id, dataFormat) => {
            const callTime = performance.now();
            const callId = `load_${callTime.toFixed(0)}`;
            
            // CRITICAL FIX: Check MULTIPLE cache locations before making network request
            // This prevents hanging when assets are already cached
            
            // CRITICAL: Check cache FIRST - try multiple methods to find cached asset
            console.log(`[GUI.DEBUG] Storage.load [${callId}] - Checking cache for: ${assetType.name || assetType}_${id}.${dataFormat}`);
            
            // Method 0: Check global backdrop asset map FIRST (most reliable for backdrops)
            // Try ALL possible key formats
            if (window._backdropAssetMap) {
                const possibleKeys = [
                    id,
                    `${id}.${dataFormat}`,
                    `${id}.svg`,
                    `${id}.png`,
                    `${id}.jpg`,
                    `${id}.jpeg`,
                    `${id}.gif`
                ];
                
                for (const key of possibleKeys) {
                    const backdropAsset = window._backdropAssetMap.get(key);
                    if (backdropAsset && backdropAsset.data) {
                        const cacheTime = performance.now() - callTime;
                        console.log(`[GUI.DEBUG] ✅ Storage.load [${callId}] - FOUND IN GLOBAL BACKDROP MAP (${cacheTime.toFixed(2)}ms)`);
                        console.log(`[GUI.DEBUG] Found with key: ${key}, data length: ${backdropAsset.data.length || 'N/A'}`);
                        return Promise.resolve(backdropAsset);
                    }
                }
            }
            
            // Method 1: Check builtinHelper cache (primary)
            try {
                const cachedAsset = this.builtinHelper._get(assetType, id);
                if (cachedAsset && cachedAsset.data) {
                    const cacheTime = performance.now() - callTime;
                    console.log(`[GUI.DEBUG] ✅ Storage.load [${callId}] - FOUND IN builtinHelper CACHE (${cacheTime.toFixed(2)}ms)`);
                    console.log(`[GUI.DEBUG] Cached asset data length: ${cachedAsset.data.length || 'N/A'}`);
                    return Promise.resolve(cachedAsset);
                }
            } catch (e) {
                console.log(`[GUI.DEBUG] builtinHelper._get failed:`, e.message);
            }
            
            // Method 2: Check our custom asset cache (backup)
            if (this._assetCache) {
                const cacheKey = `${assetType.name || assetType}_${id}`;
                const cachedAsset = this._assetCache[cacheKey];
                if (cachedAsset && cachedAsset.data) {
                    const cacheTime = performance.now() - callTime;
                    console.log(`[GUI.DEBUG] ✅ Storage.load [${callId}] - FOUND IN _assetCache (${cacheTime.toFixed(2)}ms)`);
                    console.log(`[GUI.DEBUG] Cache key: ${cacheKey}, data length: ${cachedAsset.data.length || 'N/A'}`);
                    return Promise.resolve(cachedAsset);
                } else {
                    console.log(`[GUI.DEBUG] _assetCache check: key=${cacheKey}, found=${!!cachedAsset}`);
                }
            } else {
                console.log(`[GUI.DEBUG] _assetCache does not exist`);
            }
            
            // Method 3: Try to get from builtinHelper internal storage
            try {
                if (this.builtinHelper && this.builtinHelper._assets) {
                    // Try different key formats
                    const keyFormats = [
                        `${assetType.name || assetType}_${id}`,
                        `${assetType}_${id}`,
                        `${id}`
                    ];
                    
                    for (const assetKey of keyFormats) {
                        const cachedData = this.builtinHelper._assets[assetKey];
                        if (cachedData && cachedData.data) {
                            // Recreate asset from cached data
                            const asset = this.createAsset(assetType, dataFormat, cachedData.data, id, false);
                            const cacheTime = performance.now() - callTime;
                            console.log(`[GUI.DEBUG] ✅ Storage.load [${callId}] - FOUND IN _assets CACHE (${cacheTime.toFixed(2)}ms)`);
                            console.log(`[GUI.DEBUG] Cache key: ${assetKey}, data length: ${cachedData.data.length || 'N/A'}`);
                            return Promise.resolve(asset);
                        }
                    }
                }
            } catch (e) {
                console.log(`[GUI.DEBUG] _assets cache check failed:`, e.message);
            }
            
            console.log(`[GUI.DEBUG] ❌ Storage.load [${callId}] - NOT FOUND IN ANY CACHE - will make network request`);
            
            console.log('[GUI.DEBUG] ========================================');
            console.log(`[GUI.DEBUG] Storage.load CALLED [${callId}] - NOT IN CACHE`);
            console.log('[GUI.DEBUG] Parameters:', {
                assetType: assetType,
                id: id,
                dataFormat: dataFormat,
                timestamp: callTime.toFixed(2) + 'ms'
            });
            
            // Wrap original load with timeout protection
            const loadPromise = originalLoad(assetType, id, dataFormat);
            
            // Create a timeout wrapper that forces resolution if promise hangs
            const timeoutPromise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    const elapsed = performance.now() - callTime;
                    console.error(`[GUI.DEBUG] ❌ Storage.load [${callId}] TIMEOUT after ${elapsed.toFixed(2)}ms`);
                    console.error('[GUI.DEBUG] Promise is hanging - attempting cache fallback...');
                    
                    // Try ALL cache methods one more time
                    let fallbackAsset = null;
                    
                    // Try global backdrop map
                    if (window._backdropAssetMap) {
                        const possibleKeys = [id, `${id}.${dataFormat}`, `${id}.svg`, `${id}.png`, `${id}.jpg`];
                        for (const key of possibleKeys) {
                            fallbackAsset = window._backdropAssetMap.get(key);
                            if (fallbackAsset && fallbackAsset.data) break;
                        }
                    }
                    
                    // Try builtinHelper
                    if (!fallbackAsset) {
                        try {
                            fallbackAsset = this.builtinHelper._get(assetType, id);
                        } catch (e) {
                            // Ignore
                        }
                    }
                    
                    // Try custom cache
                    if (!fallbackAsset && this._assetCache) {
                        const cacheKey = `${assetType.name || assetType}_${id}`;
                        fallbackAsset = this._assetCache[cacheKey];
                    }
                    
                    if (fallbackAsset && fallbackAsset.data) {
                        console.warn(`[GUI.DEBUG] ✅ FALLBACK SUCCESS - Found in cache, returning cached asset`);
                        resolve(fallbackAsset);
                    } else {
                        console.error(`[GUI.DEBUG] ❌ FALLBACK FAILED - No cached asset found`);
                        // Create a dummy asset to prevent complete failure
                        const dummyAsset = this.createAsset(assetType, dataFormat, new Uint8Array(0), id, false);
                        console.error(`[GUI.DEBUG] Returning empty asset to prevent hang`);
                        resolve(dummyAsset);
                    }
                }, 10000); // 10 second timeout
                
                // If original promise resolves/rejects, clear timeout and use that result
                loadPromise.then(
                    (asset) => {
                        clearTimeout(timeout);
                        resolve(asset);
                    },
                    (error) => {
                        clearTimeout(timeout);
                        reject(error);
                    }
                );
            });
            
            // Track promise resolution for logging
            timeoutPromise.then(
                (asset) => {
                    const resolveTime = performance.now();
                    const duration = resolveTime - callTime;
                    console.log(`[GUI.DEBUG] ✅ Storage.load [${callId}] RESOLVED in ${duration.toFixed(2)}ms`);
                    console.log('[GUI.DEBUG] Asset result:', {
                        assetId: asset?.assetId,
                        md5ext: asset?.md5ext,
                        dataLength: asset?.data?.length || 'N/A',
                        hasData: !!asset?.data
                    });
                },
                (error) => {
                    const rejectTime = performance.now();
                    const duration = rejectTime - callTime;
                    console.error(`[GUI.DEBUG] ❌ Storage.load [${callId}] REJECTED after ${duration.toFixed(2)}ms`);
                    console.error('[GUI.DEBUG] Error:', error.message);
                }
            );
            
            return timeoutPromise;
        };
        
        // CRITICAL FIX: Patch WebHelper.load() to prevent hanging promises
        // The WebHelper.load() method can hang if network requests fail silently
        if (this.webHelper && this.webHelper.load) {
            const originalWebHelperLoad = this.webHelper.load.bind(this.webHelper);
            this.webHelper.load = function(assetType, id, dataFormat) {
                const callTime = performance.now();
                const callId = `webHelper_${callTime.toFixed(0)}`;
                console.log(`[GUI.DEBUG] WebHelper.load [${callId}] called: ${assetType.name || assetType}_${id}.${dataFormat}`);
                
                // Wrap with timeout protection
                const originalPromise = originalWebHelperLoad(assetType, id, dataFormat);
                const timeoutPromise = new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        console.error(`[GUI.DEBUG] ❌ WebHelper.load [${callId}] TIMEOUT after 10s`);
                        console.error('[GUI.DEBUG] WebHelper promise is hanging - rejecting with error');
                        reject(new Error(`WebHelper.load timeout for ${id}.${dataFormat}`));
                    }, 10000);
                    
                    originalPromise.then(
                        (asset) => {
                            clearTimeout(timeout);
                            const duration = performance.now() - callTime;
                            console.log(`[GUI.DEBUG] ✅ WebHelper.load [${callId}] RESOLVED in ${duration.toFixed(2)}ms`);
                            resolve(asset);
                        },
                        (error) => {
                            clearTimeout(timeout);
                            const duration = performance.now() - callTime;
                            console.error(`[GUI.DEBUG] ❌ WebHelper.load [${callId}] REJECTED after ${duration.toFixed(2)}ms`);
                            reject(error);
                        }
                    );
                });
                
                return timeoutPromise;
            };
            console.log('[GUI.DEBUG] ✅ WebHelper.load() patched with timeout protection');
        }
        
        this.cacheDefaultProject();
  }
    addOfficialScratchWebStores () {
        // Using webpack dev server for assets (same origin, no external server needed)
        // Assets are served from /static/assets/images/ and /static/assets/sounds/
        console.log('[GUI.DEBUG] Storage.addOfficialScratchWebStores: Starting...');
        console.log('[GUI.DEBUG] Using webpack dev server for assets (same origin)');
        console.log('[GUI.DEBUG] Asset types:', {
            ImageVector: this.AssetType.ImageVector,
            ImageBitmap: this.AssetType.ImageBitmap,
            Sound: this.AssetType.Sound,
            Project: this.AssetType.Project
        });
        
        this.addWebStore(
            [this.AssetType.Project],
            this.getProjectGetConfig.bind(this),
            this.getProjectCreateConfig.bind(this),
            this.getProjectUpdateConfig.bind(this)
        );
        console.log('[GUI.DEBUG] Project web store added');
        
        // Add web store for images and sounds using asset server
        this.addWebStore(
            [this.AssetType.ImageVector, this.AssetType.ImageBitmap, this.AssetType.Sound],
            this.getAssetGetConfig.bind(this),
            this.getAssetCreateConfig.bind(this),
            this.getAssetCreateConfig.bind(this)
        );
        console.log('[GUI.DEBUG] Image/Sound web store added with getAssetGetConfig');
        
        // Add web store for extension music sounds (using local path)
        this.addWebStore(
            [this.AssetType.Sound],
            asset => {
                const url = `static/extension-assets/scratch3_music/${asset.assetId}.${asset.dataFormat}`;
                console.log('[GUI.DEBUG] Extension music sound URL:', url);
                return url;
            }
        );
        console.log('[GUI.DEBUG] Extension music web store added');
        console.log('[GUI.DEBUG] Storage.addOfficialScratchWebStores: Complete - assets use webpack dev server');
    }
    setProjectHost (projectHost) {
        this.projectHost = projectHost;
    }
    setProjectToken (projectToken) {
        this.projectToken = projectToken;
    }
    getProjectGetConfig (projectAsset) {
        const path = `${this.projectHost}/${projectAsset.assetId}`;
        const qs = this.projectToken ? `?token=${this.projectToken}` : '';
        return path + qs;
    }
    getProjectCreateConfig () {
        return {
            url: `${this.projectHost}/`,
            withCredentials: true
        };
    }
    getProjectUpdateConfig (projectAsset) {
        return {
            url: `${this.projectHost}/${projectAsset.assetId}`,
            withCredentials: true
        };
    }
    setAssetHost (assetHost) {
        // Ignore external assetHost - always use webpack dev server (same origin)
        // This prevents connectivity issues and CORS problems
        this.assetHost = null;
        console.log('[GUI.DEBUG] Storage.setAssetHost: Ignoring external host, using webpack dev server (same origin)');
    }
    getAssetGetConfig (asset) {
        // Use webpack dev server static files (same origin, no external server needed)
        // VM calls: storage.load(assetType, md5, ext)
        // Asset object: { assetId: md5, dataFormat: ext }
        // Format: /static/assets/images/{md5ext} or /static/assets/sounds/{md5ext}
        
        const assetId = asset.assetId || asset.md5ext?.split('.')[0] || 'unknown';
        const dataFormat = asset.dataFormat || asset.md5ext?.split('.')[1] || 'svg';
        
        // If md5ext is provided, use it directly (e.g., "809d9b47347a6af2860e7a3a35bce057.svg")
        const md5ext = asset.md5ext || `${assetId}.${dataFormat}`;
        
        // Determine if it's a sound or image
        const isSound = ['wav', 'mp3', 'ogg'].includes(dataFormat.toLowerCase());
        const subDir = isSound ? 'sounds' : 'images';
        
        // Use relative path - webpack dev server serves from /static/
        const assetUrl = `/static/assets/${subDir}/${md5ext}`;
        const fullUrl = window.location.origin + assetUrl;
        
        // DEBUG: Test asset URL immediately to verify it exists
        fetch(assetUrl, { method: 'HEAD', cache: 'no-cache' })
            .then(response => {
                if (response.ok) {
                    console.log(`[GUI.DEBUG] ✅ Asset URL verified: ${assetUrl} (${response.status})`);
                } else {
                    console.error(`[GUI.DEBUG] ❌ Asset URL failed: ${assetUrl} (${response.status} ${response.statusText})`);
                }
            })
            .catch(error => {
                console.error(`[GUI.DEBUG] ❌ Asset URL error: ${assetUrl}`, error);
            });
        
        // DEBUG: Comprehensive logging
        console.log('[GUI.DEBUG] ========================================');
        console.log('[GUI.DEBUG] Storage.getAssetGetConfig CALLED');
        console.log('[GUI.DEBUG] Input asset:', JSON.stringify(asset, null, 2));
        console.log('[GUI.DEBUG] Constructed:', {
            assetId: assetId,
            dataFormat: dataFormat,
            md5ext: md5ext,
            isSound: isSound,
            subDir: subDir
        });
        console.log('[GUI.DEBUG] Output URL:', assetUrl);
        console.log('[GUI.DEBUG] Full URL:', fullUrl);
        console.log('[GUI.DEBUG] Stack trace:', new Error().stack.split('\n').slice(1, 6).join('\n'));
        console.log('[GUI.DEBUG] ========================================');
        
        return assetUrl;
    }
    getAssetCreateConfig (asset) {
        // Use asset server format for asset creation (though assets aren't typically created this way)
        const assetHost = this.assetHost || 'http://localhost:8603';
        return {
            // There is no such thing as updating assets, but storage assumes it
            // should update if there is an assetId, and the asset store uses the
            // assetId as part of the create URI. So, force the method to POST.
            // Then when storage finds this config to use for the "update", still POSTs
            method: 'post',
            url: `${assetHost}/internalapi/asset/${asset.assetId}.${asset.dataFormat}/get/`,
            withCredentials: true
        };
    }
    setTranslatorFunction (translator) {
        this.translator = translator;
        this.cacheDefaultProject();
    }
    cacheDefaultProject () {
        const defaultProjectAssets = defaultProject(this.translator);
        defaultProjectAssets.forEach(asset => this.builtinHelper._store(
            this.AssetType[asset.assetType],
            this.DataFormat[asset.dataFormat],
            asset.data,
            asset.id
        ));
    }
}

const storage = new Storage();

export default storage;
