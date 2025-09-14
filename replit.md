# Overview

ColourMeNFT is an interactive NFT art creation platform that allows users to create, customize, and mint unique NFT artwork on blockchain networks. The project combines Solidity smart contracts with a modern React frontend to provide a complete dApp experience. Users can paint and modify artwork using various shapes and colors, with all modifications stored directly on-chain. The platform features dynamic NFT generation with unique traits, built-in royalty systems, and deployment across multiple networks including local development, testnet, and mainnet environments.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Smart Contract Architecture
The core blockchain functionality is built using Solidity 0.8.28 with two main contracts:

- **ColourMeNFT Contract**: Main ERC721 NFT contract that handles minting, ownership, and art data storage. Features include configurable mint pricing, supply limits, time-based minting windows, and on-chain art modification capabilities.
- **ColourMeRenderer Contract**: Handles SVG generation and rendering logic, converting encoded art objects into displayable SVG format with trait generation for unique visual characteristics.

The contracts use a custom encoding system to efficiently pack art objects (shapes, colors, coordinates) into blockchain storage, optimizing for gas costs while maintaining flexibility.

## Frontend Architecture
React 19 with TypeScript and Vite for fast development and modern tooling:

- **Component Structure**: Modular React components including SVG display, wallet connection, window management, and paint interface
- **Blockchain Integration**: ethers.js v6 for Web3 connectivity with TypeScript type safety through generated contract interfaces
- **Multi-Network Support**: Environment-based configuration supporting local Hardhat, Sepolia testnet, and Base mainnet deployments
- **UI Design**: Retro 90s/millennium aesthetic with Windows XP-style interface elements

## Development Workflow
Comprehensive development setup with automated tooling:

- **Asset Pipeline**: Python script for SVG minification and optimization to reduce on-chain storage costs
- **Contract Deployment**: Hardhat Ignition modules for consistent deployment across networks
- **Frontend Build System**: Vite with environment-specific builds and cross-platform development support
- **Testing Suite**: Comprehensive test coverage for encoding, rendering, and NFT functionality

## Data Storage and Encoding
Custom binary encoding system for efficient on-chain art storage:

- **Object Encoding**: Packs shape type, color data, stroke width, and coordinate points into optimized uint256 base values
- **Additional Points**: Overflow point data stored in separate bytes array for complex shapes
- **SVG Generation**: Dynamic SVG creation from encoded data with trait-based styling

# External Dependencies

## Blockchain Networks
- **Local Development**: Hardhat local network (chain ID 31337) for development and testing
- **Sepolia Testnet**: Ethereum testnet for staging and integration testing
- **Base Mainnet**: Layer 2 solution for production deployment with lower transaction costs

## Smart Contract Dependencies
- **OpenZeppelin Contracts v5.4.0**: Industry-standard implementations for ERC721, Ownable, and ERC2981 royalty standards
- **Hardhat Toolbox**: Development framework providing testing, deployment, and verification tools

## Frontend Dependencies
- **React 19 + TypeScript**: Modern frontend framework with type safety
- **ethers.js v6**: Ethereum library for blockchain interaction
- **React Router DOM**: Client-side routing for single-page application navigation
- **Vite**: Fast build tool and development server

## Development Tools
- **Hardhat**: Ethereum development environment for contract compilation, testing, and deployment
- **TypeChain**: Automatic TypeScript bindings generation for smart contracts
- **Python 3.7+**: Asset processing and SVG optimization scripts
- **Node.js 16+**: Runtime environment for build tools and development server

## External Services Integration
- **MetaMask/Web3 Wallets**: User authentication and transaction signing
- **IPFS/Arweave**: Potential decentralized storage for metadata (configurable)
- **Block Explorers**: Etherscan (Sepolia) and BaseScan (Base) for transaction verification
- **OpenSea**: NFT marketplace integration for trading and display