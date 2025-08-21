"use client"

import { Button } from "@/components/ui/button"
import { AnimatePresence, motion } from "framer-motion"
import { Check, ChevronDown, Copy, ExternalLink, Wallet } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

interface WalletConnectProps {
  connected: boolean
  onConnect: (connected: boolean, account?: any, wallet?: any) => void
}

const WALLET_OPTIONS = [
  {
    id: "my-near-wallet",
    name: "MyNEAR Wallet",
    icon: "https://imgs.search.brave.com/7hvEcjjQ5UfsaE_s7jr7Cj8vHKnwSiDTyvpHtk_FpbM/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9zdGF0/aWNmaWxlcy5nbGVh/cC5pby9naGVscGNl/bnRlcl9sb2dvcy94/TmJZUFluYzJKa25J/clRFb0xEMVg4aEJp/S1NxcUNDTGxybjlj/dEFYM0RNcVZudXdn/RDA0a1JkN3FBMzY1/MWRHWUdMM1NYRVZP/bDEuanBn",
    url: "https://app.mynearwallet.com",
  },
  {
    id: "meteor-wallet",
    name: "Meteor Wallet",
    icon: "https://imgs.search.brave.com/O-AFLX6C_T2Fpgh4G7Vf0KvDllTwzmPRpRQ9787PByg/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9sZWFy/bm5lYXIuY2x1Yi93/cC1jb250ZW50L3Vw/bG9hZHMvMjAyMy8w/MS9tZXRlb3Itd2Fs/bGV0LW5lYXItbG9n/by5zdmc",
    url: "https://meteorwallet.app",
  },
  {
    id: "hot-wallet",
    name: "Hot Wallet",
    icon: "https://imgs.search.brave.com/gq0hyFTUrqcAQDX6MLZK4MdKs62_YowEdObU2Pejf7Q/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9ob3Qt/bGFicy5vcmcvaW1h/Z2VzL2hlcmUtbG9n/by1ib3JkZXIucG5n",
    url: "https://hotwallet.com",
  },
];

let globalSelector: any = null

