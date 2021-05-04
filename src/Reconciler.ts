import BN from 'bn.js';

import { log } from './log';
import { ApiSidecar } from './SidecarApi';
import {
	isAccountDataField,
	isToStringAble,
	PAccountData,
	POperation,
	ReconcileResult,
} from './types/reconciler';
import { BlocksOperations, Operation } from './types/sidecar';

/**
 * Useful for converting all BN values to integer strings, for debug display.
 *
 * @param o Object to convert its values to strings.
 * @returns A stringified version of the object.
 */
function objToString(o: PAccountData): string {
	const stringObj = Object.keys(o).reduce((acc, cur) => {
		const maybeToStringable = o[cur as keyof PAccountData];
		acc[cur] = isToStringAble(maybeToStringable)
			? maybeToStringable.toString(10)
			: maybeToStringable;

		return acc;
	}, {} as Record<string, string | unknown>);

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
function getAddress(thing: unknown): string {
	const address =
		(thing as { Id: string })?.Id || (thing as { id: string })?.id || thing;
	if (typeof address !== 'string') {
		throw new Error('[Reconciler::getAddress] Address could not be extracted ');
	}

	return address;
}

/**
 * Extract all the addresses that are affected by the given operations.
 *
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

/**
 * Parse the operations from sidecars JSON response by pulling out the fields we
 * need and serializing all integer fields to instances of BN.js (so we can
 * do non overflowing arithmetic later on.).
 *
 * @param operations
 * @returns Operations with integer fields as BN adn the address as a string.
 */
function parseOperations(operations: Operation[]): POperation[] {
	return operations.map((op) => {
		const accountDataField = op.storage.field2;
		if (!accountDataField) {
			// Check if the field exists at all
			throw {
				message: 'Expect a field for account data',
				storage: op.storage,
			};
		}
		if (!isAccountDataField(accountDataField)) {
			// Check if the field is one we know of and expect. If not we are in a runtime
			// this program is not prepared to handle.
			throw {
				message: 'AccountData had a different field then expected',
				storage: op.storage,
			};
		}

		const address = getAddress(op.address);
		return {
			address,
			accountDataField: accountDataField,
			value: new BN(op.amount.value),
		};
	});
}

/**
 * Do the actual accounting. This takes the operations and adds them up against
 * the `AccountData` associated with the address from the block before.
 * Once all the operations have been added to the corresponding `AccountData`
 * object, the fields of the `AcountData` object should equal those in the chain's
 * storage from after the block is executed.
 *
 * WARNING: `accountDatas` is mutated in place.
 *
 * @param accountDatas
 * @param operations
 */
function accountOperations(
	accountDatas: Record<string, PAccountData>,
	operations: POperation[]
): void {
	operations.forEach(({ address, accountDataField, value }) => {
		if (address in accountDatas) {
			const val = accountDatas[address][accountDataField];
			const updatedVal = val.add(value);
			accountDatas[address][accountDataField] = updatedVal;
		} else {
			throw new Error(
				`[Reconciler.accountOperations]: Address(${address}) not found in accountData`
			);
		}
	});
}

export class Reconciler {
	private api: ApiSidecar;
	constructor(sidecarUrl: string) {
		this.api = new ApiSidecar(sidecarUrl);
	}

	/**
	 * Reconcile balances based on the operations from api-sidecar's block operations
	 * endpoint.
	 *
	 * @param blockOps sidecar block operations endpoint payload
	 * @returns a list of objects that describe a block height and if there was a
	 * failure at that height.
	 */
	async reconcile(blockOps: BlocksOperations): Promise<ReconcileResult> {
		const curBlockHeight = parseInt(blockOps.at.height, 10);
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
					error: true,
					height: curBlockHeight,
					address,
				};
			}

			const datasAreEqual =
				accountedData?.free.eq(systemData?.free) &&
				accountedData.reserved.eq(systemData?.reserved) &&
				accountedData.miscFrozen.eq(systemData.miscFrozen) &&
				accountedData.feeFrozen.eq(systemData.feeFrozen);

			if (!datasAreEqual) {
				log.error(
					`[Reconciler.reconcile] Error with ${address} at height ${curBlockHeight}\n` +
						`Pre data: ${objToString(accountedData)}\n` +
						`Post data: ${objToString(systemData)}`
				);
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
