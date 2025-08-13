# Colour Me NFT - Interactive NFT Art Creation Platform

A decentralized application (dApp) that allows users to create, customize, and mint unique NFT artwork on the Polygon blockchain. Built with Solidity smart contracts and a modern web interface.

## 🎨 Features

- **Interactive Paint Canvas**: Create artwork using various shapes, colours, and tools
- **Dynamic NFT Generation**: Each NFT has unique traits including colours, shapes, and polygon configurations
- **On-Chain Art Storage**: Artwork modifications are stored directly on the blockchain
- **Royalty System**: Built-in royalty support for creators
- **Polygon Integration**: Deployed on Polygon for low-cost transactions

## 🏗️ Project Structure

```
paint-dapp/
├── contracts/           # Solidity smart contracts
│   ├── PaintNFT.sol    # Main NFT contract with art storage
│   ├── PaintRenderer.sol # SVG rendering and art generation
│   ├── interfaces/      # Contract interfaces
│   └── types.sol        # Shared data types
├── assets/              # Frontend assets and HTML files
│   ├── paint-app.html  # Main paint application
│   ├── paint.full.svg  # Full SVG template
│   └── colour-me-nft.html # NFT viewer
├── test/                # Contract test files
├── ignition/            # Hardhat Ignition deployment modules
└── minify_and_split.py  # SVG optimization script
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Python 3.7+
- MetaMask or compatible Web3 wallet
- Polygon network access

### Installation

1. Clone the repository:
```bash
git clone https://github.com/technicallyweb3/colour-me-nft.git
cd paint-dapp
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

## 🔧 Development

### Building Contract Interfaces

Generate TypeScript interfaces for your smart contracts:

```bash
npx hardhat build --interfaces
```

This command will create TypeScript interfaces based on your Solidity contracts, making it easier to interact with them from your frontend code.

### Compiling Contracts

```bash
npx hardhat compile
```

### Running Tests

```bash
npm test
```

Run tests with gas reporting:
```bash
REPORT_GAS=true npm test
```

### Local Development Network

```bash
npx hardhat node
```

### Deploying Contracts

Deploy using Hardhat Ignition:
```bash
npx hardhat ignition deploy ./ignition/modules/NFT.ts
```

## 🎨 SVG Optimization

The project includes a Python script to optimize and split the main SVG template for efficient on-chain storage.

### Minifying and Splitting SVG

Run the optimization script to process the full SVG:

```bash
python minify_and_split.py
```

This script will:
- Remove unnecessary whitespace and comments
- Split the SVG into start and end parts for dynamic content insertion
- Create optimized versions:
  - `paint.min.start.svg` - Static beginning of SVG
  - `paint.min.end.svg` - Static ending of SVG  
  - `paint.min.svg` - Fully minified complete SVG

The split parts are designed to work with the smart contract's `setSVG()` function, allowing for efficient storage of the static SVG components while keeping the dynamic art content separate.

## 📱 Frontend

### Paint Application

The main paint interface is located at `assets/paint-app.html`. It provides:
- Interactive canvas for creating artwork
- Colour palette selection
- Shape tools (rectangle, ellipse, line, polyline, polygon)
- Web3 wallet integration
- NFT minting capabilities

### NFT Viewer

View and interact with minted NFTs at `assets/colour-me-nft.html`.

## 🔗 Smart Contracts

### PaintNFT.sol

The main NFT contract that handles:
- NFT minting with random trait generation
- Art storage and modification
- SVG generation and metadata
- Royalty management

### PaintRenderer.sol

Handles SVG rendering and art generation:
- Shape and polygon rendering
- Colour palette generation
- Trait visualization

## 🧪 Testing

The project includes comprehensive tests for both contracts:

- `00-PaintRenderer.test.ts` - Tests for SVG rendering functionality
- `01-PaintNFT.test.ts` - Tests for NFT minting and art management

## 🚀 Deployment

### Polygon Mainnet

1. Configure your deployment settings in `hardhat.config.ts`
2. Set up your private keys and RPC endpoints
3. Deploy using Ignition:
```bash
npx hardhat ignition deploy ./ignition/modules/NFT.ts --network polygon
```

### Test Networks

For testing on Mumbai testnet:
```bash
npx hardhat ignition deploy ./ignition/modules/NFT.ts --network mumbai
```

## 📚 Scripts

- `npm test` - Run contract tests
- `npm run deploy` - Deploy contracts
- `npm run test-deployment` - Test deployment functionality

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the AGPL-3.0 License - see the LICENSE file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/technicallyweb3/colour-me-nft/issues)
- **Discussions**: [GitHub Discussions](https://github.com/technicallyweb3/colour-me-nft/discussions)

## 🙏 Acknowledgments

- Built with [Hardhat](https://hardhat.org/) development framework
- Uses [OpenZeppelin](https://openzeppelin.com/) contracts for security
- Deployed with [Hardhat Ignition](https://ignition.hardhat.org/) for reliable deployments
