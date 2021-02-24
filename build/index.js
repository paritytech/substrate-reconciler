#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Crawler_1 = require("./Crawler");
// run `ts-node src/index.ts`
async function main() {
    const argv = require('yargs/yargs')(process.argv.slice(2))
        .option('sidecarUrl', {
        string: true,
        alias: 'S',
        description: "Url for substrate-api-sidecar",
        default: "http://127.0.0.1:8080/"
    })
        .option('startBlock', {
        number: true,
        alias: 's',
        description: "Block to start balance reconciliation on"
    })
        .option('endBlock', {
        number: true,
        alias: 'e',
        description: "Block to end balance reconcilation on"
    })
        .option('blockSet', {
        array: true,
        alias: 'b',
        description: "Array of block heights to call. Overides start/end block"
    })
        .option('singleHeight', {
        number: true,
        alias: 'i',
        description: 'Crawl a block at a single height'
    })
        .help('h')
        .alias('h', 'help')
        .argv;
    const crawler = new Crawler_1.Crawler(argv.sidecarUrl, console.log);
    if (argv.singleHeight) {
        await crawler.crawlSet([argv.singleHeight]);
    }
    else if (argv.blockSet) {
        await crawler.crawlSet(argv.blockSet);
    }
    else if (argv.startBlock) {
        await crawler.crawl(argv.startBlock, argv.endBlock);
    }
    else {
        console.log("no valid options selected");
    }
}
main().catch((e) => {
    console.error(e);
    console.error('Caught error in main');
});
process.on('SIGINT', () => {
    console.log('Detected kill signal. Exiting...');
    process.exit(1);
});
