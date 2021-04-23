# substrate-reconciler

Prototype balance reconciler for usage with `substrate-api-sidecars` block operations endpoint

## account with me

Start up a polkadot node that uses the substrate branch [state-trace-rpc](https://github.com/paritytech/substrate/pull/7780)

```
# instructions not included here
```

Start up substrate-api-sidecar on the branch [zeke-state-trace](https://github.com/paritytech/substrate-api-sidecar/pull/383)

```
git checkout zeke-state-trace
yarn
yarn dev
```

Reconcile a specific block:

```bash
ts-node src/index.ts --singleHeight 15
```

or if you don't want/have ts-node

```bash
yarn build
node src/index.js --singleHeight 15
```

Learn the other options of the CLI

```bash
ts-node src/index.ts --help
```

## options

```bash
Options:
      --version       Show version number                              [boolean]
  -S, --sidecarUrl    Url for substrate-api-sidecar
                                    [string] [default: "http://127.0.0.1:8080/"]
  -s, --startBlock    Block to start balance reconciliation on          [number]
  -e, --endBlock      Block to end balance reconcilation on             [number]
  -b, --blockSet      Array of block heights to call. Overides start/end block
                                                                         [array]
  -i, --singleHeight  Crawl a block at a single height                  [number]
  -h, --help          Show help                                        [boolean]
```
