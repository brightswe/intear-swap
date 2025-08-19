"use client"

interface SwapRouteProps {
  route: {
    route: string[]
    amountOut: string
    priceImpact: string
    transactions: any[]
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
      </div>
    </div>
  )
}
