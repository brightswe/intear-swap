Intear DEX Aggregator

The Intear DEX Aggregator is a decentralized application (dApp) built on the NEAR Protocol that provides a seamless interface for users to execute token swaps with the best possible rates. By integrating with the Intear DEX Aggregator API, this client analyzes and routes trades across multiple liquidity sources, ensuring optimal pricing, low slippage, and a user-friendly experience.

This project was developed as a solution to the Intear DEX Aggregator bounty, fulfilling all key requirements for a robust and production-ready application.

Features
Optimal Routing: Leverages the Intear DEX Aggregator API to find the most efficient swap routes across over 10 different liquidity sources on NEAR.

Multi-Wallet Support: Connects with popular NEAR wallets, including Intear Wallet, Meteor Wallet, and Hot Wallet, using @near-wallet-selector.

Intuitive UI: A clean, fast, and responsive user interface that simplifies the token swapping process.

Real-time Data: Provides up-to-the-minute details on price impact, fees, and gas estimates before a transaction is executed.

Smart Transaction Handling:

Automatically wraps and unwraps NEAR tokens as needed.

Handles NEP-413 signing for swaps via Near Intents.

Manages the unwrapping of leftover tokens after slippage-based trades.

Configurable Fees: The application is designed to allow for the easy integration of custom fees to support monetization.

Live Application
The Intear DEX Aggregator Client is live and fully functional on NEAR Mainnet.

Live URL: [Insert Live Mainnet URL Here]

We encourage you to use the application and provide feedback to help us improve the experience.

Getting Started
Prerequisites
Node.js (v16 or higher)

Yarn or npm

A NEAR wallet account for testing on Mainnet.

Installation
Clone the repository:

git clone https://github.com/brightswe/intear-swap.git
cd intear-dex-client
Install dependencies:

yarn install
# or
npm install
Set up environment variables:
Create a .env.local file in the root directory and add the following:

NEXT_PUBLIC_API_URL=https://api.intear.tech
Run the application:

yarn dev
# or
npm run dev
The application will be accessible at http://localhost:3000.

Technology Stack
Frontend Framework: Next.js

Language: TypeScript

Styling: Tailwind CSS

State Management: React Context or a similar solution

Wallet Integration: @near-wallet-selector

Animations: framer-motion

Notifications: sonner

Development
The project structure is designed for clarity and maintainability.

pages/index.tsx: The main swap interface.

components/: Reusable UI components (e.g., TokenSelector.tsx, WalletConnect.tsx).

services/: Logic for API calls and blockchain interactions.

To customize the application, you can modify the API calls in the services directory or update UI components in the components folder.
