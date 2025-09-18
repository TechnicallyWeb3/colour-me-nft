# Paint dApp Development Guide

This guide covers the development workflow and available scripts for the Paint dApp project.

## Quick Start

### Frontend Setup (Recommended for new development)

```bash
npm run frontend:setup
```

This comprehensive setup script will:
1. 🧹 Clean old frontend assets
2. 🐍 Run Python script to generate and minify SVG assets
3. ⛓️ Start local Hardhat node
4. 📋 Deploy contracts to local network
5. 🎨 Generate test art with token-specific traits
6. 📄 Copy assets to frontend
7. 🔨 Compile contracts and copy TypeScript types
8. 🧹 Clean up background processes

After setup completes, run:
```bash
npm run local:ui
```

### Alternative: Full Development Environment

```bash
npm run local
```

This starts everything with concurrency:
- Hardhat node
- Contract deployment
- Frontend dev server

## Available Scripts

### Root Package Scripts

#### Setup Scripts
- `npm run frontend:setup` - Complete frontend setup for local development
- `npm run frontend:setup:local` - Setup for local development
- `npm run frontend:setup:testnet` - Setup for testnet (updates config with deployed addresses)
- `npm run frontend:setup:mainnet` - Setup for mainnet (updates config with deployed addresses)

#### Network-Specific Workflows
- `npm run local` - Full local development environment (node + deploy + setup + UI)
- `npm run testnet` - Full testnet workflow (deploy + setup + UI)
- `npm run mainnet` - Full mainnet workflow (deploy + setup + UI)

#### Individual Components
- `npm run local:node` - Start only Hardhat node
- `npm run local:deploy` - Deploy contracts to local network
- `npm run local:ui` - Start frontend with local network config
- `npm run testnet:deploy` - Deploy contracts to Sepolia testnet
- `npm run testnet:setup` - Setup frontend for testnet
- `npm run testnet:ui` - Start frontend with testnet config
- `npm run mainnet:deploy` - Deploy contracts to Polygon mainnet
- `npm run mainnet:setup` - Setup frontend for mainnet
- `npm run mainnet:ui` - Start frontend with mainnet config

#### Utilities
- `npm run test` - Run Hardhat tests
- `npm run deploy` - Deploy contracts (configured network)
- `npm run reset` - Reset SVG data on localhost

### Frontend Package Scripts

- `npm run dev` - Standard Vite dev server
- `npm run dev:local` - Dev server with local network (VITE_NETWORK=local)
- `npm run dev:testnet` - Dev server with testnet network (VITE_NETWORK=testnet)
- `npm run dev:mainnet` - Dev server with mainnet network (VITE_NETWORK=mainnet)
- `npm run build:local` - Build for local network
- `npm run build:testnet` - Build for testnet
- `npm run build:mainnet` - Build for mainnet

## Network Configuration

The frontend automatically detects the network based on the `VITE_NETWORK` environment variable:

### Local Development (default)
- **Network**: Hardhat Local (Chain ID: 31337)
- **RPC**: http://127.0.0.1:8545
- **Contract**: Dynamically deployed

### Testnet
- **Network**: Sepolia Testnet (Chain ID: 11155111)
- **RPC**: https://ethereum-sepolia-rpc.publicnode.com
- **Contract**: 0xcf0D7b4feece555D2C4347565fe4147e89255c8a
- **Explorer**: https://sepolia.etherscan.io

### Mainnet
- **Network**: Polygon Mainnet (Chain ID: 137)
- **RPC**: https://polygon-rpc.publicnode.com
- **Contract**: TBD (not yet deployed)
- **Explorer**: https://polygonscan.com

## Development Workflow

### 1. Initial Setup
```bash
# Install dependencies
npm install
cd frontend && npm install && cd ..

# Setup frontend assets and contracts
npm run frontend:setup
```

### 2. Development
```bash
# Start local development (includes node + deployment + frontend)
npm run local

# OR start just the frontend (if node is already running)
npm run local:ui
```

### 3. Testing
```bash
# Run all tests
npm run test

# Run specific test file
npx hardhat test test/02-ColourMeNFT.test.ts
```

### 4. Deployment to Testnet/Mainnet
```bash
# Set up environment variables in .env file:
# OWNER_MNEMONIC=your_mnemonic_phrase
# ETHERSCAN_API_KEY=your_etherscan_api_key  
# POLYGONSCAN_API_KEY=your_polygonscan_api_key

# Deploy to testnet (Sepolia) - full workflow
npm run testnet

# OR deploy step by step:
npm run testnet:deploy    # Deploy contracts
npm run testnet:setup     # Update frontend config with deployed addresses
npm run testnet:ui        # Start frontend

# Deploy to mainnet (Polygon) - full workflow
npm run mainnet

# OR deploy step by step:
npm run mainnet:deploy    # Deploy contracts 
npm run mainnet:setup     # Update frontend config with deployed addresses
npm run mainnet:ui        # Start frontend
```

## File Structure

```
paint-dapp/
├── contracts/              # Smart contracts
├── scripts/                # Deployment and utility scripts
│   ├── generate-test-art.ts # Generates test NFT with proper traits
│   └── setup-frontend.js   # Complete frontend setup script
├── frontend/               # React frontend
│   ├── src/
│   │   ├── utils/
│   │   │   ├── blockchain.ts # Network configs and contract interactions
│   │   │   └── encoding.ts   # Packed object encoding utilities
│   │   └── assets/          # SVG assets (auto-generated)
├── assets/                 # Source SVG files
├── ignition/               # Hardhat Ignition deployment modules
└── test/                   # Contract tests
```

## Key Features

### Packed Object Encoding
The latest version uses highly optimized packed object encoding:
- **60-80% gas savings** compared to unpacked structs
- **First 6 points** packed into single uint256 (ultra-efficient)
- **Additional points** stored as compact bytes (4 bytes per point)
- **Real-time validation** prevents failed transactions

### Network Switching & Automatic Configuration
Frontend automatically adapts to different networks:
- **Local**: Uses dynamically deployed contracts from local Hardhat node
- **Testnet**: Automatically updates config with Sepolia deployment addresses
- **Mainnet**: Automatically updates config with Polygon deployment addresses
- **Smart Address Detection**: Setup script reads from Ignition deployments and updates frontend config

### Development Tools
- **Debug Panel**: Real-time monitoring of SVG messages, localStorage, and blockchain interactions
- **Transaction Queue**: Handles large art uploads with automatic chunking
- **Trait-Aware Art Generation**: Test art respects token-specific colors and shapes

## Troubleshooting

### Common Issues

1. **"Contract not found" error**
   - Run `npm run frontend:setup` to redeploy contracts
   - Check that Hardhat node is running on port 8545

2. **"Network mismatch" error**
   - Ensure MetaMask is connected to the correct network
   - Use network-specific scripts (local:ui, testnet, mainnet)

3. **"Frontend assets missing" error**
   - Run the Python script: `python minify_and_split.py`
   - Or run full setup: `npm run frontend:setup`

4. **TypeScript errors in frontend**
   - Recompile contracts: `npx hardhat compile`
   - Copy types: manually copy `typechain-types/` to `frontend/src/`

### Reset Everything
```bash
# Clean all generated files and restart
rm -rf frontend/src/assets/*.svg
rm -rf frontend/src/typechain-types/
rm -rf ignition/deployments/
npm run frontend:setup
```

## Contributing

1. Always run `npm run frontend:setup` after pulling changes
2. Test with `npm run test` before committing
3. Use network-specific scripts for testing different environments
4. Check the debug panel for real-time development insights

---

Happy painting! 🎨
