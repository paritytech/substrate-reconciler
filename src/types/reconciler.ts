import BN from 'bn.js';

/**
 * Parsed AccountData
 */
export interface PAccountData {
	address: string;
	tokenSymbol: string;
	free: BN;
	reserved: BN;
	miscFrozen: BN;
	feeFrozen: BN;
}

export type AccountDataField = keyof Omit<
	PAccountData,
	'address' | 'tokenSymbol'
>;

export function isAccountDataField(thing: unknown): thing is AccountDataField {
	return (
		typeof thing === 'string' &&
		['free', 'reserved', 'miscFrozen', 'feeFrozen'].includes(thing)
	);
}

/**
 * Parsed Operation.
 */
export interface POperation {
	address: string;
	accountDataField: AccountDataField;
	value: BN;
}

export interface ReconcileResult {
	address?: string;
	error: boolean;
	height: number;
}

/**
 * Some object that has a `.toString` function as a property
 */
interface ToStringAble {
	toString: (_: number) => string;
}

/**
 * @param thing some to check if toString`
 * @returns Whether or not an object can have `.toString` called on it.
 */
export function isToStringAble(thing: unknown): thing is ToStringAble {
	return typeof (thing as ToStringAble).toString === 'function';
}
