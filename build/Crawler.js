"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Crawler = void 0;
const Reconciler_1 = require("./Reconciler");
const SidecarApi_1 = require("./SidecarApi");
class Crawler {
    constructor(sidecarUrl, log) {
        this.sidecarUrl = sidecarUrl;
        this.log = log;
        this.reconciler = new Reconciler_1.Reconciler(this.sidecarUrl);
        this.api = new SidecarApi_1.ApiSidecar(this.sidecarUrl);
    }
    logError(e, height) {
        this.log && this.log(`Failed to reconcile block ${height}`);
        this.log && this.log(e);
        console.error(`Failed to reconcile block ${height}`);
        console.error(e);
    }
    async crawlHeight(height) {
        const blockOperations = await this.api.getOperations(height);
        try {
            const result = await this.reconciler.reconcile(blockOperations);
            this.log && this.log(result);
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
exports.Crawler = Crawler;
//# sourceMappingURL=Crawler.js.map