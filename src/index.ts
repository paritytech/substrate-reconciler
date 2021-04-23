#!/usr/bin/env node

import Yargs from 'yargs';

import { Crawler } from './Crawler';
import { log } from './log';

// run `ts-node src/index.ts`
async function main() {
	const argv = Yargs(process.argv.slice(2))
		.option('sidecarUrl', {
			string: true,
			alias: 'S',
			description: 'Url for substrate-api-sidecar',
			default: 'http://127.0.0.1:8080/',
		})
		.option('startBlock', {
			number: true,
			alias: 's',
			description: 'Block to start balance reconciliation on',
		})
		.option('endBlock', {
			number: true,
			alias: 'e',
			description: 'Block to end balance reconcilation on',
		})
		.option('blockSet', {
			array: true,
			alias: 'b',
			description: 'Array of block heights to call. Overides start/end block',
		})
		.option('singleHeight', {
			number: true,
			alias: 'i',
			description: 'Crawl a block at a single height',
		})
		.option('logSuccesus', {
			boolean: true,
			alias: 'l',
			description: 'Log block information about succesfully reconciled blocks',
			default: true,
		})
		.help('h')
		.alias('h', 'help').argv;

	// Setup our crawler with the given api-sidecar URL
	const crawler = new Crawler(argv.sidecarUrl, argv.logSuccesus);

	let failedHeights;
	if (argv.singleHeight) {
		log.info(`Reconciling block number: ${argv.singleHeight}`);
		failedHeights = await crawler.crawlSet([argv.singleHeight]);
	} else if (argv.blockSet) {
		log.info(`Reconciling block set: ${argv.blockSet.toString()}`);
		failedHeights = await crawler.crawlSet(argv.blockSet as number[]);
	} else if (argv.startBlock && argv.endBlock) {
		log.info(
			`Reconciling block range: ${
				argv.startBlock
			}..=${argv.endBlock.toString()}`
		);
		failedHeights = await crawler.crawl(argv.startBlock, argv.endBlock);
	} else {
		log.info('no valid options selected');
	}

	if (failedHeights && failedHeights.length) {
		log.info('The following block heights failed');
		failedHeights?.forEach((h) => log.info(h));
	} else {
		log.info('No failures in the range');
	}

	log.info('Process complete');
}

main()
	.catch((e) => {
		log.error(e);
		log.error('Caught error in main');
	})
	.finally(() => {
		log.info('Exiting...');
		process.exit(1);
	});

process.on('SIGINT', () => {
	log.info('Detected kill signal. Exiting...');
	process.exit(1);
});
