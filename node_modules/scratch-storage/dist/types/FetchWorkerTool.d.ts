import { ScratchGetRequest } from './Tool';
/**
 * Get and send assets with a worker that uses fetch.
 */
export default class PublicFetchWorkerTool {
    private inner;
    constructor();
    /**
     * Is get supported?
     * @returns {boolean} Is get supported?
     */
    get isGetSupported(): boolean;
    /**
     * Request data from a server with a worker that uses fetch.
     * @param {{url:string}} reqConfig - Request configuration for data to get.
     * @returns {Promise.<Buffer|Uint8Array|null>} Resolve to Buffer of data from server.
     */
    get(reqConfig: ScratchGetRequest): Promise<Uint8Array | null>;
    /**
     * Is sending supported?
     * @returns {boolean} Is sending supported?
     */
    get isSendSupported(): boolean;
    /**
     * Send data to a server with a worker that uses fetch.
     * @throws {Error} A not implemented error.
     */
    send(): never;
}
