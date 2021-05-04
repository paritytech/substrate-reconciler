import { AxiosResponse } from 'axios';

import { AccountDataField } from './reconciler';

export type SidecarResponse =
	| AxiosResponse<AccountsBalanceInfo>
	| AxiosResponse<BlocksOperations>;

export interface AccountsBalanceInfo {
	at: {
		hash: string;
		height: string;
	};
	nonce: string;
	tokenSymbol: string;
	free: string;
	reserved: string;
	miscFrozen: string;
	feeFrozen: string;
	locks: [
		{
			id: string;
			amount: string;
			reasons: string;
		}
	];
}

export interface BlocksOperations {
	at: {
		hash: string;
		height: string;
	};
	operations: Operation[];
}

export interface Operation {
	operationId: OperationId;
	address:
		| {
				Id: string;
		  }
		| { id: string }
		| string;
	storage: StorageResourceId;
	amount: Amount;
}

export interface OperationId {
	operationIndex: number;
	phase: {
		variant: 'onFinalize' | 'onInitialize' | 'applyExtrinsic' | string;
		/**
		 * Only exists when `variant` is `applyExtrinsic`.
		 */
		extrinsicIndex?: string;
	};
	parentSpanId: ParentSpanId[];
	eventIndex: string;
}

export interface ParentSpanId {
	name: string;
	target: string;
	id: number;
}

export interface CurrencyId {
	symbol: string;
}

interface Amount {
	value: string;
	curency: CurrencyId;
}

export interface StorageResourceId {
	pallet: string;
	item: string;
	field1: 'data';
	field2: AccountDataField;
}
