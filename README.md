# substrate-reconciler

Prototype balance reconciler for usage with `substrate-api-sidecars` block tracing endpoint

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
