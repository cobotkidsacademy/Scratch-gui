import { AssetId } from './Asset';
declare let _TextDecoder: typeof TextDecoder;
declare let _TextEncoder: typeof TextEncoder;
declare const memoizedToString: (assetId: AssetId, data: Uint8Array) => any;
export { memoizedToString, _TextEncoder, _TextDecoder };
