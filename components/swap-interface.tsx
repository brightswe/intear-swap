"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { createSwapExecutionService, SwapExecutionResult } from "@/lib/swap-execution"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowUpDown, Shield, TrendingUp } from "lucide-react"
import Image from "next/image"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import SwapRouteComponent from "./swap-route"
import TokenSelector from "./token-selector"
import WalletConnect from "./wallet-connect"

interface Token {
  id: string
  symbol: string
  name: string
  decimals: number
  icon?: string
  price?: number
}

interface SwapRoute {
  route: string[]
  amountOut: string
  minimumReceived: string
  priceImpact: string
  estimatedGas: string
  fee: string
  transactions: any[]
  needsUnwrap: boolean
  deadline: number
  hasSlippage: boolean
  dexId: string
  useIntents: boolean
  intentsQuote: any
}

export default function SwapInterface() {
  const [fromToken, setFromToken] = useState<Token | null>(null)
  const [toToken, setToToken] = useState<Token | null>(null)
  const [fromAmount, setFromAmount] = useState("")
  const [toAmount, setToAmount] = useState("")
  const [route, setRoute] = useState<SwapRoute | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [walletConnected, setWalletConnected] = useState(false)
  const [account, setAccount] = useState<any>(null)
  const [wallet, setWallet] = useState<any>(null)
  const [isSwapping, setIsSwapping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [priceImpactWarning, setPriceImpactWarning] = useState(false)

  const validateAndSetAmount = useCallback((value: string) => {
    setError(null)

    if (value === "") {
      setFromAmount("")
      return
    }

    const cleanValue = value.replace(/[^0-9.]/g, "")
    const parts = cleanValue.split(".")
    if (parts.length > 2) return
    if (parts[1] && parts[1].length > 6) return

    const numValue = Number.parseFloat(cleanValue)
    if (numValue < 0 || isNaN(numValue) || numValue > 1e18) {
      setError("Invalid amount")
      return
    }

    setFromAmount(cleanValue)
  }, [])

  const handleSwapTokens = useCallback(() => {
    if (!fromToken || !toToken) return

    setFromToken(toToken)
    setToToken(fromToken)
    setFromAmount(toAmount)
    setToAmount(fromAmount)
    setRoute(null)
  }, [fromToken, toToken, fromAmount, toAmount])

  // Validation function for tokens
  const isValidToken = useCallback((token: Token | null): boolean => {
    return !!(token?.id && token?.symbol && Number.isInteger(token?.decimals) && token.decimals >= 0)
  }, [])

  // Validation for route fetch conditions
  const shouldFetchRoute = useMemo(() => {
    const validFromToken = isValidToken(fromToken)
    const validToToken = isValidToken(toToken)
    const validAmount = fromAmount && Number.parseFloat(fromAmount) > 0
    const differentTokens = fromToken?.id !== toToken?.id

    console.log("[v1] Route fetch validation:", {
      validFromToken,
      validToToken,
      validAmount,
      differentTokens,
      fromTokenId: fromToken?.id,
      toTokenId: toToken?.id,
      fromAmount
    })

    return validFromToken && validToToken && validAmount && differentTokens
  }, [fromToken, toToken, fromAmount, isValidToken])

  const fetchSwapRoute = useCallback(async () => {
    if (!shouldFetchRoute) {
      console.log("[v1] Skipping route fetch: validation failed")
      setRoute(null)
      setToAmount("")
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log("[v1] Fetching swap route for:", {
        tokenIn: fromToken!.id,
        tokenOut: toToken!.id,
        amountIn: fromAmount,
        decimalsIn: fromToken!.decimals,
        decimalsOut: toToken!.decimals
      })

      const response = await fetch("/api/swap-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenIn: fromToken!.id,
          tokenOut: toToken!.id,
          amountIn: fromAmount,
          decimalsIn: fromToken!.decimals,
          decimalsOut: toToken!.decimals,
          slippageType: "Auto",
          maxSlippage: "0.05",
          minSlippage: "0.001",
          traderAccountId: account?.accountId || "",
          signingPublicKey: account?.publicKey || "",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || `Failed to fetch route: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setRoute(data)
      setToAmount(data.amountOut)

      const impact = Number.parseFloat(data.priceImpact)
      setPriceImpactWarning(impact > 5)

      console.log("[v1] Route fetched successfully:", data)
    } catch (error) {
      console.error("[v1] Route fetch failed:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to calculate route"
      setError(errorMessage)
      toast.error(errorMessage, {
        description: "Please try different tokens or a smaller amount.",
      })
      setRoute(null)
      setToAmount("")
    } finally {
      setIsLoading(false)
    }
  }, [shouldFetchRoute, fromToken, toToken, fromAmount, account])

  const executeSwap = useCallback(async () => {
    if (!route || !account || !walletConnected || !wallet || !fromToken) return

    setIsSwapping(true)
    setError(null)

    try {
      const swapService = createSwapExecutionService(wallet, account)

      // Check balance for NEAR swaps
      if (fromToken.id === "near") {
        const balanceResponse = await fetch(`https://rpc.mainnet.near.org`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: "dontcare",
            method: "query",
            params: {
              request_type: "view_account",
              finality: "final",
              account_id: account.accountId,
            },
          }),
        })

        const balanceData = await balanceResponse.json()
        const availableBalance = Number.parseFloat(balanceData.result.amount) / 1e24
        const inputAmount = Number.parseFloat(fromAmount)

        if (availableBalance < inputAmount + Number(route.estimatedGas)) {
          throw new Error("Insufficient NEAR balance for swap and gas")
        }
      }

      const result: SwapExecutionResult = await swapService.executeSwap(route)
      if (!result.success) {
        throw new Error(result.error || "Swap execution failed")
      }

      toast.success("Swap completed successfully!", {
        description: result.transactionHash ? (
          <a
            href={`https://nearblocks.io/txns/${result.transactionHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            View transaction
          </a>
        ) : undefined,
      })

      // Reset form after successful swap
      setFromAmount("")
      setToAmount("")
      setRoute(null)
    } catch (error) {
      console.error("[v1] Swap failed:", error)
      const errorMessage = error instanceof Error ? error.message : "Swap failed"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSwapping(false)
    }
  }, [route, account, walletConnected, wallet, fromToken, fromAmount])

  const handleWalletConnect = useCallback((connected: boolean, accountData?: any, walletInstance?: any) => {
    setWalletConnected(connected)
    setAccount(accountData)
    setWallet(walletInstance)
    console.log("[v1] Wallet connection state:", { connected, accountData })
  }, [])

  // Enhanced token selection handlers with validation
  const handleFromTokenSelect = useCallback((token: Token) => {
    console.log("[v1] From token selected:", token)
    if (!isValidToken(token)) {
      console.error("[v1] Invalid from token:", token)
      return
    }
    setFromToken(token)
    // Clear route when token changes
    setRoute(null)
    setToAmount("")
  }, [isValidToken])

  const handleToTokenSelect = useCallback((token: Token) => {
    console.log("[v1] To token selected:", token)
    if (!isValidToken(token)) {
      console.error("[v1] Invalid to token:", token)
      return
    }
    setToToken(token)
    // Clear route when token changes
    setRoute(null)
    setToAmount("")
  }, [isValidToken])

  // Effect for route fetching with debounce
  useEffect(() => {
    console.log("[v1] useEffect: Checking if should fetch route:", shouldFetchRoute)

    if (!shouldFetchRoute) {
      setRoute(null)
      setToAmount("")
      return
    }

    const debounce = setTimeout(() => {
      fetchSwapRoute()
    }, 800)

    return () => clearTimeout(debounce)
  }, [shouldFetchRoute, fetchSwapRoute])

  const isSwapDisabled = useMemo(
    () =>
      !walletConnected ||
      !isValidToken(fromToken) ||
      !isValidToken(toToken) ||
      !fromAmount ||
      Number.parseFloat(fromAmount) <= 0 ||
      fromToken?.id === toToken?.id ||
      isLoading ||
      isSwapping ||
      !!error ||
      !route,
    [walletConnected, fromToken, toToken, fromAmount, isLoading, isSwapping, error, route, isValidToken],
  )

  const estimatedValue = useMemo(() => {
    if (!fromToken?.price || !fromAmount) return null
    return (Number.parseFloat(fromAmount) * fromToken.price).toFixed(2)
  }, [fromToken, fromAmount])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative bg-gradient-to-br from-gray-900 via-black to-gray-800">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />

      <div className="w-full max-w-lg space-y-6 relative z-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white flex items-center justify-center gap-3 ">
            Intear DEX
            <Image src="/logo.svg" alt="Intear Logo" width={40} height={40} className="h-10 w-10" />
          </h1>
          <p className="text-gray-400 ">Lightning-fast swaps on NEAR Protocol</p>
        </motion.div>

        <WalletConnect connected={walletConnected} onConnect={handleWalletConnect} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card className="p-8 bg-white border-2 border-black shadow-2xl rounded-xl">
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-lg font-bold text-black ">From</label>
                  {estimatedValue && <span className="text-sm text-gray-600 ">${estimatedValue}</span>}
                </div>

                <div className="space-y-3">
                  <TokenSelector token={fromToken} onSelect={handleFromTokenSelect} placeholder="Select Token" />

                  <div className="relative">
                    <Input
                      type="text"
                      value={fromAmount}
                      onChange={(e) => validateAndSetAmount(e.target.value)}
                      placeholder="0.00"
                      className="bg-white border-2 border-black focus:border-gray-600 text-black text-2xl h-16 rounded-lg  transition-all duration-200"
                    />

                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                      {["25%", "50%", "MAX"].map((label) => (
                        <Button
                          key={label}
                          variant="ghost"
                          size="sm"
                          className="h-8 px-3 text-xs font-bold text-black hover:text-white hover:bg-black border border-black  rounded-md"
                          onClick={() => {
                            if (label === "MAX") validateAndSetAmount("1000")
                            else if (label === "50%") validateAndSetAmount("500")
                            else if (label === "25%") validateAndSetAmount("250")
                          }}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 180 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSwapTokens}
                    className="h-12 w-12 rounded-full bg-black hover:bg-gray-800 text-white border-2 border-black"
                  >
                    <ArrowUpDown className="h-5 w-5" />
                  </Button>
                </motion.div>
              </div>

              <div className="space-y-4">
                <label className="text-lg font-bold text-black ">To</label>
                <div className="space-y-3">
                  <TokenSelector token={toToken} onSelect={handleToTokenSelect} placeholder="Select Token" />

                  <div className="relative">
                    <Input
                      type="text"
                      value={toAmount}
                      readOnly
                      placeholder="0.00"
                      className="bg-gray-100 border-2 border-black text-black text-2xl h-16 rounded-lg "
                    />

                    {isLoading && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <div className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {route && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <SwapRouteComponent route={route} />

                    {priceImpactWarning && (
                      <div className="mt-3 p-3 bg-white border-2 border-black rounded-lg flex items-center gap-2">
                        <Shield className="h-4 w-4 text-black" />
                        <span className="text-sm text-black ">
                          High price impact ({route.priceImpact}%). Consider smaller amounts.
                        </span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 bg-white border-2 border-black rounded-lg"
                  >
                    <p className="text-sm text-black font-bold ">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                whileHover={!isSwapDisabled ? { scale: 1.02 } : {}}
                whileTap={!isSwapDisabled ? { scale: 0.98 } : {}}
              >
                <Button
                  className={`w-full h-16 text-lg font-bold rounded-xl  transition-all duration-200 ${
                    isSwapDisabled
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed border-2 border-gray-400"
                      : "bg-black hover:bg-gray-800 text-white border-2 border-black"
                  }`}
                  disabled={isSwapDisabled}
                  onClick={executeSwap}
                >
                  {isSwapping ? (
                    <div className="flex items-center gap-3">
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                      Swapping...
                    </div>
                  ) : isLoading ? (
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-5 w-5" />
                      Finding Best Route...
                    </div>
                  ) : !isValidToken(fromToken) || !isValidToken(toToken) ? (
                    <div className="flex items-center gap-3">
                      Select Tokens
                       <Image src="/logo.svg" alt="Intear Logo" width={40} height={40} className="h-10 w-10" />
                    </div>
                  ) : fromToken?.id === toToken?.id ? (
                    <div className="flex items-center gap-3">
                      Select Different Tokens
                       <Image src="/logo.svg" alt="Intear Logo" width={40} height={40} className="h-10 w-10" />
                    </div>
                  ) : !route ? (
                    <div className="flex items-center gap-3">
                      Enter Amount
                       <Image src="/logo.svg" alt="Intear Logo" width={40} height={40} className="h-10 w-10" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      Swap Tokens
                       <Image src="/logo.svg" alt="Intear Logo" width={40} height={40} className="h-10 w-10" />
                    </div>
                  )}
                </Button>
              </motion.div>

              {!walletConnected && (
                <p className="text-sm text-gray-600 text-center ">Connect your wallet to start trading</p>
              )}
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-gray-400 text-sm "
        >
          <p>Powered by Intear DEX Aggregator • Best rates guaranteed</p>
        </motion.div>
      </div>
    </div>
  )
}
