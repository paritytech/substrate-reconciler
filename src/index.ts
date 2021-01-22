#!/usr/bin/env node

// run `ts-node src/index.ts`

const argv = require('yargs/yargs')(process.argv.slice(2))
	.option('sidecar-url', {
		string: true,
		alias: 'S',
		description: "url for substrate-api-sidecar"
	})
	.option('start-block', {
		number: true,
		alias: 's',
		description: "block to start balance reconciliation on"
	})
	.option('end-block', {
		number: true,
		alias: 'e',
		description: "block to end balance reconcilation on"
	})
	.help('h')
	.alias('h', 'help')
	.argv;

console.log(argv)