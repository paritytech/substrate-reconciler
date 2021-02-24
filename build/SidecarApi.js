"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiSidecar = void 0;
const axios_1 = __importDefault(require("axios"));
/**
 * Block execution on the main thread for `ms` milliseconds.
 *
 * @param ms time to sleep in millliseconds
 * @returns
 */
function sleep(ms) {
    return new Promise((resolve, _reject) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}
class ApiSidecar {
    constructor(sidecarBaseUrl) {
        this.SECOND = 1000;
        this.client = axios_1.default.create({ baseURL: sidecarBaseUrl });
    }
    /**
     * Execute a get request to `uri` with exponential backoff for failed request
     * retry attempts.
     *
     * @param uri URI
     * @param attempts only for recursive cases
     */
    async retryGet(uri, attempts = 0) {
        try {
            return await this.client.get(uri);
        }
        catch (e) {
            // Exponential back for up to 3 trys
            if (attempts < 3) {
                console.error(`Attempt ${attempts} for sidecar endpoint ${uri}`);
                attempts += 1;
                await sleep(2 * attempts * this.SECOND);
                return await this.retryGet(uri, attempts);
            }
            if (e.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.log(e.response.data);
                console.log(e.response.status);
                console.log(e.response.headers);
            }
            else if (e.request) {
                // The request was made but no response was received
                // `e.request` is an instance of XMLHttpRequest in the browser and an instance of
                // http.ClientRequest in node.js
                console.log(e.request);
            }
            else {
                // Something happened in setting up the request that triggered an e
                console.log('Error', e.message);
            }
            console.log(e.config);
            throw e;
        }
    }
    /**
     * Get operations for a block.
     *
     * @param block
     * @returns
     */
    async getOperations(block) {
        const response = block
            ? await this.retryGet(`/blocks/${block}?operations=true`)
            : await this.retryGet(`/blocks/head?operations=true`);
        return response.data;
    }
    /**
     * Get the account balance info for an address.
     *
     * @param addreess
     * @param block
     * @returns
     */
    async getAccountsBalanceInfo(addreess, block) {
        const response = block
            ? await this.retryGet(`/accounts/${addreess}/balance-info?at=${block}`)
            : await this.retryGet(`/accounts/${addreess}/balance-info`);
        return response.data;
    }
}
exports.ApiSidecar = ApiSidecar;
