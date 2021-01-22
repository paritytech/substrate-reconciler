import BN from "bn.js";
import { ApiSidecar } from "./SidecarApi";
import { AccountDataField, PAccountData, POperation,  } from "./types/reconciler";
import { BlocksOperations } from "./types/sidecar";

export class Reconciler {
	private api: ApiSidecar;
	constructor(private blockOps: BlocksOperations, sidecarUrl: string) {
		this.api = new ApiSidecar(sidecarUrl);
	}

	async reconcile() {
		const prevBlockHeight = parseInt(this.blockOps.height) -1;
		const preBlockDatas = await this.getAccountDatas(prevBlockHeight);
		// warning: preBlockData is mutated in place here
		this.accountOperations(preBlockDatas, this.parseOperations());
	}

	accountOperations(accountDatas: Record<string, PAccountData>, operations: POperation[]) {
		operations.forEach((op) => {
			const accountData = accountDatas[op.address];
			accountData && accountData[op.accountDataField].add(op.amount.value)
		})
	}

	private parseOperations(): POperation[] {
		return this.blockOps.operations.map((op) => {
			const accountDataField: AccountDataField = op.storage.field?.split('.')[1];
			if(!accountDataField) {
				throw {
					message: 'Expect a field for account data',
					storage: op.storage,
				}
			}

			return {
				...op,
				address: op.address.Id,
				accountDataField,
				amount: {
					value: new BN(op.amount.value),
					currency: op.amount.curency,
				}
			}
		})
	}

	private findAccounts(): string[] {
		return [...this.blockOps.operations.reduce((seen, op) => {
			seen.add(op.address.Id);
			return seen;
		}, new Set<string>()).values()];
	}

	private async getAccountDatas(height: number): Promise<Record<string, PAccountData>> {
		const accountDatas = await Promise.all(
			this.findAccounts().map(async (address) => {
				const d = await this.api.getAccountsBalanceInfo(address, height);

				return {
					address,
					tokenSymbol: d.tokenSymbol,
					free: new BN(d.free),
					reserved: new BN(d.reserved),
					miscFrozen: new BN(d.miscFrozen),
					feeFrozen: new BN(d.feeFrozen)
				}
			})
		);

		return accountDatas.reduce((acc, data) => {
			acc[data.address] = data;

			return acc;
		}, {} as Record<string, PAccountData>);
	}


}