export default function WalletConnect({ connected, onConnect }: WalletConnectProps) {
  const [account, setAccount] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showWallets, setShowWallets] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [availableWallets, setAvailableWallets] = useState<string[]>([])

  const initWalletSelector = useCallback(async () => {
    if (globalSelector) {
      console.log("[v1] Using existing wallet selector")
      return globalSelector
    }

    try {
      console.log("[v1] Initializing wallet selector")

      const { setupWalletSelector } = await import("@near-wallet-selector/core")
      const { setupMyNearWallet } = await import("@near-wallet-selector/my-near-wallet")
      const walletModules = [setupMyNearWallet()]

      try {
        const { setupMeteorWallet } = await import("@near-wallet-selector/meteor-wallet")
        walletModules.push(setupMeteorWallet())
        console.log("[v1] Meteor wallet module loaded")
      } catch (e) {
        console.warn("[v1] Meteor wallet module not available:", e)
      }

      try {
        const { setupHotWallet } = await import("@near-wallet-selector/hot-wallet")
        walletModules.push(setupHotWallet())
        console.log("[v1] Hot wallet module loaded")
      } catch (e) {
        console.warn("[v1] Hot wallet module not available:", e)
      }

      const walletSelector = await setupWalletSelector({
        network: "mainnet",
        modules: walletModules,
      })

      globalSelector = walletSelector

      const state = walletSelector.store.getState()
      const available = state.modules.map((module: any) => module.id)
      setAvailableWallets(available)
      console.log("[v1] Available wallets:", available)
      console.log("[v1] Wallet selector initialized successfully")

      const isSignedIn = walletSelector.isSignedIn()
      if (isSignedIn) {
        const wallet = await walletSelector.wallet()
        const accounts = await wallet.getAccounts()
        if (accounts.length > 0) {
          const accountData = accounts[0]
          setAccount(accountData)
          onConnect(true, accountData, wallet)
          console.log("[v1] Found existing wallet connection:", accountData.accountId)
        }
      }

      return walletSelector
    } catch (error) {
      console.error("[v1] Failed to initialize wallet selector:", error)
      setInitError("Failed to initialize wallet connection")
      throw error
    }
  }, [onConnect])

  useEffect(() => {
    initWalletSelector().catch(console.error)
  }, [initWalletSelector])

  const handleWalletSelect = useCallback(
    async (walletId: string) => {
      setIsLoading(true)
      setInitError(null)
      setShowWallets(false)

      try {
        console.log("[v1] Connecting to wallet:", walletId)

        const selector = await initWalletSelector()

        if (!availableWallets.includes(walletId)) {
          const walletName = WALLET_OPTIONS.find((w) => w.id === walletId)?.name || walletId
          setInitError(`${walletName} is not installed or available. Please install it first.`)
          return
        }

        try {
          const isInIframe = window !== window.top
          if (isInIframe) {
            const walletOption = WALLET_OPTIONS.find((w) => w.id === walletId)
            if (walletOption) {
              const redirectUrl = `${walletOption.url}/login?contract_id=intear.near&success_url=${encodeURIComponent(window.location.href)}&failure_url=${encodeURIComponent(window.location.href)}`
              window.open(redirectUrl, "_blank", "noopener,noreferrer")
              setInitError(`Please complete the connection in the new tab and return here.`)
              return
            }
          }

          const wallet = await selector.wallet(walletId)

          try {
            await wallet.signIn({
              contractId: "intear.near",
              methodNames: ["swap", "get_return"],
            })
          } catch (signInError: any) {
            if (signInError.message?.includes("outerHeight") || signInError.message?.includes("cross-origin")) {
              const walletOption = WALLET_OPTIONS.find((w) => w.id === walletId)
              if (walletOption) {
                window.open(walletOption.url, "_blank", "noopener,noreferrer")
                setInitError(`Please connect your wallet in the new tab and refresh this page.`)
                return
              }
            }
            throw signInError
          }

          const accounts = await wallet.getAccounts()
          if (accounts.length > 0) {
            const accountData = accounts[0]
            setAccount(accountData)
            onConnect(true, accountData, wallet)
            console.log("[v1] Wallet connected successfully:", accountData.accountId)
          }
        } catch (walletError: any) {
          console.error("[v1] Wallet connection error:", walletError)
          if (walletError.message?.includes("User closed")) {
            setInitError("Connection cancelled by user")
          } else if (walletError.message?.includes("outerHeight") || walletError.message?.includes("cross-origin")) {
            setInitError(
              "Due to browser security restrictions, please click the redirect button to connect your wallet in a new tab.",
            )
          } else {
            const walletName = WALLET_OPTIONS.find((w) => w.id === walletId)?.name || walletId
            setInitError(`Failed to connect to ${walletName}. Please try the redirect button instead.`)
          }
        }
      } catch (error) {
        console.error("[v1] Failed to connect wallet:", error)
        setInitError("Failed to connect wallet. Please try the redirect button to open your wallet directly.")
      } finally {
        setIsLoading(false)
      }
    },
    [initWalletSelector, onConnect, availableWallets],
  )

  const handleDisconnect = useCallback(async () => {
    try {
      if (globalSelector) {
        const wallet = await globalSelector.wallet()
        await wallet.signOut()
      }
      setAccount(null)
      onConnect(false)
      console.log("[v1] Wallet disconnected")
    } catch (error) {
      console.error("[v1] Failed to disconnect wallet:", error)
    }
  }, [onConnect])

  const copyAddress = useCallback(() => {
    if (account?.accountId) {
      navigator.clipboard.writeText(account.accountId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [account])

  if (connected && account) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-black text-white p-4 border-2 border-white  rounded-xl"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-white text-black flex items-center justify-center font-bold rounded-lg">W</div>
            <div>
              <p className="font-bold">
                {account.accountId.length > 20 ? `${account.accountId.slice(0, 20)}...` : account.accountId}
              </p>
              <p className="text-sm text-gray-300">Connected</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyAddress}
              className="h-8 w-8 p-0 text-white hover:bg-white hover:text-black border border-white rounded-lg"
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Check className="h-4 w-4" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="copy"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Copy className="h-4 w-4" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnect}
              className="text-white hover:bg-white hover:text-black border border-white px-3 font-bold rounded-lg"
            >
              Disconnect
            </Button>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="space-y-3 relative">
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Button
          className="w-full h-14 bg-black hover:bg-gray-800 text-white font-bold text-lg border-2 border-white  transition-all duration-200 rounded-xl"
          onClick={() => setShowWallets(!showWallets)}
          disabled={isLoading}
        >
          <Wallet className="mr-3 h-5 w-5" />
          {isLoading ? "Connecting..." : "Connect Wallet"}
          <ChevronDown className={`ml-3 h-4 w-4 transition-transform ${showWallets ? "rotate-180" : ""}`} />
        </Button>
      </motion.div>

      <AnimatePresence>
        {showWallets && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-black overflow-hidden z-50 rounded-xl"
          >
            <div className="p-2">
              {WALLET_OPTIONS.map((wallet, index) => {
                const isAvailable = availableWallets.includes(wallet.id)

                return (
                  <motion.div key={wallet.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex">
                    <button
                      onClick={() => handleWalletSelect(wallet.id)}
                      disabled={isLoading || !isAvailable}
                      className={`flex-1 p-4 flex items-center gap-4 hover:bg-black hover:text-white transition-colors disabled:opacity-50  ${
                        index < WALLET_OPTIONS.length - 1 ? "border-b border-gray-200" : ""
                      } ${index === 0 ? "rounded-t-lg" : ""} ${index === WALLET_OPTIONS.length - 1 ? "rounded-bl-lg" : ""}`}
                    >
                      <img src={wallet.icon || "/placeholder.svg"} alt={wallet.name} className="w-8 h-8 rounded-lg" />
                      <div className="flex-1 text-left">
                        <p className="font-bold">{wallet.name}</p>
                        <p className="text-xs opacity-70">
                          {isAvailable ? `Connect with ${wallet.name}` : "Not installed"}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => window.open(wallet.url, "_blank", "noopener,noreferrer")}
                      className={`p-4 hover:bg-black hover:text-white transition-colors border-l border-gray-200 ${
                        index < WALLET_OPTIONS.length - 1 ? "border-b border-gray-200" : ""
                      } ${index === 0 ? "rounded-tr-lg" : ""} ${index === WALLET_OPTIONS.length - 1 ? "rounded-br-lg" : ""}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {initError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-3 bg-white border-2 border-black rounded-lg"
        >
          <p className="text-black text-sm font-bold ">{initError}</p>
        </motion.div>
      )}
    </div>
  )
}
