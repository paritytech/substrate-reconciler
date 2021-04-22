import BN from 'bn.js';

import { ApiSidecar } from './SidecarApi';
import {
	AccountDataField,
	PAccountData,
	POperation,
	ReconcileResult,
} from './types/reconciler';
import { BlocksOperations, Operation } from './types/sidecar';

function bnObjToString(o: Record<string, any>): Record<string, string> {
	return Object.keys(o).reduce((acc, cur) => {
		acc[cur] = o[cur].toString ? o[cur].toString(10) : o[cur];

		return acc;
	}, {} as Record<string, string>);
}

function getAddress(thing: unknown): string {
	const address =
		(thing as { Id: string })?.Id || (thing as { id: string })?.id || thing;
	if (typeof address !== 'string') {
		throw new Error('ADDRESS could not be extracted [getAddress]');
	}

	return address;
}

/**
 * @param operations
 * @returns a list of all addresses affected by the operations.
 */
function findAccounts(operations: Operation[]): string[] {
	return [
		...operations
			.reduce((seen, op) => {
				const address = getAddress(op.address);
				seen.add(address);
				return seen;
			}, new Set<string>())
			.values(),
	];
}

function parseOperations(operations: Operation[]): POperation[] {
	return operations.map((op) => {
		const accountDataField = op.storage.field?.split('.')[1];
		if (!accountDataField) {
			throw {
				message: 'Expect a field for account data',
				storage: op.storage,
			};
		}
		// TODO: This can be changed to an is type check
		if (
			!['free', 'reserved', 'miscFrozen', 'feeFrozen'].includes(
				accountDataField
			)
		) {
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
			accountDataField: accountDataField as AccountDataField,
			amount: {
				value: new BN(op.amount.value),
				currency: op.amount.curency,
			},
		};
	});
}

export class Reconciler {
	private api: ApiSidecar;
	constructor(sidecarUrl: string) {
		this.api = new ApiSidecar(sidecarUrl);
	}

	async reconcile(blockOps: BlocksOperations): Promise<ReconcileResult> {
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

			const datasAreEqual =
				accountedData?.free.eq(systemData?.free) &&
				accountedData.reserved.eq(systemData?.reserved) &&
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

	accountOperations(
		accountDatas: Record<string, PAccountData>,
		operations: POperation[]
	): void {
		operations.forEach(({ address, accountDataField, amount }) => {
			if (address in accountDatas) {
				const val = accountDatas[address][accountDataField];
				const updatedVal = val.add(amount.value);
				accountDatas[address][accountDataField] = updatedVal;
			} else {
				console.error(
					`ADDDRESS ${address} not found in accountData [Reconciler.accountOperations]`
				);
			}
		});
	}

	private async getAccountDatas(
		height: number,
		accounts: string[]
	): Promise<Record<string, PAccountData>> {
		const accountDatas = await Promise.all(
			accounts.map(async (address) => {
				const d = await this.api.getAccountsBalanceInfo(address, height);

				return {
					address,
					tokenSymbol: d.tokenSymbol,
					free: new BN(d.free),
					reserved: new BN(d.reserved),
					miscFrozen: new BN(d.miscFrozen),
					feeFrozen: new BN(d.feeFrozen),
				};
			})
		);

		return accountDatas.reduce((acc, data) => {
			acc[data.address] = data;

			return acc;
		}, {} as Record<string, PAccountData>);
	}
}
