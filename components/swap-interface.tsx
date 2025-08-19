"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowUpDown, Shield, TrendingUp } from "lucide-react"
import Image from "next/image"
import { useCallback, useEffect, useMemo, useState } from "react"
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
  priceImpact: string
  transactions: any[]
  estimatedGas?: string
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
  const [isSwapping, setIsSwapping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [priceImpactWarning, setPriceImpactWarning] = useState(false)

  const validateAndSetAmount = useCallback((value: string) => {
    setError(null)

    // Allow empty string
    if (value === "") {
      setFromAmount("")
      return
    }

    // Remove any non-numeric characters except decimal point
    const cleanValue = value.replace(/[^0-9.]/g, "")

    // Prevent multiple decimal points
    const parts = cleanValue.split(".")
    if (parts.length > 2) return

    // Limit decimal places to 6
    if (parts[1] && parts[1].length > 6) return

    // Convert to number and validate
    const numValue = Number.parseFloat(cleanValue)

    // Prevent negative values, NaN, and extremely large numbers
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

  const fetchSwapRoute = useCallback(async () => {
    if (!fromToken || !toToken || !fromAmount || Number.parseFloat(fromAmount) <= 0) {
      setRoute(null)
      setToAmount("")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/swap-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenIn: fromToken.id,
          tokenOut: toToken.id,
          amountIn: fromAmount,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch route: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setRoute(data)
      setToAmount(data.amountOut)

      // Check price impact
      const impact = Number.parseFloat(data.priceImpact)
      setPriceImpactWarning(impact > 5) // Warn if > 5%
    } catch (error) {
      console.error("[dex] Route fetch failed:", error)
      setError(error instanceof Error ? error.message : "Failed to calculate route")
      setRoute(null)
      setToAmount("")
    } finally {
      setIsLoading(false)
    }
  }, [fromToken, toToken, fromAmount])

  const executeSwap = useCallback(async () => {
    if (!route || !account || !walletConnected) return

    setIsSwapping(true)
    setError(null)

    try {
      // Execute swap transactions
      for (const transaction of route.transactions) {
        // This would integrate with the actual wallet
        console.log("[dex] Executing transaction:", transaction)
      }

      // Reset form on success
      setFromAmount("")
      setToAmount("")
      setRoute(null)
    } catch (error) {
      console.error("[dex] Swap failed:", error)
      setError(error instanceof Error ? error.message : "Swap failed")
    } finally {
      setIsSwapping(false)
    }
  }, [route, account, walletConnected])

  const handleWalletConnect = useCallback((connected: boolean, accountData?: any) => {
    setWalletConnected(connected)
    setAccount(accountData)
  }, [])

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchSwapRoute()
    }, 800)

    return () => clearTimeout(debounce)
  }, [fetchSwapRoute])

  const isSwapDisabled = useMemo(
    () =>
      !walletConnected ||
      !fromToken ||
      !toToken ||
      !fromAmount ||
      Number.parseFloat(fromAmount) <= 0 ||
      isLoading ||
      isSwapping ||
      !!error,
    [walletConnected, fromToken, toToken, fromAmount, isLoading, isSwapping, error],
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
            Intear Dex
            <Image
           src="/logo.svg"
            alt="Intear DEX Logo"
            width={32}
            height={32}
            className="h-8 w-8"
            priority
           />
          </h1>
          <p className="text-gray-400 ">Lightning-fast swaps on NEAR Protocol</p>
        </motion.div>

        <WalletConnect connected={walletConnected} onConnect={handleWalletConnect} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card className="p-8 bg-white border-2 border-black shadow-xl rounded-xl">
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-lg font-bold text-black ">From</label>
                  {estimatedValue && <span className="text-sm text-gray-600 ">${estimatedValue}</span>}
                </div>

                <div className="space-y-3">
                  <TokenSelector token={fromToken} onSelect={setFromToken} placeholder="Select Token" />

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
                  <TokenSelector token={toToken} onSelect={setToToken} placeholder="Select Token" />

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
                  ) : (
                    <div className="flex items-center gap-3">
                      Swap Tokens
                      <Image
                      src="/logo.svg"
                      alt="Intear DEX Logo"
                      width={24}
                      height={24}
                      className="h-6 w-6"
                      />
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
