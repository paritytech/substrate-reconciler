"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Reconciler = void 0;
const bn_js_1 = __importDefault(require("bn.js"));
const SidecarApi_1 = require("./SidecarApi");
const reconciler_1 = require("./types/reconciler");
/**
 * Useful for converting all BN values to integer strings, for debug display.
 *
 * @param o Object to convert its values to strings.
 * @returns A stringified version of the object.
 */
function objToString(o) {
    const stringObj = Object.keys(o).reduce((acc, cur) => {
        const maybeToStringable = o[cur];
        acc[cur] = reconciler_1.isToStringAble(maybeToStringable)
            ? maybeToStringable.toString(10)
            : maybeToStringable;
        return acc;
    }, {});
    return JSON.stringify(stringObj, null, 2);
}
/**
 * Extract address from possible formats an address might be in from a response
 * from api-sidecar. Note: the `id` is from the `MultiAddress` enum and the different
 * casing reflects different versions of polkadot.js that case differently (newer
 * versions should always be camelCase).
 *
 * @param thing
 * @returns
 */
function getAddress(thing) {
    var _a, _b;
    const address = ((_a = thing) === null || _a === void 0 ? void 0 : _a.Id) || ((_b = thing) === null || _b === void 0 ? void 0 : _b.id) || thing;
    if (typeof address !== 'string') {
        throw new Error('[Reconciler::getAddress] Address could not be extracted ');
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
/**
 *
 * @param operations
 * @returns Operations with integer fields as BN adn the address as a string.
 */
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
        if (!accountDataField.includes(accountDataField)) {
            throw {
                message: 'AccountData had a different field then expected',
                storage: op.storage,
            };
        }
        const address = getAddress(op.address);
        return {
            // Note: we only use `accountDataField`, `address` and amount.value. The rest are
            // here for debugging convience when we do the actual reconciling.
            address,
            accountDataField: accountDataField,
            value: new bn_js_1.default(op.amount.value),
        };
    });
}
/**
 * WARNING: `accountDatas` is mutated in place.
 *
 * @param accountDatas
 * @param operations
 */
function accountOperations(accountDatas, operations) {
    operations.forEach(({ address, accountDataField, value }) => {
        if (address in accountDatas) {
            const val = accountDatas[address][accountDataField];
            const updatedVal = val.add(value);
            accountDatas[address][accountDataField] = updatedVal;
        }
        else {
            console.error(`[Reconciler.accountOperations]: Address(${address}) not found in accountData`);
        }
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
        // WARNING: preBlockData is mutated in place here
        accountOperations(preBlockDatas, parseOperations(blockOps.operations));
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
                console.error(`[Reconciler.reconcile] Error with ${address} at height ${curBlockHeight}` +
                    `[Reconciler.reconcile] Pre data: ${objToString(accountedData)}` +
                    `[Reconciler.reconcile] Post data: ${objToString(systemData)}`);
                return {
                    address,
                    error: true,
                    height: curBlockHeight,
                };
            }
        }
        return {
            error: false,
            height: curBlockHeight,
        };
    }
    /**
     * Fetch the balances of each AccountData field for each address in `accounts`.
     *
     * @param height Block height to fetch account balance data at.
     * @param accounts
     * @returns
     */
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