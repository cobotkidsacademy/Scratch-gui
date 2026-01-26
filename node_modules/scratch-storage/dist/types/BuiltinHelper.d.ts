import Asset, { AssetData, AssetId } from './Asset';
import { AssetType } from './AssetType';
import { DataFormat } from './DataFormat';
import Helper from './Helper';
import { ScratchStorage } from './ScratchStorage';
/**
 * @typedef {object} BuiltinAssetRecord
 * @property {AssetType} type - The type of the asset.
 * @property {DataFormat} format - The format of the asset's data.
 * @property {?string} id - The asset's unique ID.
 * @property {Buffer} data - The asset's data.
 */
interface BuiltinAssetRecord {
    type: AssetType;
    format: DataFormat;
    id: AssetId | null;
    data: AssetData;
}
export default class BuiltinHelper extends Helper {
    assets: Record<string, BuiltinAssetRecord>;
    constructor(parent: ScratchStorage);
    /**
     * Call `setDefaultAssetId` on the parent `ScratchStorage` instance to register all built-in default assets.
     */
    registerDefaultAssets(): void;
    /**
     * Synchronously fetch a cached asset for a given asset id. Returns null if not found.
     * @param {string} assetId - The id for the asset to fetch.
     * @returns {?Asset} The asset for assetId, if it exists.
     */
    get(assetId: AssetId): Asset | null;
    /**
     * Alias for store (old name of store)
     * @deprecated Use BuiltinHelper.store
     * @param {AssetType} assetType - The type of the asset to cache.
     * @param {DataFormat} dataFormat - The dataFormat of the data for the cached asset.
     * @param {Buffer} data - The data for the cached asset.
     * @param {string} id - The id for the cached asset.
     * @returns {string} The calculated id of the cached asset, or the supplied id if the asset is mutable.
     */
    cache(assetType: AssetType, dataFormat: DataFormat, data: AssetData, id: AssetId): AssetId;
    /**
     * Deprecated external API for _store
     * @deprecated Not for external use. Create assets and keep track of them outside of the storage instance.
     * @param {AssetType} assetType - The type of the asset to cache.
     * @param {DataFormat} dataFormat - The dataFormat of the data for the cached asset.
     * @param {Buffer} data - The data for the cached asset.
     * @param {(string|number)} id - The id for the cached asset.
     * @returns {string} The calculated id of the cached asset, or the supplied id if the asset is mutable.
     */
    store(assetType: AssetType, dataFormat: DataFormat, data: AssetData, id: AssetId): AssetId;
    /**
     * Cache an asset for future lookups by ID.
     * @param {AssetType} assetType - The type of the asset to cache.
     * @param {DataFormat} dataFormat - The dataFormat of the data for the cached asset.
     * @param {Buffer} data - The data for the cached asset.
     * @param {(string|number)} id - The id for the cached asset.
     * @returns {string} The calculated id of the cached asset, or the supplied id if the asset is mutable.
     */
    _store(assetType: AssetType, dataFormat: DataFormat, data: AssetData, id?: AssetId | null): AssetId;
    /**
     * Fetch an asset but don't process dependencies.
     * @param {AssetType} assetType - The type of asset to fetch.
     * @param {string} assetId - The ID of the asset to fetch: a project ID, MD5, etc.
     * @return {?Promise.<Asset>} A promise for the contents of the asset.
     */
    load(assetType: AssetType, assetId: AssetId): Promise<Asset | null> | null;
}
export {};
