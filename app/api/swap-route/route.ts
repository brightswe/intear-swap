import { type NextRequest, NextResponse } from "next/server";

interface SwapResponse {
  route: string[];
  amountOut: string;
  minimumReceived: string;
  priceImpact: string;
  estimatedGas: string;
  fee: string;
  transactions: any[];
  needsUnwrap: boolean;
  deadline: number;
  hasSlippage: boolean;
  dexId: string;
  useIntents: boolean;
  intentsQuote: any;
  totalFee: any;
  exchangeRate: any;
  rawResponse: any;
  executionMetadata: {
    requiresMultipleTransactions: boolean;
    estimatedExecutionTime: number;
    gasEstimate: string;
    depositRequired: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const {
      tokenIn,
      tokenOut,
      amountIn,
      decimalsIn,
      decimalsOut,
      slippageType,
      maxSlippage,
      minSlippage,
      traderAccountId,
      signingPublicKey,
    } = await request.json();

    // Validate inputs
    if (!tokenIn || !tokenOut) {
      console.error("[dex] Missing tokenIn or tokenOut:", { tokenIn, tokenOut });
      return NextResponse.json({ error: "Missing tokenIn or tokenOut" }, { status: 400 });
    }

    const amount = Number.parseFloat(amountIn);
    if (isNaN(amount) || amount <= 0) {
      console.error("[dex] Invalid amount:", amountIn);
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    if (!Number.isInteger(decimalsIn) || !Number.isInteger(decimalsOut)) {
      console.error("[dex] Invalid decimals:", { decimalsIn, decimalsOut });
      return NextResponse.json({ error: "Invalid decimals" }, { status: 400 });
    }

    console.log("[dex] Fetching swap route:", { tokenIn, tokenOut, amountIn, slippageType, traderAccountId });

    const amountInSmallestUnit = (BigInt(Math.floor(amount * Math.pow(10, decimalsIn)))).toString();

    console.log("[dex] Amount conversion:", {
      originalAmount: amountIn,
      decimalsIn,
      convertedAmount: amountInSmallestUnit,
      calculation: `${amount} * 10^${decimalsIn} = ${amountInSmallestUnit}`
    });

    const params = new URLSearchParams({
      token_in: tokenIn === "near" ? "near" : tokenIn,
      token_out: tokenOut === "near" ? "near" : tokenOut,
      amount_in: amountInSmallestUnit, // Use amount_in, not amount_out
      max_wait_ms: "10000",
      slippage_type: slippageType || "Auto",
    });

    if (slippageType === "Auto") {
      params.append("max_slippage", maxSlippage || "0.05");
      params.append("min_slippage", minSlippage || "0.001");
    } else if (slippageType === "Fixed") {
      params.append("slippage", maxSlippage || "0.01");
    }

    // Update dexes list to match the valid DEX IDs from the API
    params.append("dexes", "Rhea,Veax,Aidols,GraFun,Jumpdefi,Wrap,RheaDcl,NearIntents");

    if (traderAccountId) {
      params.append("trader_account_id", traderAccountId);
    }
    if (signingPublicKey) {
      params.append("signing_public_key", signingPublicKey);
    }

    const apiUrl = `https://router.intear.tech/route?${params.toString()}`;
    console.log("[dex] Calling Intear API:", apiUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "IntearDEXAggregator/1.0",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[dex] Intear API request failed with status:", response.status, "Error text:", errorText);

      // Handle specific error cases
      if (response.status === 400) {
        if (errorText.includes("Invalid dex id")) {
          return NextResponse.json({ error: "Invalid DEX configuration. Please try again." }, { status: 400 });
        } else if (errorText.includes("amount")) {
          return NextResponse.json({ error: "Invalid swap amount. Please check your input." }, { status: 400 });
        } else {
          return NextResponse.json({ error: `Invalid request: ${errorText}` }, { status: 400 });
        }
      } else if (response.status === 404) {
        return NextResponse.json({ error: "No routes available for this token pair" }, { status: 404 });
      } else if (response.status === 429) {
        return NextResponse.json({ error: "Too many requests. Please try again in a moment" }, { status: 429 });
      } else {
        return NextResponse.json(
          { error: `DEX aggregator service error: ${errorText || response.status}` },
          { status: 500 }
        );
      }
    }

    const routeData = await response.json();
    console.log("[dex] Received swap route from Intear API:", routeData);

    // Handle both single route object and array of routes
    let bestRoute;
    if (Array.isArray(routeData) && routeData.length > 0) {
      bestRoute = routeData[0];
    } else if (routeData && typeof routeData === 'object') {
      bestRoute = routeData;
    } else {
      console.error("[dex] No valid routes found from Intear API:", routeData);
      return NextResponse.json({ error: "No routes available for this token pair" }, { status: 404 });
    }

    // Validate route data - the API might have different field names
    if (!bestRoute) {
      console.error("[dex] Invalid route data:", bestRoute);
      return NextResponse.json({ error: "Invalid route data from DEX aggregator" }, { status: 500 });
    }

    // Extract amounts - handle different possible field names
    const estimatedAmountOut = bestRoute.estimated_amount?.amount_out ||
      bestRoute.amount_out ||
      bestRoute.amountOut || "0";
    const worstCaseAmountOut = bestRoute.worst_case_amount?.amount_out ||
      bestRoute.minimum_received ||
      bestRoute.minimumReceived ||
      estimatedAmountOut;

    const transformedResponse: SwapResponse = {
      route: [bestRoute.dex_id || bestRoute.dexId || "Unknown"],
      amountOut: (Number(estimatedAmountOut) / Math.pow(10, decimalsOut)).toFixed(6),
      minimumReceived: (Number(worstCaseAmountOut) / Math.pow(10, decimalsOut)).toFixed(6),
      priceImpact: bestRoute.price_impact ? (Number(bestRoute.price_impact) * 100).toFixed(2) :
        bestRoute.priceImpact ? Number(bestRoute.priceImpact).toFixed(2) : "0.01",
      estimatedGas: bestRoute.gas_estimate || bestRoute.gasEstimate || "0.003",
      fee: bestRoute.total_fee ? (Number(bestRoute.total_fee) / Math.pow(10, decimalsIn)).toFixed(6) :
        bestRoute.fee ? Number(bestRoute.fee).toFixed(6) : "0.003",
      transactions: bestRoute.execution_instructions || bestRoute.transactions || [],
      needsUnwrap: bestRoute.needs_unwrap || bestRoute.needsUnwrap || false,
      deadline: bestRoute.deadline || Date.now() + 300000,
      hasSlippage: bestRoute.has_slippage || bestRoute.hasSlippage || false,
      dexId: bestRoute.dex_id || bestRoute.dexId || "Unknown",
      useIntents: (bestRoute.dex_id || bestRoute.dexId) === "NearIntents",
      intentsQuote: bestRoute.execution_instructions?.find((inst: any) => inst.IntentsQuote) ||
        bestRoute.intentsQuote,
      totalFee: bestRoute.total_fee || bestRoute.totalFee,
      exchangeRate: bestRoute.exchange_rate || bestRoute.exchangeRate,
      rawResponse: routeData,
      executionMetadata: {
        requiresMultipleTransactions: (bestRoute.execution_instructions || bestRoute.transactions || []).length > 1,
        estimatedExecutionTime: bestRoute.estimated_execution_time || bestRoute.estimatedExecutionTime || 30,
        gasEstimate: bestRoute.gas_estimate || bestRoute.gasEstimate || "50000000000000",
        depositRequired: bestRoute.deposit_required || bestRoute.depositRequired || "1",
      },
    };

    console.log("[dex] Transformed response:", transformedResponse);
    return NextResponse.json(transformedResponse);
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.error("[dex] Intear API request timed out");
      return NextResponse.json({ error: "Request timed out. Please try again." }, { status: 408 });
    } else {
      console.error("[dex] Intear API error:", error.message, error.stack);
      return NextResponse.json(
        { error: error.message || "Failed to fetch swap route" },
        { status: 500 }
      );
    }
  }
}
