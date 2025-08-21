"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { motion } from "framer-motion"
import { ChevronDown, Search } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

interface Token {
  id: string
  symbol: string
  name: string
  decimals: number
  icon?: string
  price?: number
  change24h?: number
}

interface TokenSelectorProps {
  token: Token | null
  onSelect: (token: Token) => void
  placeholder: string
}

export default function TokenSelector({ token, onSelect, placeholder }: TokenSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [tokens, setTokens] = useState<Token[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchTokens = useCallback(async () => {
    setIsLoading(true)
    try {
      console.log("[v1] Fetching tokens from API")
      const response = await fetch("/api/tokens", {
        method: "GET",
        headers: { "Accept": "application/json" },
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const tokenData = await response.json()

      if (Array.isArray(tokenData) && tokenData.length > 0) {
        const transformedTokens: Token[] = tokenData.map((t: any) => ({
          id: t.id || t.account_id || t.token_id,
          symbol: t.symbol || "UNKNOWN",
          name: t.name || "Unknown Token",
          decimals: t.decimals || 18,
          icon: t.icon || undefined,
          price: t.price ? Number(t.price) : undefined,
          change24h: t.change24h ? Number(t.change24h) : undefined,
        })).filter((t: Token) => t.id && t.symbol && t.name)

        setTokens(transformedTokens)
        console.log("[v1] Loaded tokens:", transformedTokens.length, transformedTokens)
      } else {
        throw new Error("Invalid token data received")
      }
    } catch (error) {
      console.error("[v1] Failed to fetch tokens:", error)
      // Use fallback tokens with proper validation
      const fallbackTokens: Token[] = [
        {
          id: "near",
          symbol: "NEAR",
          name: "NEAR Protocol",
          decimals: 24,
          price: 4.25,
          change24h: 2.5,
        },
        {
          id: "wrap.near",
          symbol: "wNEAR",
          name: "Wrapped NEAR",
          decimals: 24,
          price: 4.25,
          change24h: 2.5,
        },
        {
          id: "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
          symbol: "USDC",
          name: "USD Coin",
          decimals: 6,
          price: 1.0,
          change24h: 0.1,
        },
        {
          id: "dac17f958d2ee523a2206206994597c13d831ec7.factory.bridge.near",
          symbol: "USDT",
          name: "Tether USD",
          decimals: 6,
          price: 1.0,
          change24h: -0.05,
        },
        {
          id: "aurora",
          symbol: "AURORA",
          name: "Aurora",
          decimals: 18,
          price: 0.15,
          change24h: -1.2,
        },
      ]

      // Validate fallback tokens
      const validatedFallbackTokens = fallbackTokens.filter(t => t.id && t.symbol && t.name && Number.isInteger(t.decimals))
      setTokens(validatedFallbackTokens)
      console.log("[v1] Using fallback tokens:", validatedFallbackTokens.length)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTokens()
  }, [fetchTokens])

  const filteredTokens = tokens.filter(
    (t) =>
      t.symbol?.toLowerCase().includes(search.toLowerCase()) || t.name?.toLowerCase().includes(search.toLowerCase()),
  )

  const handleSelect = useCallback((selectedToken: Token) => {
    // Validate selected token before passing it up
    if (!selectedToken.id || !selectedToken.symbol || !Number.isInteger(selectedToken.decimals)) {
      console.error("[v1] Invalid token selected:", selectedToken)
      return
    }

    console.log("[v1] Token selected:", selectedToken)
    onSelect(selectedToken)
    setOpen(false)
    setSearch("")
  }, [onSelect])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            variant="outline"
            className="bg-white border-2 border-black text-black hover:bg-black hover:text-white  font-bold min-w-[120px] justify-between h-12 transition-all duration-200 rounded-lg"
          >
            {token ? (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-black text-white flex items-center justify-center text-xs font-bold rounded">
                  {token.symbol.charAt(0)}
                </div>
                {token.symbol}
              </div>
            ) : (
              placeholder
            )}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </motion.div>
      </DialogTrigger>
      <DialogContent className="bg-white border-2 border-black max-w-md rounded-xl" aria-describedby="token-selector-description">
        <DialogHeader>
          <DialogTitle className=" font-bold text-black text-xl">Select Token</DialogTitle>
          <DialogDescription id="token-selector-description" className="sr-only">
            Select a token to trade from the available options.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-black" />
            <Input
              placeholder="Search tokens..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white border-2 border-black text-black  font-bold h-12 rounded-lg"
            />
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {isLoading ? (
              <div className="text-center py-8  font-bold text-black">Loading tokens...</div>
            ) : filteredTokens.length === 0 ? (
              <div className="text-center py-8  font-bold text-black">No tokens found</div>
            ) : (
              filteredTokens.map((t) => (
                <motion.div key={t.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="ghost"
                    className="w-full justify-between bg-white hover:bg-black hover:text-white text-black border-b border-gray-200  font-bold h-16 transition-all duration-200 rounded-lg"
                    onClick={() => handleSelect(t)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-black text-white flex items-center justify-center text-sm font-bold rounded-lg">
                        {t.symbol.charAt(0)}
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-lg">{t.symbol}</div>
                        <div className="text-xs opacity-70">{t.name}</div>
                      </div>
                    </div>
                    {t.price && (
                      <div className="text-right">
                        <div className="font-bold">${t.price.toFixed(2)}</div>
                        {t.change24h !== undefined && (
                          <div className={`text-xs ${t.change24h >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {t.change24h >= 0 ? "+" : ""}
                            {t.change24h.toFixed(2)}%
                          </div>
                        )}
                      </div>
                    )}
                  </Button>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
