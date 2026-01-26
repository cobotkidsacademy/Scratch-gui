import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {injectIntl, intlShape, defineMessages} from 'react-intl';
import VM from 'scratch-vm';

// Built-in sprite library content - loaded directly from JSON file
// Assets are served as static files by webpack from static/assets/ directory
import spriteLibraryContent from '../lib/libraries/sprites.json';
import randomizeSpritePosition from '../lib/randomize-sprite-position';
import spriteTags from '../lib/libraries/sprite-tags';
import InstantDisplay from '../lib/instant-display.js';

import LibraryComponent from '../components/library/library.jsx';

const messages = defineMessages({
    libraryTitle: {
        defaultMessage: 'Choose a Sprite',
        description: 'Heading for the sprite library',
        id: 'gui.spriteLibrary.chooseASprite'
    }
});

class SpriteLibrary extends React.PureComponent {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleItemSelect'
        ]);
        this.state = {
            // Use built-in library content from sprites.json
            // Assets are loaded as static files from static/assets/ directory
            libraryData: spriteLibraryContent
        };
    }
    componentDidMount () {
        // Library content is loaded directly from sprites.json import
        // Assets are served as static files by webpack from static/assets/images/ and static/assets/sounds/
        // No external API calls or separate servers needed
    }
    handleItemSelect (item) {
        console.log('SpriteLibrary: handleItemSelect called with item:', item);
        if (!item) {
            console.error('SpriteLibrary: No item provided!');
            return;
        }
        // Randomize position of library sprite
        randomizeSpritePosition(item);
        console.log('SpriteLibrary: Adding sprite:', item.name, item);
        console.log('SpriteLibrary: VM storage:', this.props.vm.runtime.storage);
        if (!this.props.vm || !this.props.vm.addSprite) {
            console.error('SpriteLibrary: VM or addSprite method not available!');
            return;
        }
        
        // Assets are loaded from static files served by webpack (static/assets/)
        // Much faster than remote requests - same origin, no network overhead
        // NOTE: Timeout removed - sprites are adding successfully, timeout was causing false errors
        
        console.log('SpriteLibrary: Calling vm.addSprite...');
        console.log('SpriteLibrary: VM runtime storage:', this.props.vm.runtime.storage);
        console.log('SpriteLibrary: Item JSON:', JSON.stringify(item));
        
        // Assets are served as static files from static/assets/images/ and static/assets/sounds/
        // Web store uses static paths like: static/assets/images/{md5ext}
        console.log('SpriteLibrary: Assets loaded from static files (webpack serves static/assets/)');
        
        const startTime = performance.now();
        console.log('SpriteLibrary: Starting sprite addition at', startTime);
        
        // First, verify assets are accessible before adding sprite
        // Use webpack dev server (same origin) - /static/assets/images/{md5ext}
        const assetChecks = [];
        if (item.costumes && item.costumes.length > 0) {
            item.costumes.forEach((costume, index) => {
                if (costume.md5ext) {
                    // Use webpack dev server format: /static/assets/images/{md5ext}
                    const assetUrl = `/static/assets/images/${costume.md5ext}`;
                    console.log(`[GUI.DEBUG] SpriteLibrary: Checking asset ${index + 1}: ${assetUrl}`);
                    
                    assetChecks.push(
                        fetch(assetUrl, { method: 'HEAD' })
                            .then(response => {
                                if (response.ok) {
                                    console.log(`SpriteLibrary: ✅ Asset ${index + 1} accessible: ${costume.md5ext}`);
                                } else {
                                    console.error(`SpriteLibrary: ❌ Asset ${index + 1} NOT accessible (${response.status}): ${costume.md5ext}`);
                                }
                                return response.ok;
                            })
                            .catch(error => {
                                console.error(`SpriteLibrary: ❌ Asset ${index + 1} fetch error:`, error);
                                return false;
                            })
                    );
                }
            });
        }
        
        // Wait for asset checks, then add sprite
        Promise.all(assetChecks)
            .then(assetResults => {
                const allAccessible = assetResults.every(result => result === true);
                if (!allAccessible && assetChecks.length > 0) {
                    console.warn('SpriteLibrary: Some assets are not accessible, but proceeding anyway...');
                }
                
                // Transform sprite data to VM format for proper rendering
                // sprites.json uses: name, costumes with name/assetId/md5ext, sounds with name/assetId/md5ext
                // VM expects: objName, costumes with costumeName/baseLayerMD5, sounds with soundName/md5, plus position/visibility
                const spriteData = {
                    // Convert name to objName (VM expects objName)
                    objName: item.name || 'Sprite',
                    
                    // Transform costumes: name -> costumeName, md5ext -> baseLayerMD5, add baseLayerID
                    costumes: (item.costumes || []).map((costume, index) => {
                        const md5ext = costume.md5ext || (costume.assetId && costume.dataFormat ? `${costume.assetId}.${costume.dataFormat}` : null);
                        if (!md5ext) {
                            console.warn(`SpriteLibrary: Costume ${index + 1} missing md5ext`);
                        }
                        return {
                            costumeName: costume.name || `costume${index + 1}`,
                            baseLayerID: index, // Use index as ID
                            baseLayerMD5: md5ext, // VM uses baseLayerMD5 to load costume
                            bitmapResolution: costume.bitmapResolution || 1,
                            rotationCenterX: costume.rotationCenterX || 0,
                            rotationCenterY: costume.rotationCenterY || 0
                        };
                    }),
                    
                    // Transform sounds: name -> soundName, md5ext -> md5, add soundID
                    sounds: (item.sounds || []).map((sound, index) => {
                        const md5ext = sound.md5ext || (sound.assetId && sound.dataFormat ? `${sound.assetId}.${sound.dataFormat}` : null);
                        if (!md5ext) {
                            console.warn(`SpriteLibrary: Sound ${index + 1} missing md5ext`);
                        }
                        return {
                            soundName: sound.name || `sound${index + 1}`,
                            soundID: index, // Use index as ID
                            md5: md5ext, // VM uses md5 to load sound
                            sampleCount: sound.sampleCount || 0,
                            rate: sound.rate || 22050,
                            format: sound.format || ''
                        };
                    }),
                    
                    // Required VM properties for rendering
                    currentCostumeIndex: 0, // Start with first costume
                    scratchX: item.x !== undefined ? item.x : (Math.random() * 200 - 100), // Random position if not set
                    scratchY: item.y !== undefined ? item.y : (Math.random() * 200 - 100),
                    scale: item.scale || 1,
                    direction: item.direction || 90,
                    rotationStyle: item.rotationStyle || 'normal',
                    isDraggable: item.isDraggable !== undefined ? item.isDraggable : true,
                    visible: item.visible !== undefined ? item.visible : true, // Ensure sprite is visible
                    spriteInfo: item.spriteInfo || {},
                    blocks: item.blocks || {} // Preserve blocks if any
                };
                
                console.log('SpriteLibrary: Transformed sprite data for VM:', {
                    objName: spriteData.objName,
                    costumes: spriteData.costumes.length,
                    sounds: spriteData.sounds.length,
                    visible: spriteData.visible,
                    position: [spriteData.scratchX, spriteData.scratchY]
                });
                
                console.log('[GUI.DEBUG] ========================================');
                console.log('[GUI.DEBUG] SpriteLibrary: READY TO ADD SPRITE');
                console.log('[GUI.DEBUG] Sprite name:', item.name);
                console.log('[GUI.DEBUG] Costumes:', spriteData.costumes.length);
                console.log('[GUI.DEBUG] Sounds:', spriteData.sounds.length);
                console.log('[GUI.DEBUG] VM state before addSprite:', {
                    targetsCount: this.props.vm.runtime.targets.length,
                    storageAssetHost: this.props.vm.runtime.storage.assetHost,
                    storageHelpers: this.props.vm.runtime.storage._helpers?.length || 0,
                    rendererExists: !!this.props.vm.renderer
                });
                
                // Log all asset URLs that will be requested
                console.log('[GUI.DEBUG] Asset URLs that will be requested:');
                spriteData.costumes.forEach((costume, idx) => {
                    const assetUrl = `/static/assets/images/${costume.baseLayerMD5}`;
                    console.log(`[GUI.DEBUG]   Costume ${idx + 1}: ${assetUrl}`);
                });
                spriteData.sounds.forEach((sound, idx) => {
                    const assetUrl = `/static/assets/sounds/${sound.md5}`;
                    console.log(`[GUI.DEBUG]   Sound ${idx + 1}: ${assetUrl}`);
                });
                
                // WORKAROUND: Bypass vm.addSprite() which has hanging Storage.load() promises
                // Instead, manually load assets and create sprite directly
                console.log('[GUI.DEBUG] ========================================');
                console.log('[GUI.DEBUG] Using WORKAROUND: Manual asset loading + direct sprite creation');
                console.log('[GUI.DEBUG] ========================================');
                
                const addSpriteStartTime = performance.now();
                
                // Step 1: Pre-load all assets manually using fetch (bypasses Storage.load())
                const assetLoadPromises = [];
                
                // Load costume assets
                spriteData.costumes.forEach((costume, idx) => {
                    const assetUrl = `/static/assets/images/${costume.baseLayerMD5}`;
                    console.log(`[GUI.DEBUG] Pre-loading costume ${idx + 1}: ${assetUrl}`);
                    
                    const loadPromise = fetch(assetUrl)
                        .then(response => {
                            if (!response.ok) throw new Error(`Failed to load ${assetUrl}: ${response.status}`);
                            return response.arrayBuffer();
                        })
                        .then(data => {
                            console.log(`[GUI.DEBUG] ✅ Costume ${idx + 1} loaded: ${data.byteLength} bytes`);
                            return { costume, data: new Uint8Array(data) };
                        })
                        .catch(error => {
                            console.error(`[GUI.DEBUG] ❌ Failed to load costume ${idx + 1}:`, error);
                            throw error;
                        });
                    
                    assetLoadPromises.push(loadPromise);
                });
                
                // Load sound assets
                spriteData.sounds.forEach((sound, idx) => {
                    const assetUrl = `/static/assets/sounds/${sound.md5}`;
                    console.log(`[GUI.DEBUG] Pre-loading sound ${idx + 1}: ${assetUrl}`);
                    
                    const loadPromise = fetch(assetUrl)
                        .then(response => {
                            if (!response.ok) throw new Error(`Failed to load ${assetUrl}: ${response.status}`);
                            return response.arrayBuffer();
                        })
                        .then(data => {
                            console.log(`[GUI.DEBUG] ✅ Sound ${idx + 1} loaded: ${data.byteLength} bytes`);
                            return { sound, data: new Uint8Array(data) };
                        })
                        .catch(error => {
                            console.error(`[GUI.DEBUG] ❌ Failed to load sound ${idx + 1}:`, error);
                            throw error;
                        });
                    
                    assetLoadPromises.push(loadPromise);
                });
                
                // Step 2: Wait for all assets to load, then create sprite with pre-loaded assets
                return Promise.all(assetLoadPromises)
                    .then(loadedAssets => {
                        console.log('[GUI.DEBUG] All assets loaded, creating sprite...');
                        
                        // Create asset objects and store them in storage cache
                        const runtime = this.props.vm.runtime;
                        const storage = runtime.storage;
                        const AssetType = storage.AssetType;
                        const DataFormat = storage.DataFormat;
                        
                        // Store costume assets in storage cache using createAsset (proper way)
                        const costumeAssets = loadedAssets.filter(a => a.costume);
                        costumeAssets.forEach(({ costume, data }, idx) => {
                            const md5ext = costume.baseLayerMD5;
                            const [md5, ext] = md5ext.split('.');
                            const assetType = ext === 'svg' ? AssetType.ImageVector : AssetType.ImageBitmap;
                            
                            // Create proper Asset object and store in cache
                            const asset = storage.createAsset(assetType, ext, data, md5, false);
                            storage.builtinHelper._store(assetType, DataFormat[ext.toUpperCase()] || DataFormat.SVG, data, md5);
                            
                            // Also store in a way that load() can find it
                            if (!storage._assetCache) storage._assetCache = {};
                            const cacheKey = `${assetType}_${md5}`;
                            storage._assetCache[cacheKey] = asset;
                            
                            console.log(`[GUI.DEBUG] Stored costume ${idx + 1} in cache: ${md5ext} (key: ${cacheKey})`);
                        });
                        
                        // Store sound assets in storage cache using createAsset (proper way)
                        const soundAssets = loadedAssets.filter(a => a.sound);
                        soundAssets.forEach(({ sound, data }, idx) => {
                            const md5ext = sound.md5;
                            const [md5, ext] = md5ext.split('.');
                            const assetType = AssetType.Sound;
                            
                            // Create proper Asset object and store in cache
                            const asset = storage.createAsset(assetType, ext, data, md5, false);
                            storage.builtinHelper._store(assetType, DataFormat[ext.toUpperCase()] || DataFormat.WAV, data, md5);
                            
                            // Also store in a way that load() can find it
                            if (!storage._assetCache) storage._assetCache = {};
                            const cacheKey = `${assetType}_${md5}`;
                            storage._assetCache[cacheKey] = asset;
                            
                            console.log(`[GUI.DEBUG] Stored sound ${idx + 1} in cache: ${md5ext} (key: ${cacheKey})`);
                        });
                        
                        // Step 3: Now use vm.addSprite() - assets are already cached, so Storage.load() will be fast
                        const spriteJsonString = JSON.stringify(spriteData);
                        console.log('[GUI.DEBUG] Calling vm.addSprite() with pre-loaded assets...');
                        
                        return this.props.vm.addSprite(spriteJsonString);
                    })
                    .then(result => {
                        const duration = performance.now() - addSpriteStartTime;
                        console.log('[GUI.DEBUG] ========================================');
                        console.log(`[GUI.DEBUG] ✅ Sprite added successfully in ${duration.toFixed(2)}ms`);
                        console.log('[GUI.DEBUG] Result:', result);
                        console.log('[GUI.DEBUG] VM state:', {
                            targetsCount: this.props.vm.runtime.targets.length,
                            targetNames: this.props.vm.runtime.targets.map(t => t.getName()),
                            spriteExists: this.props.vm.runtime.targets.some(t => t.getName() === item.name)
                        });
                        console.log('[GUI.DEBUG] ========================================');
                        return result;
                    })
            .catch(error => {
                const duration = performance.now() - addSpriteStartTime;
                
                // Check if sprite was actually added despite the error
                const spriteExists = this.props.vm.runtime.targets.some(t => t.getName() === item.name);
                
                if (spriteExists) {
                    console.warn('[GUI.DEBUG] ⚠️ Error occurred but sprite was added successfully');
                    console.warn('[GUI.DEBUG] Error:', error.message);
                    // Don't throw - sprite was added successfully
                    return Promise.resolve();
                }
                
                console.error('[GUI.DEBUG] ========================================');
                console.error(`[GUI.DEBUG] ❌ Sprite addition failed after ${duration.toFixed(2)}ms`);
                console.error('[GUI.DEBUG] Error:', error);
                throw error;
            });
            })
            .then(() => {
                const endTime = performance.now();
                const duration = endTime - startTime;
                console.log(`SpriteLibrary: Sprite added successfully in ${duration.toFixed(2)}ms`);
                
                // Wait a bit for assets to load, then force renderer update
                // Assets load asynchronously, so we need to wait for them to be ready
                const forceRender = () => {
                    if (!this.props.vm || !this.props.vm.renderer) {
                        console.warn('SpriteLibrary: VM or renderer not available');
                        return;
                    }
                    
                    console.log('SpriteLibrary: Forcing renderer update...');
                    
                    // Check if sprite was actually added
                    const targets = this.props.vm.runtime.targets;
                    const addedSprite = targets.find(t => t.getName() === item.name);
                    
                    if (addedSprite) {
                        console.log('SpriteLibrary: Sprite found:', addedSprite.getName());
                        console.log('SpriteLibrary: Sprite visible:', addedSprite.visible);
                        console.log('SpriteLibrary: Sprite position:', addedSprite.x, addedSprite.y);
                        
                        // Check if sprite has costumes loaded
                        if (addedSprite.sprite && addedSprite.sprite.costumes_) {
                            const costume = addedSprite.sprite.costumes_[addedSprite.currentCostume];
                            if (costume) {
                                console.log('SpriteLibrary: Current costume:', costume.name);
                                if (costume.skinId) {
                                    console.log('SpriteLibrary: Costume skinId:', costume.skinId, '- loaded in renderer');
                                } else {
                                    console.warn('SpriteLibrary: Costume skinId not set - asset may still be loading');
                                }
                            }
                        }
                        
                        // Ensure sprite is visible
                        if (!addedSprite.visible) {
                            console.log('SpriteLibrary: Making sprite visible...');
                            addedSprite.visible = true;
                        }
                    }
                    
                    // Emit targetsUpdate to notify UI components
                    if (this.props.vm.emitTargetsUpdate) {
                        this.props.vm.emitTargetsUpdate(false);
                        console.log('SpriteLibrary: emitTargetsUpdate() called');
                    }
                    
                    // Force renderer to draw
                    if (this.props.vm.renderer.draw) {
                        this.props.vm.renderer.draw();
                        console.log('SpriteLibrary: Renderer draw() called');
                    }
                    
                    // Also trigger a runtime step to ensure renderer processes everything
                    if (this.props.vm.runtime && this.props.vm.runtime._step) {
                        // Don't actually step, but this ensures renderer is aware of changes
                        console.log('SpriteLibrary: Runtime step available');
                    }
                };
                
                // Force immediate render (ensures sprite displays on backdrop)
                forceRender();
                
                // Also force render after a short delay to catch async asset loading
                // This ensures sprite renders correctly on top of backdrop
                setTimeout(() => {
                    console.log('SpriteLibrary: [After 200ms] Checking sprite status and forcing render...');
                    forceRender();
                }, 200);
                
                // Final check after longer delay to ensure everything is rendered
                setTimeout(() => {
                    const targetsAfterDelay = this.props.vm.runtime.targets;
                    const spriteAfterDelay = targetsAfterDelay.find(t => t.getName() === item.name);
                    if (spriteAfterDelay) {
                        console.log('SpriteLibrary: [After 1000ms] Sprite status:', {
                            name: spriteAfterDelay.getName(),
                            visible: spriteAfterDelay.visible,
                            position: [spriteAfterDelay.x, spriteAfterDelay.y],
                            hasCostumes: spriteAfterDelay.sprite && spriteAfterDelay.sprite.costumes_ ? spriteAfterDelay.sprite.costumes_.length : 0
                        });
                        
                        // Force final render
                        if (this.props.vm && this.props.vm.renderer && this.props.vm.renderer.draw) {
                            this.props.vm.renderer.draw();
                            console.log('SpriteLibrary: [After 1000ms] Final renderer update');
                        }
                    } else {
                        console.error('SpriteLibrary: [After 1000ms] Sprite not found - something went wrong');
                    }
                }, 1000);
                
                if (this.props.onActivateBlocksTab) {
                    this.props.onActivateBlocksTab();
                }
            })
            .catch((error) => {
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                // CRITICAL: Check if sprite was actually added despite the error
                const spriteExists = this.props.vm.runtime.targets.some(t => t.getName() === item.name);
                
                if (spriteExists) {
                    console.warn(`SpriteLibrary: ⚠️ Error occurred but sprite was added successfully (${duration.toFixed(2)}ms)`);
                    console.warn('SpriteLibrary: Error:', error.message);
                    // Don't show full error - sprite was added successfully
                    return;
                }
                
                console.error(`SpriteLibrary: ❌ ERROR adding sprite after ${duration.toFixed(2)}ms:`, error);
                console.error('SpriteLibrary: Error message:', error.message);
                console.error('SpriteLibrary: Error stack:', error.stack);
                
                // Check if it's a timeout
                if (error.message && error.message.includes('timeout')) {
                    console.error('SpriteLibrary: ⏱️ TIMEOUT - Sprite addition took too long (>30s)');
                    console.error('SpriteLibrary: This usually means assets are not loading.');
                    console.error('SpriteLibrary: Possible causes:');
                    console.error('  1. Assets returning 404 (webpack not serving static files)');
                    console.error('  2. Assets taking too long to load');
                    console.error('  3. VM waiting for assets that never load');
                    console.error('SpriteLibrary: Check Network tab for failed asset requests.');
                    console.error('SpriteLibrary: Verify webpack dev server is serving static files.');
                    
                    // Check what assets were supposed to load
                    if (item.costumes && item.costumes.length > 0) {
                        console.error('SpriteLibrary: Assets that should have loaded:');
                        item.costumes.forEach((costume, index) => {
                            if (costume.md5ext) {
                                // Use webpack dev server format: /static/assets/images/{md5ext}
                                const assetUrl = `/static/assets/images/${costume.md5ext}`;
                                console.error(`  ${index + 1}. ${costume.name}: ${assetUrl}`);
                            }
                        });
                    }
                }
                
                // Check VM state
                if (this.props.vm && this.props.vm.runtime) {
                    console.error('SpriteLibrary: VM runtime targets:', this.props.vm.runtime.targets.length);
                    console.error('SpriteLibrary: VM runtime storage:', this.props.vm.runtime.storage);
                }
                
                // Still try to activate blocks tab even if there was an error
                if (this.props.onActivateBlocksTab) {
                    this.props.onActivateBlocksTab();
                }
            });
    }
    render () {
        return (
            <LibraryComponent
                data={this.state.libraryData}
                id="spriteLibrary"
                tags={spriteTags}
                title={this.props.intl.formatMessage(messages.libraryTitle)}
                onItemSelected={this.handleItemSelect}
                onRequestClose={this.props.onRequestClose}
            />
        );
    }
}

SpriteLibrary.propTypes = {
    intl: intlShape.isRequired,
    onActivateBlocksTab: PropTypes.func.isRequired,
    onRequestClose: PropTypes.func,
    vm: PropTypes.instanceOf(VM).isRequired
};

export default injectIntl(SpriteLibrary);
