# Multi-Wallet Support Setup

This project now supports multiple Web3 wallets through RainbowKit and wagmi, replacing the previous fragile MetaMask-only setup.

## Supported Wallets

- **MetaMask** - Browser extension and mobile
- **WalletConnect** - Mobile wallets via QR code
- **Coinbase Wallet** - Coinbase's wallet
- **Rainbow** - Mobile-first wallet
- **Trust Wallet** - Popular mobile wallet
- **Ledger** - Hardware wallet support
- **And many more...**

## Architecture

### Core Components

1. **WalletProvider** (`src/components/WalletProvider.tsx`)
   - Wraps the entire app with RainbowKit and wagmi providers
   - Configures supported chains based on environment (local/testnet/mainnet)
   - Provides beautiful wallet selection modal

2. **useWallet Hook** (`src/hooks/useWallet.ts`)
   - Provides wallet connection state
   - Functions: `connect()`, `disconnect()`, `switchToTargetNetwork()`
   - Properties: `address`, `isConnected`, `isOnCorrectNetwork`

3. **useContract Hook** (`src/hooks/useContract.ts`)
   - Provides read and write contract instances
   - Automatically connects to the correct signer when wallet is connected
   - Handles ethers v6 integration with viem

4. **walletCompat** (`src/utils/walletCompat.ts`)
   - Backward compatibility layer for legacy code
   - Provides fallback functions for window.ethereum interactions

## Usage

### In Components

```typescript
import { useWallet } from '../hooks/useWallet';
import { useContract } from '../hooks/useContract';

function MyComponent() {
  const { address, isConnected, connect, isOnCorrectNetwork } = useWallet();
  const { writeContract } = useContract();

  const handleConnect = () => {
    connect(); // Opens RainbowKit modal
  };

  const handleMint = async () => {
    if (!isConnected) {
      connect();
      return;
    }
    
    if (!isOnCorrectNetwork) {
      // User will be prompted to switch networks
      return;
    }
    
    // Use writeContract for transactions
    const tx = await writeContract.mint(address, 1);
  };

  return (
    <div>
      {isConnected ? (
        <p>Connected: {address}</p>
      ) : (
        <button onClick={handleConnect}>Connect Wallet</button>
      )}
    </div>
  );
}
```

### Configuration

The wallet provider is configured in `src/components/WalletProvider.tsx`:

- **Project ID**: Get from https://cloud.walletconnect.com (free)
- **Chains**: Automatically selected based on VITE_NETWORK env variable
- **Theme**: Dark theme with custom accent colors

### Environment Variables

```bash
# Network selection (affects which chains are available)
VITE_NETWORK=mainnet  # or 'testnet' or 'local'
```

## Migration from Legacy Code

### Before (Legacy MetaMask Only)

```typescript
// Old way - brittle, MetaMask only
if (!window.ethereum) {
  throw new Error('MetaMask not found');
}

const accounts = await window.ethereum.request({ 
  method: 'eth_requestAccounts' 
});

const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
```

### After (Multi-Wallet Support)

```typescript
// New way - supports all wallets
const { address, isConnected, connect } = useWallet();
const { writeContract } = useContract();

// Connect opens beautiful modal with all wallet options
if (!isConnected) {
  connect();
}

// Contract is automatically connected to the right signer
const tx = await writeContract.mint(address, 1);
```

## Benefits

1. **Better UX** - Beautiful wallet selection modal
2. **More Users** - Support for all major wallets
3. **Mobile Support** - WalletConnect for any mobile wallet
4. **Robust** - No more checking for window.ethereum
5. **Type Safe** - Full TypeScript support
6. **Network Switching** - Built-in network switching UI
7. **Transaction History** - Shows recent transactions in modal

## Testing

### Local Development

```bash
npm run dev:local    # Hardhat local network
npm run dev:testnet  # Sepolia testnet
npm run dev:mainnet  # Polygon mainnet
```

### Testing Different Wallets

1. Clear browser cache/cookies
2. Open wallet selector
3. Try connecting with different wallets
4. Test network switching
5. Test disconnecting and reconnecting

## Troubleshooting

### "No wallet found" Error

- This is a fallback for legacy code paths
- Should not occur when using new hooks
- If you see this, the component needs to be migrated to use `useWallet()`

### Network Switching Issues

- RainbowKit handles network switching automatically
- If using legacy code, call `switchToTargetNetwork()` from `useWallet()`
- Users will be prompted by their wallet to approve the network switch

### Contract Not Available

- Ensure wallet is connected: `isConnected === true`
- Ensure on correct network: `isOnCorrectNetwork === true`
- Check `writeContract` is not null before using

## Future Improvements

- [ ] Add WalletConnect Project ID to environment variables
- [ ] Add custom wallet icons/branding
- [ ] Add transaction notifications
- [ ] Add wallet balance display
- [ ] Add ENS name resolution
- [ ] Add wallet history/activity feed

