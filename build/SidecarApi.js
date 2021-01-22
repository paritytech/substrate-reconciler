import axios from "axios";
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
export class ApiSidecar {
    constructor(sidecarBaseUrl) {
        this.SECOND = 1000;
        this.client = axios.create({ baseURL: sidecarBaseUrl });
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
