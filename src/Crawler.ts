import { Reconciler } from "./Reconciler";
import { ApiSidecar } from "./SidecarApi";

export class Crawler {
	private api: ApiSidecar;
	constructor(private sidecarUrl: string, private log?: (i: unknown) => void) {
		this.api = new ApiSidecar(this.sidecarUrl);
	}

	private logError(e: unknown, height: number) {
		this.log && this.log(`Failed to reconcile block ${height}`);
		this.log && this.log(e);
		console.error(`Failed to reconcile block ${height}`);
		console.error(e)
	}

	private async crawlHeight(height: number): Promise<boolean> {
		const blockOperations = await this.api.getOperations(height);
		const reconciler = new Reconciler(blockOperations, this.sidecarUrl);
		try {
			reconciler.reconcile()
			this.log && this.log(`Succesfully reconciled block ${height}`);
			return true
		} catch (e: unknown) {
			this.logError(e, height);
			return false;
		}
	}

	async crawl(start: number, end?: number): Promise<number[]> {
		const errorHeights = [];
		if (end) {
			for (let i = start; i <= end; i += 1) {
				const isOk = await this.crawlHeight(i);
				if(!isOk) {
					errorHeights.push(i);
				}
			}
		} else {
			let run = true;
			let i = start;
			while(run) {
				const isOk = await this.crawlHeight(i);
				if (!isOk) {
					errorHeights.push(i);
				}
			}

		}

		return errorHeights;
	}

	async crawlSet(blockHeights: number[]): Promise<number[]> {
		const errorHeights = [];
		for(const height of blockHeights) {
			const isOk = await this.crawlHeight(height);
			if (!isOk) {
				errorHeights.push(height);
			}
		}

		return errorHeights;
	}
}