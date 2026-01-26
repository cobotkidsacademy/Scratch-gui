import { AssetType } from './AssetType';
import { DataFormat } from './DataFormat';
export type AssetId = string | number;
export type AssetData = string | Uint8Array;
export default class Asset {
    assetType: AssetType;
    assetId?: AssetId;
    data?: AssetData;
    dataFormat?: DataFormat;
    dependencies: Asset[];
    clean?: boolean;
    /**
     * Construct an Asset.
     * @param {AssetType} assetType - The type of this asset (sound, image, etc.)
     * @param {string} assetId - The ID of this asset.
     * @param {DataFormat} [dataFormat] - The format of the data (WAV, PNG, etc.); required iff `data` is present.
     * @param {Buffer} [data] - The in-memory data for this asset; optional.
     * @param {bool} [generateId] - Whether to create id from an md5 hash of data
     */
    constructor(assetType: AssetType, assetId?: AssetId, dataFormat?: DataFormat, data?: AssetData, generateId?: boolean);
    setData(data: AssetData | undefined, dataFormat: DataFormat | undefined, generateId?: boolean): void;
    /**
     * @returns {string} - This asset's data, decoded as text.
     */
    decodeText(): string;
    /**
     * Same as `setData` but encodes text first.
     * @param {string} data - the text data to encode and store.
     * @param {DataFormat} dataFormat - the format of the data (DataFormat.SVG for example).
     * @param {bool} generateId - after setting data, set the id to an md5 of the data?
     */
    encodeTextData(data: string, dataFormat: DataFormat, generateId: boolean): void;
    /**
     * @param {string} [contentType] - Optionally override the content type to be included in the data URI.
     * @returns {string} - A data URI representing the asset's data.
     */
    encodeDataURI(contentType: string): string;
}
