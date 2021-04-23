import { log } from './log';
import { Reconciler } from './Reconciler';
import { ApiSidecar } from './SidecarApi';

export class Crawler {
	private reconciler: Reconciler;
	private api: ApiSidecar;
	constructor(private sidecarUrl: string, private logSuccess: boolean) {
		this.reconciler = new Reconciler(this.sidecarUrl);
		this.api = new ApiSidecar(this.sidecarUrl);
	}

	/**
	 * Crawl a single block height.
	 *
	 * @param height block height to reconcile.
	 * @returns wether or not the balance changes from the block reconciled.
	 */
	private async crawlHeight(height: number): Promise<boolean> {
		const blockOperations = await this.api.getOperations(height);
		try {
			const result = await this.reconciler.reconcile(blockOperations);
			this.logSuccess && log.info(JSON.stringify(result));
			return true;
		} catch (e) {
			log.error(`Failed to reconcile block ${height}: ${e as string}`);
			return false;
		}
	}

	/**
	 * Reconcile every block in the specified inclusive range.
	 *
	 * @param start first block height in range
	 * @param end last block height in range
	 * @returns a list of block heights that did not reconcile.
	 */
	async crawl(start: number, end?: number): Promise<number[]> {
		const errorHeights = [];
		if (end) {
			for (let i = start; i <= end; i += 1) {
				const isOk = await this.crawlHeight(i);
				if (!isOk) {
					errorHeights.push(i);
				}
			}
		} else {
			const run = true;
			const i = start;
			while (run) {
				const isOk = await this.crawlHeight(i);
				if (!isOk) {
					errorHeights.push(i);
				}
			}
		}

		return errorHeights;
	}

	/**
	 * Reconcile blocks from a list of heights.
	 *
	 * @param blockHeights array of block heights to reconcile
	 * @returns a list of block heights that did not reconcile.
	 */
	async crawlSet(blockHeights: number[]): Promise<number[]> {
		const errorHeights = [];
		for (const height of blockHeights) {
			const isOk = await this.crawlHeight(height);
			if (!isOk) {
				errorHeights.push(height);
			}
		}

		return errorHeights;
	}
}
