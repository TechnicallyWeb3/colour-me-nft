/**
 * Wallet compatibility layer - provides backward compatible functions
 * that work with both wagmi/RainbowKit and legacy window.ethereum
 */

import { dappConfig } from './blockchain';
import type { ConnectionResult } from './blockchain';

/**
 * Check if any wallet is available (wagmi or legacy)
 */
export const isWalletAvailable = (): boolean => {
  // Check for wagmi first (will be available if WalletProvider is mounted)
  // Then fallback to legacy window.ethereum
  return typeof window !== 'undefined' && !!window.ethereum;
};

/**
 * Get current network from wallet
 * This is a legacy compatibility function - prefer using useChainId() from wagmi in components
 */
export const getCurrentNetwork = async (): Promise<string | null> => {
  if (!window.ethereum) return null;
  
  try {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    return chainId;
  } catch (error) {
    console.error('Failed to get current network:', error);
    return null;
  }
};

/**
 * Legacy network switching - kept for backward compatibility
 * Components should use useSwitchChain() from wagmi instead
 */
export const switchNetwork = async (): Promise<ConnectionResult> => {
  if (!window.ethereum) {
    return { success: false, error: 'No wallet found. Please install a Web3 wallet.' };
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: dappConfig.network.chainId }],
    });
    return { 
      success: true, 
      data: { 
        chainId: dappConfig.network.chainId,
        chainName: dappConfig.network.chainName 
      }
    };
  } catch (error: any) {
    // If network doesn't exist, try to add it
    if (error.code === 4902) {
      const addResult = await addNetwork();
      if (addResult.success) {
        return { 
          success: true, 
          data: { 
            message: 'Network added and switched',
            ...addResult.data 
          }
        };
      }
      return addResult;
    }
    return { success: false, error: `Failed to switch network: ${error}` };
  }
};

/**
 * Legacy add network function
 */
export const addNetwork = async (): Promise<ConnectionResult> => {
  if (!window.ethereum) {
    return { success: false, error: 'No wallet found' };
  }

  try {
    const { chainId, chainName, rpcUrls, nativeCurrency, explorerUrl } = dappConfig.network;
    const params: any = { chainId, chainName, rpcUrls, nativeCurrency };
    if (explorerUrl) {
      params.blockExplorerUrls = [explorerUrl];
    }

    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [params],
    });
    return { success: true, data: dappConfig.network };
  } catch (error) {
    return { success: false, error: `Failed to add network: ${error}` };
  }
};

/**
 * Setup legacy event listeners
 * Note: When using wagmi, prefer useAccount() and useChainId() hooks with useEffect
 */
export const setupNetworkListeners = (
  onChainChanged: (chainId: string) => void,
  onAccountsChanged: (accounts: string[]) => void
) => {
  if (!window.ethereum) return null;

  const handleChainChanged = (chainId: string) => {
    onChainChanged(chainId);
  };

  const handleAccountsChanged = (accounts: string[]) => {
    onAccountsChanged(accounts);
  };

  window.ethereum.on('chainChanged', handleChainChanged);
  window.ethereum.on('accountsChanged', handleAccountsChanged);

  // Return cleanup function
  return () => {
    window.ethereum.removeListener('chainChanged', handleChainChanged);
    window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
  };
};

