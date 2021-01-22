import BN from "bn.js";
import { ApiSidecar } from "./SidecarApi";
export class Reconciler {
    constructor(blockOps, sidecarUrl) {
        this.blockOps = blockOps;
        this.api = new ApiSidecar(sidecarUrl);
    }
    async reconcile() {
        const curBlockHeight = parseInt(this.blockOps.height);
        if (!Number.isInteger(curBlockHeight)) {
            throw new Error("Block height is not a number");
        }
        const prevBlockHeight = parseInt(this.blockOps.height) - 1;
        const preBlockDatas = await this.getAccountDatas(prevBlockHeight);
        // warning: preBlockData is mutated in place here
        this.accountOperations(preBlockDatas, this.parseOperations());
        const postBlockDatas = await this.getAccountDatas(parseInt(this.blockOps.height));
        Object.keys(preBlockDatas).forEach((address) => {
            // What we think the balance is
            const accountedData = preBlockDatas[address];
            // What the node thinks the balance is
            const systemData = postBlockDatas[address];
            if (!accountedData || !systemData) {
                throw new Error('Data for account missing');
            }
            const datasAreEqual = accountedData?.free.eq(systemData?.free) &&
                accountedData.reserved.eq(systemData?.reserved) &&
                accountedData.miscFrozen.eq(systemData.miscFrozen) &&
                accountedData.feeFrozen.eq(systemData.feeFrozen);
            if (!datasAreEqual) {
                throw {
                    message: 'accounted and system data for accounts not equal',
                    accountedData,
                    systemData
                };
            }
        });
    }
    accountOperations(accountDatas, operations) {
        operations.forEach((op) => {
            const accountData = accountDatas[op.address];
            accountData && accountData[op.accountDataField].add(op.amount.value);
        });
    }
    parseOperations() {
        return this.blockOps.operations.map((op) => {
            const accountDataField = op.storage.field?.split('.')[1];
            if (!accountDataField) {
                throw {
                    message: 'Expect a field for account data',
                    storage: op.storage,
                };
            }
            // TODO: This can be changed to an is type check
            if (!["free", "reserved", "miscFrozen", "feeFrozen"].includes(accountDataField)) {
                throw {
                    message: 'AccountData had a different field then expected',
                    storage: op.storage,
                };
            }
            return {
                operationId: op.operationId,
                storage: op.storage,
                address: op.address.Id,
                accountDataField: accountDataField,
                amount: {
                    value: new BN(op.amount.value),
                    currency: op.amount.curency,
                }
            };
        });
    }
    findAccounts() {
        return [...this.blockOps.operations.reduce((seen, op) => {
                seen.add(op.address.Id);
                return seen;
            }, new Set()).values()];
    }
    async getAccountDatas(height) {
        const accountDatas = await Promise.all(this.findAccounts().map(async (address) => {
            const d = await this.api.getAccountsBalanceInfo(address, height);
            return {
                address,
                tokenSymbol: d.tokenSymbol,
                free: new BN(d.free),
                reserved: new BN(d.reserved),
                miscFrozen: new BN(d.miscFrozen),
                feeFrozen: new BN(d.feeFrozen)
            };
        }));
        return accountDatas.reduce((acc, data) => {
            acc[data.address] = data;
            return acc;
        }, {});
    }
}
