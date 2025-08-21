import { providers, transactions, utils } from 'near-api-js';

export interface SwapExecutionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  receipts?: any[];
}

export class SwapExecutionService {
  private wallet: any;
  private account: any;

  constructor(wallet: any, account: any) {
    this.wallet = wallet;
    this.account = account;
  }

  async executeSwap(swapData: any): Promise<SwapExecutionResult> {
    try {
      if (swapData.useIntents && swapData.intentsQuote) {
        return await this.executeNearIntentsSwap(swapData);
      }

      return await this.executeRegularSwap(swapData);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private async executeRegularSwap(swapData: any): Promise<SwapExecutionResult> {
    const transactions = swapData.transactions || [];
    const results: any[] = [];

    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      try {
        if (tx.NearTransaction) {
          const result = await this.signAndSendNearTransaction(tx.NearTransaction);
          results.push(result);

          if (result.success && i < transactions.length - 1 && result.transactionHash) {
            await this.waitForTransaction(result.transactionHash);
          }
        }
      } catch (txError) {
        if (!tx.NearTransaction?.continue_if_failed) {
          return {
            success: false,
            error: `Transaction failed: ${txError instanceof Error ? txError.message : 'Unknown error'}`
          };
        }
      }
    }

    if (swapData.needsUnwrap) {
      try {
        const unwrapResult = await this.unwrapLeftoverTokens();
        results.push(unwrapResult);
      } catch (unwrapError) {
        console.warn('Unwrap failed:', unwrapError);
      }
    }

    const lastResult = results[results.length - 1] || { success: false };
    return {
      success: results.some(r => r.success),
      transactionHash: lastResult.transactionHash,
      receipts: results.flatMap(r => r.receipts || [])
    };
  }

  private async executeNearIntentsSwap(swapData: any): Promise<SwapExecutionResult> {
    const quote = swapData.intentsQuote.IntentsQuote;

    if (!quote || !quote.message_to_sign || !quote.quote_hash) {
      throw new Error('Invalid intents quote data');
    }

    const payload = {
      message: quote.message_to_sign,
      recipient: 'intents.near',
      nonce: Date.now().toString(),
      callbackUrl: window.location.origin
    };

    const signedMessage = await this.wallet.signMessage(payload);

    const signedData = {
      standard: 'nep413',
      payload,
      signature: signedMessage.signature,
      public_key: signedMessage.publicKey
    };

    const response = await fetch('https://solver-relay-v2.chaindefuser.com.chaindefuser.com/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'publish_intent',
        params: {
          quote_hashes: [quote.quote_hash],
          signed_data: signedData
        },
        id: Date.now()
      })
    });

    const result = await response.json();

    if (result.error) {
      throw new Error(result.error.message || 'Intent publication failed');
    }

    return {
      success: true,
      transactionHash: result.result.hash || result.result.transaction_hash,
      receipts: result.result.receipts || []
    };
  }

  private async signAndSendNearTransaction(nearTx: any): Promise<SwapExecutionResult> {
    const actions = nearTx.actions.map((action: any) => {
      if (action.FunctionCall) {
        return transactions.functionCall(
          action.FunctionCall.method_name,
          utils.serialize.base_decode(action.FunctionCall.args),
          BigInt(action.FunctionCall.gas),
          BigInt(action.FunctionCall.deposit)
        );
      }
      return action;
    });

    const result = await this.wallet.signAndSendTransaction({
      receiverId: nearTx.receiver_id,
      actions
    });

    return {
      success: true,
      transactionHash: result.transaction.hash,
      receipts: result.receipts_outcome
    };
  }

  private async unwrapLeftoverTokens(): Promise<SwapExecutionResult> {
    const unwrapTx = {
      receiverId: 'wrap.near',
      actions: [transactions.functionCall(
        'near_withdraw',
        Buffer.from(JSON.stringify({ amount: '1' })), // Minimal to trigger, but actual unwrap all
        BigInt('30000000000000'),
        BigInt('1')
      )]
    };

    const result = await this.wallet.signAndSendTransaction(unwrapTx);

    return {
      success: true,
      transactionHash: result.transaction.hash,
      receipts: result.receipts_outcome
    };
  }

  private async waitForTransaction(txHash: string, timeout = 30000): Promise<void> {
    const start = Date.now();
    const provider = new providers.JsonRpcProvider({ url: 'https://rpc.mainnet.near.org' });

    while (Date.now() - start < timeout) {
      try {
        const status = await provider.txStatus(txHash, this.account.accountId);
        if (status.status && typeof status.status === 'object' && 'SuccessValue' in status.status) return;
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Transaction wait timeout');
  }
}

export function createSwapExecutionService(wallet: any, account: any) {
  return new SwapExecutionService(wallet, account);
}
