import { DataFormat } from './DataFormat';
export interface AssetType {
    contentType: string;
    name: string;
    runtimeFormat: DataFormat;
    immutable: boolean;
}
/**
 * Enumeration of the supported asset types.
 * @type {Object.<String,AssetType>}
 * @typedef {Object} AssetType - Information about a supported asset type.
 * @property {string} contentType - the MIME type associated with this kind of data. Useful for data URIs, etc.
 * @property {string} name - The human-readable name of this asset type.
 * @property {DataFormat} runtimeFormat - The default format used for runtime, in-memory storage of this asset. For
 *     example, a project stored in SB2 format on disk will be returned as JSON when loaded into memory.
 * @property {boolean} immutable - Indicates if the asset id is determined by the asset content.
 */
export declare const AssetType: {
    readonly ImageBitmap: {
        readonly contentType: "image/png";
        readonly name: "ImageBitmap";
        readonly runtimeFormat: "png";
        readonly immutable: true;
    };
    readonly ImageVector: {
        readonly contentType: "image/svg+xml";
        readonly name: "ImageVector";
        readonly runtimeFormat: "svg";
        readonly immutable: true;
    };
    readonly Project: {
        readonly contentType: "application/json";
        readonly name: "Project";
        readonly runtimeFormat: "json";
        readonly immutable: false;
    };
    readonly Sound: {
        readonly contentType: "audio/x-wav";
        readonly name: "Sound";
        readonly runtimeFormat: "wav";
        readonly immutable: true;
    };
    readonly Sprite: {
        readonly contentType: "application/json";
        readonly name: "Sprite";
        readonly runtimeFormat: "json";
        readonly immutable: true;
    };
};
