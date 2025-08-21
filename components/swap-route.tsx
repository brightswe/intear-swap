"use client"

interface SwapRouteProps {
  route: {
    route: string[]
    amountOut: string
    minimumReceived: string
    priceImpact: string
    estimatedGas: string
    fee: string
    transactions: any[]
    dexId: string
    useIntents: boolean
  }
}

export default function SwapRoute({ route }: SwapRouteProps) {
  return (
    <div className="bg-gray-50 border border-black p-3 font-mono text-sm">
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-600">ROUTE:</span>
          <span className="text-black">{route.route.join(" → ")}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">PRICE IMPACT:</span>
          <span className="text-black">{route.priceImpact}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">TRANSACTIONS:</span>
          <span className="text-black">{route.transactions.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">MIN RECEIVED:</span>
          <span className="text-black">{route.minimumReceived}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">FEE:</span>
          <span className="text-black">{route.fee}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">GAS ESTIMATE:</span>
          <span className="text-black">{route.estimatedGas} NEAR</span>
        </div>
        {route.useIntents && <div className="text-blue-600">Using Near Intents for optimal routing</div>}
      </div>
    </div>
  )
}
