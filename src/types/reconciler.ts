import BN from 'bn.js'
import { CurrencyId, OperationId, StorageResourceId } from './sidecar';

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

export type AccountDataField = 'free' | 'reserved' | 'miscFrozen' | 'feeFrozen'

/**
 * Parsed Operation.
 */
export interface POperation {
	operationId: OperationId;
	address: string;
	storage: StorageResourceId;
	miscFrozen: BN;
	accountDataField: AccountDataField;
	amount: {
		value: BN,
		currency: CurrencyId;
	}
}
