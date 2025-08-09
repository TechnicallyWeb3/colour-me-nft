# Paint DApp Deployment Guide

This guide explains how to deploy the PaintRenderer and PaintNFT contracts for the final testing phase.

## Prerequisites

1. Make sure you have the required dependencies installed:
   ```bash
   npm install
   ```

2. Ensure you have a Hardhat network configured (local or testnet)

## Deployment Steps

### 1. Deploy Contracts

Run the deployment script to deploy both contracts:

```bash
npm run deploy
```

This will:
- Deploy the `PaintRenderer` contract
- Read the SVG files from `assets/paint.final.start.svg` and `assets/paint.final.end.svg`
- Deploy the `PaintNFT` contract with the proper constructor parameters
- Save deployment information to `deployment.json`

### 2. Test the Deployment

After deployment, test the contracts to ensure everything works correctly:

```bash
npm run test-deployment
```

This will:
- Mint an NFT
- Check token ownership
- Verify traits generation
- Test SVG rendering
- Add some test art to the NFT
- Generate and save the final SVG output

## Contract Addresses

After deployment, the contract addresses will be saved in `deployment.json`:

```json
{
  "network": "hardhat",
  "deployer": "0x...",
  "paintRenderer": "0x...",
  "paintNFT": "0x...",
  "deploymentTime": "2024-..."
}
```

## Expected Output

The final SVG output should be similar to `assets/paint.final.svg`, containing:
- The toolbar with color palette, brush sizes, shapes, and tools
- The canvas area
- Dynamic content generated from the blockchain traits
- Interactive JavaScript functionality

## Customization

You can modify the deployment parameters in `scripts/deploy.ts`:
- NFT name and symbol
- Base URL for external links
- Maximum supply
- SVG start and end files

## Troubleshooting

1. **SVG files not found**: Ensure `assets/paint.final.start.svg` and `assets/paint.final.end.svg` exist
2. **Deployment fails**: Check your network configuration and account balance
3. **TypeScript errors**: Make sure all dependencies are installed correctly

## Next Steps

After successful deployment and testing:
1. Update the base URL in the deployment script to your actual domain
2. Deploy to your target network (mainnet, testnet, etc.)
3. Integrate with your frontend application
4. Test the full dApp functionality 