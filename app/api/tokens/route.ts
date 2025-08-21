import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('[API] Fetching tokens from intear.tech...');

    const endpoint = 'https://prices.intear.tech/tokens-reputable';
    const response = await fetch(`${endpoint}?t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tokens: ${response.status}`);
    }

    const tokensData = await response.json();

    if (!Array.isArray(tokensData) || tokensData.length === 0) {
      throw new Error('No tokens available');
    }

    const transformedTokens = tokensData.map((token: any) => ({
      id: token.account_id || token.token_id,
      symbol: token.metadata?.symbol || token.symbol,
      name: token.metadata?.name || token.name,
      decimals: token.metadata?.decimals || 18,
      price: token.price_usd ? parseFloat(token.price_usd) : undefined,
      change24h: token.change_24h ? parseFloat(token.change_24h) : undefined,
      icon: token.metadata?.icon || token.icon,
      marketCap: token.market_cap ? parseFloat(token.market_cap) : undefined,
      volume24h: token.volume_24h ? parseFloat(token.volume_24h) : undefined,
      reputation: token.reputation || 'Unknown',
    })).filter(token => token.id && token.symbol && token.name);

    return NextResponse.json(transformedTokens);
  } catch (error) {
    console.error('[API] Error fetching tokens:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
