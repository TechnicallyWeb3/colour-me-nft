import { useAccount, useConnect, useDisconnect, useSwitchChain, useChainId } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useState, useEffect } from 'react';
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
  const wagmiChainId = useChainId();
  const [actualChainId, setActualChainId] = useState<number | null>(null);

  // Get the actual chain ID from window.ethereum (more reliable)
  useEffect(() => {
    const getActualChainId = async () => {
      if (!isConnected || !window.ethereum) {
        setActualChainId(null);
        return;
      }
      
      try {
        const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
        const chainId = parseInt(chainIdHex as string, 16);
        setActualChainId(chainId);
      } catch (error) {
        console.error('Failed to get actual chain ID:', error);
        setActualChainId(wagmiChainId);
      }
    };

    getActualChainId();

    // Listen for network changes
    if (window.ethereum) {
      const handleChainChanged = (chainIdHex: string) => {
        const chainId = parseInt(chainIdHex, 16);
        setActualChainId(chainId);
      };
      
      window.ethereum.on('chainChanged', handleChainChanged);
      return () => {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [isConnected, wagmiChainId]);

  // Use actual chain ID if available, fallback to wagmi
  const currentChainId = actualChainId ?? wagmiChainId;

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

