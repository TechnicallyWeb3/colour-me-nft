# Hardhat Tasks

This folder contains custom Hardhat tasks for the paint-dapp project.

## Available Tasks

### reset-svg

Resets the SVG data in the ColourMeNFT contract without needing to redeploy.

**Usage:**
```bash
npx hardhat reset-svg --contract <contract_address>
```

**Parameters:**
- `--contract` (required): The contract address to update
- `--start` (optional): Path to SVG start file (default: assets/colour-me.min.start.svg)
- `--end` (optional): Path to SVG end file (default: assets/colour-me.min.end.svg)

**Examples:**
```bash
# Use default SVG files
npx hardhat reset-svg --contract 0x1234...5678

# Use custom SVG files
npx hardhat reset-svg --contract 0x1234...5678 --start assets/my-start.svg --end assets/my-end.svg
```

**Requirements:**
- Contract must be deployed
- Caller must be the contract owner
- SVG files must exist at the specified paths
