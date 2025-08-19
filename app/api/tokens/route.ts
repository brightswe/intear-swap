import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('[API] Fetching tokens from intear.tech...');

    const endpoints = [
      'https://prices.intear.tech/tokens-reputable',
      'https://prices.intear.tech/tokens-notfake-or-better',
      'https://prices.intear.tech/tokens'
    ];

    let tokensData = null;
    let usedEndpoint = '';

    for (const endpoint of endpoints) {
      try {
        console.log(`[API] Trying endpoint: ${endpoint}`);
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

        console.log(`[API] ${endpoint} status:`, response.status);
        if (!response.ok) {
          console.error(`[API] ${endpoint} error:`, response.status, response.statusText);
          continue;
        }

        const responseText = await response.text();
        console.log(`[API] ${endpoint} response (full):`, responseText);

        const parsedData = JSON.parse(responseText);
        if (Array.isArray(parsedData) && parsedData.length > 0) {
          tokensData = parsedData;
          usedEndpoint = endpoint;
          console.log(`[API] Successfully got ${parsedData.length} tokens from ${endpoint}`);
          break;
        } else {
          console.log(`[API] ${endpoint} returned empty or invalid data:`, parsedData);
        }
      } catch (endpointError) {
        if (endpointError instanceof Error) {
          console.error(`[API] Error with ${endpoint}:`, endpointError.stack);
        } else {
          console.error(`[API] Error with ${endpoint}:`, endpointError);
        }
        continue;
      }
    }

    if (!tokensData || tokensData.length === 0) {
      console.error('[API] All endpoints failed or returned empty data');
      return NextResponse.json(
        { error: 'No tokens available from any intear.tech endpoint' },
        { status: 503 }
      );
    }

    console.log('[API] First token structure from', usedEndpoint, ':', JSON.stringify(tokensData[0], null, 2));

    const transformedTokens = tokensData.map((token: any, index: number) => {
      const transformed = {
        id: token.account_id || token.token_id || token.id || token.contractId || token.contract_id || `token_${index}`,
        symbol: token.metadata?.symbol || token.symbol || token.token_symbol || `TOKEN${index}`,
        name: token.metadata?.name || token.name || token.token_name || token.display_name || `Token ${index}`,
        decimals: token.metadata?.decimals || token.decimals || 18,
        price: token.price_usd ? parseFloat(token.price_usd) : (token.price ? parseFloat(token.price) : undefined),
        change24h: token.change_24h ? parseFloat(token.change_24h) : (token.change24h ? parseFloat(token.change24h) : undefined),
        icon: token.metadata?.icon || token.icon || token.image || token.logo || undefined,
        marketCap: token.market_cap ? parseFloat(token.market_cap) : (token.marketCap ? parseFloat(token.marketCap) : undefined),
        volume24h: token.volume_24h ? parseFloat(token.volume_24h) : (token.volume24h ? parseFloat(token.volume24h) : undefined),
        reputation: token.reputation || 'Unknown',
      };

      if (index < 3) {
        console.log(`[API] Original token ${index}:`, JSON.stringify(token, null, 2));
        console.log(`[API] Transformed token ${index}:`, JSON.stringify(transformed, null, 2));
      }

      return transformed;
    });

    const validTokens = transformedTokens.filter(token =>
      token.id &&
      token.symbol &&
      token.name &&
      token.symbol !== `TOKEN${tokensData.indexOf(token)}` &&
      token.name !== `Token ${tokensData.indexOf(token)}`
    );

    console.log('[API] Valid tokens after filtering:', validTokens.length);
    console.log('[API] Final sample token:', JSON.stringify(validTokens[0], null, 2));

    return NextResponse.json(validTokens);
  } catch (error) {
    if (error instanceof Error) {
      console.error('[API] Error fetching tokens:', error.stack);
    } else {
      console.error('[API] Error fetching tokens:', error);
    }
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
