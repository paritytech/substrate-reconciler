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
	height: string;
	operations: Operation[];
}

export interface Operation {
	operationId: OperationId;
	address: {
		Id: string;
	};
	storage: StorageResourceId;
	amount: Amount;
}

export interface OperationId {
	operationIndex: number;
	phase: {
		onInitialize?: boolean;
		onFinalize?: boolean;
		// extrinsic index
		extrinsic?: number;
	};
	parentSpanId: ParentSpanId[];
	eventIndex: number;
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
	field?: string;
}
