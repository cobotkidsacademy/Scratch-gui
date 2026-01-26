import Asset, { AssetData, AssetId } from './Asset';
import Helper from './Helper';
import { ScratchGetRequest, ScratchSendRequest, Tool } from './Tool';
import { AssetType } from './AssetType';
import { DataFormat } from './DataFormat';
/**
 * @typedef {function} UrlFunction - A function which computes a URL from asset information.
 * @param {Asset} - The asset for which the URL should be computed.
 * @returns {(string|object)} - A string representing the URL for the asset request OR an object with configuration for
 *                              the underlying fetch call (necessary for configuring e.g. authentication)
 */
export type UrlFunction = (asset: Asset) => string | ScratchGetRequest | ScratchSendRequest;
interface StoreRecord {
    types: string[];
    get: UrlFunction;
    create?: UrlFunction;
    update?: UrlFunction;
}
export default class WebHelper extends Helper {
    stores: StoreRecord[];
    assetTool: Tool;
    projectTool: Tool;
    constructor(parent: any);
    /**
     * Register a web-based source for assets. Sources will be checked in order of registration.
     * @deprecated Please use addStore
     * @param {Array.<AssetType>} types - The types of asset provided by this source.
     * @param {UrlFunction} urlFunction - A function which computes a URL from an Asset.
     */
    addSource(types: AssetType[], urlFunction: UrlFunction): void;
    /**
     * Register a web-based store for assets. Sources will be checked in order of registration.
     * @param {Array.<AssetType>} types - The types of asset provided by this store.
     * @param {UrlFunction} getFunction - A function which computes a GET URL for an Asset
     * @param {UrlFunction} createFunction - A function which computes a POST URL for an Asset
     * @param {UrlFunction} updateFunction - A function which computes a PUT URL for an Asset
     */
    addStore(types: AssetType[], getFunction: UrlFunction, createFunction?: UrlFunction, updateFunction?: UrlFunction): void;
    /**
     * Fetch an asset but don't process dependencies.
     * @param {AssetType} assetType - The type of asset to fetch.
     * @param {string} assetId - The ID of the asset to fetch: a project ID, MD5, etc.
     * @param {DataFormat} dataFormat - The file format / file extension of the asset to fetch: PNG, JPG, etc.
     * @return {Promise.<Asset>} A promise for the contents of the asset.
     */
    load(assetType: AssetType, assetId: AssetId, dataFormat: DataFormat): Promise<Asset | null>;
    /**
     * Create or update an asset with provided data. The create function is called if no asset id is provided
     * @param {AssetType} assetType - The type of asset to create or update.
     * @param {?DataFormat} dataFormat - DataFormat of the data for the stored asset.
     * @param {Buffer} data - The data for the cached asset.
     * @param {?string} assetId - The ID of the asset to fetch: a project ID, MD5, etc.
     * @return {Promise.<object>} A promise for the response from the create or update request
     */
    store(assetType: AssetType, dataFormat: DataFormat | undefined, data: AssetData, assetId?: AssetId): Promise<string | {
        id: string;
    }>;
}
export {};
