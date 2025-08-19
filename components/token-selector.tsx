"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { motion } from "framer-motion"
import { AlertCircle, ChevronDown, RefreshCw, Search } from "lucide-react"
import { useEffect, useState } from "react"

interface Token {
  id: string
  symbol: string
  name: string
  decimals: number
  icon?: string
  price?: number
  change24h?: number
  marketCap?: number
  volume24h?: number
  reputation?: string
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
  const [error, setError] = useState<string | null>(null)

  const fetchTokens = async () => {
    setIsLoading(true)
    setError(null)

    try {
      console.log("[TokenSelector] Starting token fetch...")
      console.log("[TokenSelector] API endpoint: /api/tokens")

      const response = await fetch("/api/tokens", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log("[TokenSelector] Response status:", response.status)
      console.log("[TokenSelector] Response headers:", Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[TokenSelector] Error response:", errorText)
        throw new Error(`API request failed: ${response.status} ${response.statusText}. Response: ${errorText}`)
      }

      const responseText = await response.text()
      console.log("[TokenSelector] Raw response (first 500 chars):", responseText.substring(0, 500))

      let tokenData
      try {
        tokenData = JSON.parse(responseText)
      } catch (parseError) {
        console.error("[TokenSelector] JSON parse error:", parseError)
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}...`)
      }

      console.log("[TokenSelector] Parsed token data:", tokenData)
      console.log("[TokenSelector] Token data type:", typeof tokenData)
      console.log("[TokenSelector] Is array:", Array.isArray(tokenData))

      // Log the first few items to see the actual structure
      if (Array.isArray(tokenData) && tokenData.length > 0) {
        console.log("[TokenSelector] First token structure:", JSON.stringify(tokenData[0], null, 2))
        console.log("[TokenSelector] Second token structure:", JSON.stringify(tokenData[1], null, 2))
        console.log("[TokenSelector] Keys in first token:", Object.keys(tokenData[0]))
      }

      if (!Array.isArray(tokenData)) {
        console.error("[TokenSelector] Expected array but got:", typeof tokenData)
        throw new Error(`Expected array of tokens, but received ${typeof tokenData}`)
      }

      if (tokenData.length === 0) {
        console.warn("[TokenSelector] Received empty token array")
        setError("No tokens available from API")
        setTokens([])
        return
      }

      // Validate token structure - handle different possible response formats
      const validTokens = tokenData.filter((t: any) => {
        console.log("[TokenSelector] Checking token:", JSON.stringify(t, null, 2))

        // Check if it has the required fields
        const hasRequiredFields = t &&
          typeof t.id === 'string' &&
          typeof t.symbol === 'string' &&
          typeof t.name === 'string'

        // Also check alternative field names that might come from intear.tech
        const hasAlternativeFields = t && (
          (t.token_id && typeof t.token_id === 'string') ||
          (t.contractId && typeof t.contractId === 'string')
        ) && t.symbol && t.name

        if (!hasRequiredFields && !hasAlternativeFields) {
          console.warn("[TokenSelector] Invalid token structure. Expected fields: id, symbol, name. Got:", Object.keys(t || {}))
          console.warn("[TokenSelector] Token data:", t)
        }

        return hasRequiredFields || hasAlternativeFields
      })

      console.log("[TokenSelector] Valid tokens count:", validTokens.length)
      setTokens(validTokens)

    } catch (error) {
      console.error("[TokenSelector] Fetch error:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      setError(errorMessage)
      setTokens([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTokens()
  }, [])

  const filteredTokens = tokens.filter(
    (t) =>
      t.symbol?.toLowerCase().includes(search.toLowerCase()) ||
      t.name?.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (selectedToken: Token) => {
    onSelect(selectedToken)
    setOpen(false)
    setSearch("")
  }

  const handleRetry = () => {
    fetchTokens()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            variant="outline"
            className="bg-white border-2 border-black text-black hover:bg-black hover:text-white font-bold min-w-[120px] justify-between h-12 transition-all duration-200 rounded-lg"
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
      <DialogContent className="bg-white border-2 border-black max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle className="font-bold text-black text-xl">Select Token</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-black" />
            <Input
              placeholder="Search tokens..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white border-2 border-black text-black font-bold h-12 rounded-lg"
            />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1">
            {isLoading ? (
              <div className="text-center py-8 font-bold text-black flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading tokens...
              </div>
            ) : error ? (
              <div className="text-center py-8 space-y-4">
                <div className="flex items-center justify-center gap-2 text-red-600 font-bold">
                  <AlertCircle className="h-4 w-4" />
                  Error loading tokens
                </div>
                <div className="text-xs text-gray-600 px-4">
                  {error}
                </div>
                <Button
                  onClick={handleRetry}
                  variant="outline"
                  className="bg-white border-2 border-black text-black hover:bg-black hover:text-white font-bold"
                >
                  Retry
                </Button>
              </div>
            ) : tokens.length === 0 ? (
              <div className="text-center py-8 font-bold text-black">
                No tokens found
              </div>
            ) : filteredTokens.length === 0 ? (
              <div className="text-center py-8 font-bold text-black">
                No tokens match your search
              </div>
            ) : (
              filteredTokens.map((t) => (
                <motion.div key={t.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="ghost"
                    className="w-full justify-between bg-white hover:bg-black hover:text-white text-black border-b border-gray-200 font-bold h-16 transition-all duration-200 rounded-lg"
                    onClick={() => handleSelect(t)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-black text-white flex items-center justify-center text-sm font-bold rounded-lg">
                        {t.icon ? (
                          <img src={t.icon} alt={t.symbol} className="w-full h-full rounded-lg object-cover" />
                        ) : (
                          t.symbol.charAt(0)
                        )}
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-lg">{t.symbol}</div>
                        <div className="text-xs opacity-70">{t.name}</div>
                        {t.reputation && t.reputation !== 'Unknown' && (
                          <div className="text-xs text-green-600 font-semibold">{t.reputation}</div>
                        )}
                      </div>
                    </div>
                    {t.price && (
                      <div className="text-right">
                        <div className="font-bold">${t.price.toFixed(4)}</div>
                        {t.change24h !== undefined && (
                          <div className={`text-xs ${t.change24h >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {t.change24h >= 0 ? "+" : ""}
                            {t.change24h.toFixed(2)}%
                          </div>
                        )}
                        {t.marketCap && (
                          <div className="text-xs opacity-60">
                            MCap: ${(t.marketCap / 1000000).toFixed(1)}M
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
