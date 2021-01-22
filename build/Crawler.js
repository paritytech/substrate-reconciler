import { Reconciler } from "./Reconciler";
import { ApiSidecar } from "./SidecarApi";
export class Crawler {
    constructor(sidecarUrl, log) {
        this.sidecarUrl = sidecarUrl;
        this.log = log;
        this.api = new ApiSidecar(this.sidecarUrl);
    }
    logError(e, height) {
        this.log && this.log(`Failed to reconcile block ${height}`);
        this.log && this.log(e);
        console.error(`Failed to reconcile block ${height}`);
        console.error(e);
    }
    async crawlHeight(height) {
        const blockOperations = await this.api.getOperations(height);
        const reconciler = new Reconciler(blockOperations, this.sidecarUrl);
        try {
            reconciler.reconcile();
            this.log && this.log(`Succesfully reconciled block ${height}`);
            return true;
        }
        catch (e) {
            this.logError(e, height);
            return false;
        }
    }
    async crawl(start, end) {
        const errorHeights = [];
        if (end) {
            for (let i = start; i <= end; i += 1) {
                const isOk = await this.crawlHeight(i);
                if (!isOk) {
                    errorHeights.push(i);
                }
            }
        }
        else {
            let run = true;
            let i = start;
            while (run) {
                const isOk = await this.crawlHeight(i);
                if (!isOk) {
                    errorHeights.push(i);
                }
            }
        }
        return errorHeights;
    }
    async crawlSet(blockHeights) {
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
