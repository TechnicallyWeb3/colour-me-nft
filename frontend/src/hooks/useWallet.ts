import { useAccount, useConnect, useDisconnect, useSwitchChain, useChainId } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { dappConfig } from '../utils/blockchain';

/**
 * Custom hook that provides wallet connection state and functions
 * Supports multiple wallets through RainbowKit (MetaMask, WalletConnect, Coinbase, etc.)
 */
export function useWallet() {
  const { address, isConnected, isConnecting, isDisconnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const currentChainId = useChainId();

  // Get target chain ID from config
  const targetChainId = parseInt(dappConfig.network.chainId, 16);
  const isOnCorrectNetwork = currentChainId === targetChainId;

  const connect = () => {
    if (openConnectModal) {
      openConnectModal();
    }
  };

  const switchToTargetNetwork = () => {
    if (switchChain) {
      switchChain({ chainId: targetChainId });
    }
  };

  return {
    address,
    isConnected,
    isConnecting,
    isDisconnected,
    connect,
    disconnect,
    switchToTargetNetwork,
    isSwitching,
    isOnCorrectNetwork,
    currentChainId,
    targetChainId,
  };
}

