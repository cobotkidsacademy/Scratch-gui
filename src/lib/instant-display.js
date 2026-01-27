/**
 * Instant Display Library
 * Ensures sprites and backdrops display instantly when added
 */

class InstantDisplay {
    /**
     * Force immediate renderer update for a target
     * @param {VM} vm - Virtual machine instance
     * @param {Target} target - Target to render (sprite or stage)
     */
    static forceRender(vm, target) {
        if (!vm || !vm.runtime || !vm.runtime.renderer) return;
        
        const renderer = vm.runtime.renderer;
        
        // Update target drawable properties
        if (target && target.updateAllDrawableProperties) {
            target.updateAllDrawableProperties();
        }
        
        // Force immediate render
        if (renderer.draw) {
            renderer.draw();
        }
        
        // Notify UI of changes
        if (vm.emitTargetsUpdate) {
            vm.emitTargetsUpdate(false);
        }
    }
    
    /**
     * Ensure sprite displays instantly after being added
     * @param {VM} vm - Virtual machine instance
     * @param {string} spriteName - Name of the sprite to display
     */
    static displaySpriteInstantly(vm, spriteName) {
        if (!vm || !vm.runtime) return;
        
        const targets = vm.runtime.targets;
        const sprite = targets.find(t => t.getName() === spriteName);
        
        if (!sprite) return;
        
        // Ensure sprite is visible
        if (!sprite.visible) {
            sprite.visible = true;
        }
        
        // Force immediate render
        this.forceRender(vm, sprite);
        
        // Additional render after short delay to catch async updates
        setTimeout(() => {
            this.forceRender(vm, sprite);
        }, 50);
    }
    
    /**
     * Ensure backdrop displays instantly after being added
     * @param {VM} vm - Virtual machine instance
     */
    static displayBackdropInstantly(vm) {
        if (!vm || !vm.runtime) return;
        
        const stage = vm.runtime.getTargetForStage();
        if (!stage) return;
        
        const costumes = stage.getCostumes();
        if (costumes.length === 0) return;
        
        // Set last costume (the one just added) as current
        const lastCostumeIndex = costumes.length - 1;
        if (stage.currentCostume !== lastCostumeIndex) {
            stage.setCostume(lastCostumeIndex);
        }
        
        // Force immediate render
        this.forceRender(vm, stage);
        
        // Set stage as editing target
        if (vm.setEditingTarget) {
            vm.setEditingTarget(stage.id);
        }
        
        // Emit project changed
        if (vm.runtime.emitProjectChanged) {
            vm.runtime.emitProjectChanged();
        }
        
        // Additional render after short delay to catch async updates
        setTimeout(() => {
            this.forceRender(vm, stage);
        }, 50);
    }
    
    /**
     * Pre-load asset and store in cache for instant access
     * @param {Storage} storage - Storage instance
     * @param {string} assetUrl - URL to the asset
     * @param {string} md5ext - MD5 with extension (e.g., "abc123.svg")
     * @returns {Promise<Asset>} - The loaded asset
     */
    static async preloadAsset(storage, assetUrl, md5ext) {
        const [md5, ext] = md5ext.split('.');
        const AssetType = storage.AssetType;
        const DataFormat = storage.DataFormat;
        
        // Check cache first
        const assetType = ext === 'svg' ? AssetType.ImageVector : 
                         ['wav', 'mp3', 'ogg'].includes(ext) ? AssetType.Sound : 
                         AssetType.ImageBitmap;
        
        try {
            const cached = storage.builtinHelper._get(assetType, md5);
            if (cached) {
                return cached;
            }
        } catch (e) {
            // Continue to load
        }
        
        // Load asset
        const response = await fetch(assetUrl);
        if (!response.ok) {
            throw new Error(`Failed to load ${assetUrl}: ${response.status}`);
        }
        
        const data = new Uint8Array(await response.arrayBuffer());
        const dataFormat = DataFormat[ext.toUpperCase()] || DataFormat.SVG;
        
        // Create and cache asset
        const asset = storage.createAsset(assetType, ext, data, md5, false);
        storage.builtinHelper._store(assetType, dataFormat, data, md5);
        
        // Also store in custom cache
        if (!storage._assetCache) storage._assetCache = {};
        const cacheKey = `${assetType.name || assetType}_${md5}`;
        storage._assetCache[cacheKey] = asset;
        
        return asset;
    }
}

export default InstantDisplay;

