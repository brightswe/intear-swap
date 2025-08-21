Intear DEX

Intear DEX is a decentralized exchange (DEX) aggregator built on the NEAR Protocol, designed to provide users with lightning-fast token swaps by finding the best trading routes across multiple liquidity pools. Leveraging NEAR's high-performance blockchain and intent-based transaction execution, Intear DEX ensures optimal pricing, low slippage, and a seamless user experience.
Table of Contents

Overview
Features
Installation
Configuration
Usage
Development
Testing
Contributing
License
Contact

Overview
Intear DEX aggregates liquidity from various decentralized exchanges on the NEAR Protocol, utilizing the swap-route API to compute optimal trading paths and the swap-execution service to execute transactions. The platform supports multiple wallets, including MyNEAR Wallet, Meteor Wallet, and Hot Wallet, and provides a user-friendly interface for token swaps with real-time price impact and gas estimation.
Features

Optimal Routing: Finds the best swap routes across NEAR-based DEXes to minimize slippage and maximize returns.
Wallet Integration: Supports multiple NEAR wallets via @near-wallet-selector.
Real-Time Data: Fetches token prices and metadata from prices.intear.tech/tokens-reputable.
Slippage Protection: Configurable slippage settings with automatic and manual options.
Intent-Based Transactions: Supports NEAR Intents for efficient and secure transaction execution.
Price Impact Warnings: Alerts users when price impact exceeds 5%.
Testnet Support: Configurable for development and testing on NEAR testnet (to be removed in production).

Installation
Follow these steps to set up Intear DEX locally:
Prerequisites

Node.js (v16 or higher)
Yarn or npm
NEAR CLI (optional, for testnet interactions)
A NEAR wallet account (for testing)

Steps

Clone the Repository
git clone https://github.com/your-org/intear-dex.git
cd intear-dex


Install Dependencies
yarn install
# or
npm install


Set Up Environment VariablesCreate a .env.local file in the root directory and add the following:
NEXT_PUBLIC_USE_TESTNET=true # Set to false for production
NEXT_PUBLIC_API_URL=https://api.intear.tech # or your custom API endpoint


Run the Development Server
yarn dev
# or
npm run dev

The app will be available at http://localhost:3000.


Configuration

Testnet Mode: Set NEXT_PUBLIC_USE_TESTNET=true in .env.local to use the NEAR testnet for development. This enables connections to testnet versions of wallets (e.g., https://testnet.mynearwallet.com). Remove or set to false for production.
API Endpoints:
Token data: /api/tokens (proxies to prices.intear.tech/tokens-reputable)
Swap routes: /api/swap-route (proxies to api.intear.tech/v1/quote)


Wallet Configuration: The app uses @near-wallet-selector with support for MyNEAR Wallet, Meteor Wallet, and Hot Wallet. Additional wallets can be added in wallet-connect.tsx.

Usage
For Users

Connect Wallet:

Click "Connect Wallet" and select a wallet (e.g., MyNEAR Wallet).
Follow the wallet's prompts to sign in. For testnet, use a testnet wallet account.


Select Tokens:

Choose the input token ("From") and output token ("To") using the token selector.
Search for tokens by symbol or name.


Enter Swap Amount:

Input the amount to swap or use quick-select buttons (25%, 50%, MAX).
The output amount and route details (price impact, fees, gas) are displayed automatically.


Execute Swap:

Review the route and price impact.
Click "Swap Tokens" to execute the transaction.
Confirm the transaction in your wallet.
View the transaction status via a toast notification with a link to nearblocks.io.



For Developers
The project is built with Next.js, TypeScript, and Tailwind CSS. Key components:

SwapInterface: Main component handling token selection, amount input, and swap execution.
WalletConnect: Manages wallet connections and disconnections.
TokenSelector: Fetches and displays token data for selection.
SwapRoute: Displays swap route details (route, price impact, fees, etc.).

To modify the logic:

Update fetchSwapRoute in swap-interface.tsx for custom API parameters.
Adjust executeSwap to handle additional transaction types or intents.
Extend WALLET_OPTIONS in wallet-connect.tsx for new wallets.

Development
Project Structure
intear-dex/
├── components/
│   ├── ui/
│   ├── swap-interface.tsx
│   ├── wallet-connect.tsx
│   ├── token-selector.tsx
│   ├── swap-route.tsx
├── lib/
│   ├── swap-execution.ts
├── pages/
│   ├── api/
│   │   ├── tokens.ts
│   │   ├── swap-route.ts
├── public/
├── styles/
├── .env.local
├── README.md
├── package.json

Key Dependencies

@near-wallet-selector/core, @near-wallet-selector/my-near-wallet, @near-wallet-selector/meteor-wallet, @near-wallet-selector/hot-wallet
framer-motion for animations
sonner for toast notifications
next, react, typescript

Running Tests
To test on the NEAR testnet:

Set NEXT_PUBLIC_USE_TESTNET=true in .env.local.
Create a testnet wallet at https://testnet.mynearwallet.com.
Fund the wallet with testnet NEAR using the faucet.
Run the app (yarn dev) and connect the testnet wallet.
Perform swaps and verify transactions on https://testnet.nearblocks.io.

Removing Testnet for Production

Set NEXT_PUBLIC_USE_TESTNET=false in .env.local or remove the variable.
Remove the IS_TESTNET constant and related logic in wallet-connect.tsx:
Replace network: IS_TESTNET ? "testnet" : "mainnet" with network: "mainnet".
Update WALLET_OPTIONS URLs to remove testnet versions.
Update contractId in handleWalletSelect to intear.near.



Contributing
We welcome contributions! Please follow these steps:

Fork the repository.
Create a feature branch (git checkout -b feature/your-feature).
Commit changes (git commit -m "Add your feature").
Push to the branch (git push origin feature/your-feature).
Open a pull request with a detailed description.

Please adhere to the Code of Conduct and ensure code is linted and tested.
License
This project is licensed under the MIT License. See the LICENSE file for details.
Contact
For questions or support:

Email: support@intear.tech
GitHub Issues: intear-dex/issues
Discord: Intear Community


Powered by Intear DEX Aggregator • Built for the NEAR Protocol
