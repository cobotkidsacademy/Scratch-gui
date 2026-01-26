/**
 * Enumeration of the supported data formats.
 * @enum {string}
 */
export declare const DataFormat: {
    readonly JPG: "jpg";
    readonly JSON: "json";
    readonly MP3: "mp3";
    readonly PNG: "png";
    readonly SB2: "sb2";
    readonly SB3: "sb3";
    readonly SVG: "svg";
    readonly WAV: "wav";
};
export type DataFormat = typeof DataFormat[keyof typeof DataFormat];
