import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { polygon, sepolia, hardhat } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// Custom chain configuration for Hardhat local network
const hardhatLocal = {
  ...hardhat,
  id: 31337,
  name: 'Hardhat Local',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
    public: { http: ['http://127.0.0.1:8545'] },
  },
};

// Determine active network from environment
const getActiveChains = () => {
  const env = import.meta.env.VITE_NETWORK || 'mainnet';
  
  switch (env) {
    case 'local':
      return [hardhatLocal];
    case 'testnet':
      return [sepolia];
    case 'mainnet':
      return [polygon];
    default:
      // Include all for development flexibility
      return [polygon, sepolia, hardhatLocal];
  }
};

// Configure wagmi with RainbowKit
const config = getDefaultConfig({
  appName: 'Paint dApp',
  projectId: 'YOUR_PROJECT_ID', // Get from https://cloud.walletconnect.com
  chains: getActiveChains() as any,
  ssr: false,
});

const queryClient = new QueryClient();

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#7b3ff2',
            accentColorForeground: 'white',
            borderRadius: 'medium',
            fontStack: 'system',
          })}
          showRecentTransactions={true}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export { config };

