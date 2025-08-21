export interface Token {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  price?: number;
  change24h?: number;
  icon?: string;
  marketCap?: number;
  volume24h?: number;
  reputation?: string;
}

export interface SwapRoute {
  route: string[];
  amountOut: string;
  minimumReceived: string;
  priceImpact: string;
  estimatedGas: string;
  fee: string;
  transactions?: Transaction[];
  needsUnwrap?: boolean;
  dexId?: string;
  hasSlippage?: boolean;
  deadline?: number;
  useIntents?: boolean;
  intentMessage?: string;
  intentId?: string;
  totalFee?: string;
  exchangeRate?: string;
  executionMetadata?: ExecutionMetadata;
  rawResponse?: any;
}

export interface Transaction {
  NearTransaction?: {
    receiver_id: string;
    actions: Action[];
    continue_if_failed?: boolean;
  };
}

export interface Action {
  FunctionCall?: {
    method_name: string;
    args: string; // base64 encoded
    gas: string;
    deposit: string;
  };
}

export interface ExecutionMetadata {
  requiresMultipleTransactions: boolean;
  estimatedExecutionTime: number; // seconds
  gasEstimate: string;
  depositRequired: string;
}

export interface SwapExecutionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  receipts?: any[];
}

export interface NEP413Message {
  message: string;
  recipient: string;
  nonce: Buffer;
  callbackUrl?: string;
}

export type SwapState = 'idle' | 'loading' | 'executing' | 'success' | 'error';

export interface WalletConnectProps {
  connected: boolean;
  onConnect: (connected: boolean, account?: any, wallet?: any) => void;
}

export interface SwapInterfaceState {
  fromToken: Token | null;
  toToken: Token | null;
  fromAmount: string;
  toAmount: string;
  connected: boolean;
  account: any;
  wallet: any;
  swapRoute: SwapRoute | null;
  isLoadingRoute: boolean;
  swapState: SwapState;
  swapResult: SwapExecutionResult | null;
  swapError: string | null;
}
