"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Reconciler = void 0;
const bn_js_1 = __importDefault(require("bn.js"));
const SidecarApi_1 = require("./SidecarApi");
function bnObjToString(o) {
    return Object.keys(o).reduce((acc, cur) => {
        acc[cur] = o[cur].toString ? o[cur].toString(10) : o[cur];
        return acc;
    }, {});
}
function getAddress(thing) {
    var _a, _b;
    const address = ((_a = thing) === null || _a === void 0 ? void 0 : _a.Id) || ((_b = thing) === null || _b === void 0 ? void 0 : _b.id) || thing;
    if (typeof address !== 'string') {
        throw new Error('ADDRESS could not be extracted [getAddress]');
    }
    return address;
}
/**
 * @param operations
 * @returns a list of all addresses affected by the operations.
 */
function findAccounts(operations) {
    return [
        ...operations
            .reduce((seen, op) => {
            const address = getAddress(op.address);
            seen.add(address);
            return seen;
        }, new Set())
            .values(),
    ];
}
function parseOperations(operations) {
    return operations.map((op) => {
        var _a;
        const accountDataField = (_a = op.storage.field) === null || _a === void 0 ? void 0 : _a.split('.')[1];
        if (!accountDataField) {
            throw {
                message: 'Expect a field for account data',
                storage: op.storage,
            };
        }
        // TODO: This can be changed to an is type check
        if (!['free', 'reserved', 'miscFrozen', 'feeFrozen'].includes(accountDataField)) {
            throw {
                message: 'AccountData had a different field then expected',
                storage: op.storage,
            };
        }
        const address = getAddress(op.address);
        return {
            operationId: op.operationId,
            storage: op.storage,
            address,
            accountDataField: accountDataField,
            amount: {
                value: new bn_js_1.default(op.amount.value),
                currency: op.amount.curency,
            },
        };
    });
}
class Reconciler {
    constructor(sidecarUrl) {
        this.api = new SidecarApi_1.ApiSidecar(sidecarUrl);
    }
    async reconcile(blockOps) {
        const curBlockHeight = parseInt(blockOps.at.height);
        if (!Number.isInteger(curBlockHeight)) {
            throw new Error('Block height is not a number');
        }
        const prevBlockHeight = curBlockHeight - 1;
        const accounts = findAccounts(blockOps.operations);
        const preBlockDatas = await this.getAccountDatas(prevBlockHeight, accounts);
        // warning: preBlockData is mutated in place here
        this.accountOperations(preBlockDatas, parseOperations(blockOps.operations));
        const postBlockDatas = await this.getAccountDatas(curBlockHeight, accounts);
        for (const address of Object.keys(preBlockDatas)) {
            // What we think the balance is
            const accountedData = preBlockDatas[address];
            // What the node thinks the balance is
            const systemData = postBlockDatas[address];
            if (!accountedData || !systemData) {
                return {
                    address,
                    error: true,
                    height: curBlockHeight,
                };
            }
            const datasAreEqual = (accountedData === null || accountedData === void 0 ? void 0 : accountedData.free.eq(systemData === null || systemData === void 0 ? void 0 : systemData.free)) &&
                accountedData.reserved.eq(systemData === null || systemData === void 0 ? void 0 : systemData.reserved) &&
                accountedData.miscFrozen.eq(systemData.miscFrozen) &&
                accountedData.feeFrozen.eq(systemData.feeFrozen);
            if (!datasAreEqual) {
                console.log(`Error with ${address} at height ${curBlockHeight}`);
                console.log('Pre data: ', bnObjToString(accountedData));
                console.log('Post data: ', bnObjToString(systemData));
                return {
                    address,
                    error: true,
                    height: curBlockHeight,
                };
            }
        }
        // console.debug('Balances after processing the blocks operations.')
        // Object.keys(preBlockDatas).forEach((addr) => {
        // 	console.debug(bnObjToString(preBlockDatas[addr] as PAccountData))
        // })
        return {
            error: false,
            height: curBlockHeight,
        };
    }
    accountOperations(accountDatas, operations) {
        operations.forEach(({ address, accountDataField, amount }) => {
            if (address in accountDatas) {
                const val = accountDatas[address][accountDataField];
                const updatedVal = val.add(amount.value);
                accountDatas[address][accountDataField] = updatedVal;
            }
            else {
                console.error(`ADDDRESS ${address} not found in accountData [Reconciler.accountOperations]`);
            }
        });
    }
    async getAccountDatas(height, accounts) {
        const accountDatas = await Promise.all(accounts.map(async (address) => {
            const d = await this.api.getAccountsBalanceInfo(address, height);
            return {
                address,
                tokenSymbol: d.tokenSymbol,
                free: new bn_js_1.default(d.free),
                reserved: new bn_js_1.default(d.reserved),
                miscFrozen: new bn_js_1.default(d.miscFrozen),
                feeFrozen: new bn_js_1.default(d.feeFrozen),
            };
        }));
        return accountDatas.reduce((acc, data) => {
            acc[data.address] = data;
            return acc;
        }, {});
    }
}
exports.Reconciler = Reconciler;
//# sourceMappingURL=Reconciler.js.map