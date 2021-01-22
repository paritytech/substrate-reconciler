#!/usr/bin/env node

// run `ts-node src/index.ts`
async function main() {
	const argv = require('yargs/yargs')(process.argv.slice(2))
		.option('sidecar-url', {
			string: true,
			alias: 'S',
			description: "Url for substrate-api-sidecar",
			default: ""
		})
		.option('start-block', {
			number: true,
			alias: 's',
			description: "Block to start balance reconciliation on"
		})
		.option('end-block', {
			number: true,
			alias: 'e',
			description: "Block to end balance reconcilation on"
		})
		.option('block-set', {
			array: true,
			alias: 'b',
			description: "Array of block heights to call. Overides start/end block"
		})
		.option('single-height', {
			number: true,
			alias: 'i',
			description: 'Crawl a block at a single height'
		})
		.help('h')
		.alias('h', 'help')
		.argv;

	console.log(argv);

}

process.on('SIGINT', () => {
	console.log('Detected kill signal. Exiting...');
	process.exit(1);
})

main().catch((e) => {
	console.error(e);
	console.error('Caught error in main');
})


