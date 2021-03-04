import axios, { AxiosInstance } from "axios";
import { AccountsBalanceInfo, BlocksOperations } from "./types/sidecar";

/**
 * Block execution on the main thread for `ms` milliseconds.
 *
 * @param ms time to sleep in millliseconds
 * @returns
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve, _reject) => {
		setTimeout(() => {
			resolve()
		}, ms)
	})
}

export class ApiSidecar {
	private client: AxiosInstance;
	readonly SECOND = 1_000;
	constructor(sidecarBaseUrl: string) {
		this.client = axios.create({ baseURL: sidecarBaseUrl });
	}

/**
 * Execute a get request to `uri` with exponential backoff for failed request
 * retry attempts.
 *
 * @param uri URI
 * @param attempts only for recursive cases
 */
	private async retryGet(uri: string, attempts = 0): Promise<any> {
		try {
			return await this.client.get(uri);
		} catch (e) {
			// Exponential back for up to 3 trys
			if (attempts < 3) {
				console.error(
					`Attempt ${attempts} for sidecar endpoint ${uri}`
				);
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
			} else if (e.request) {
				// The request was made but no response was received
				// `e.request` is an instance of XMLHttpRequest in the browser and an instance of
				// http.ClientRequest in node.js
				console.log(e.request);
			} else {
				// Something happened in setting up the request that triggered an e
				console.log('Error', e.message);
			}
			// console.log(e.config);

			throw e;
		}
	}

	/**
	 * Get operations for a block.
	 *
	 * @param block
	 * @returns
	 */
	async getOperations(block?: number | string): Promise<BlocksOperations> {
		const response = block
			? await this.retryGet(`/blocks/${block}?operations=true`)
			: await this.retryGet(`/blocks/head?operations=true`);

		return response.data as BlocksOperations;
	}

	/**
	 * Get the account balance info for an address.
	 *
	 * @param addreess
	 * @param block
	 * @returns
	 */
	async getAccountsBalanceInfo(addreess: string, block?: number | string): Promise<AccountsBalanceInfo> {
		const response = block
			? await this.retryGet(`/accounts/${addreess}/balance-info?at=${block}`)
			: await this.retryGet(`/accounts/${addreess}/balance-info`)

		return response.data as AccountsBalanceInfo;
	}
}