#!/usr/bin/env node
"use strict";
const argv = require('yargs/yargs')(process.argv.slice(2))
    .usage('Usage: $0 <command> [options]')
    .command('test', 'Test yargs out')
    .example('$0 test -v "hello world"', 'print hello world to the screen')
    .option('value', {
    string: true,
    alias: 'v'
})
    .help('h')
    .alias('h', 'help')
    .epilog('finding money')
    .argv;
console.log(argv);
