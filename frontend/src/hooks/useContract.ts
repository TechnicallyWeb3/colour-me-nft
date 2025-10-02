import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { useMemo } from 'react';
import { ethers } from 'ethers';
import { ColourMeNFT__factory } from '../typechain-types/factories/contracts/ColourMeNFT.sol/ColourMeNFT__factory';
import type { ColourMeNFT } from '../typechain-types/contracts/ColourMeNFT.sol/ColourMeNFT';
import { dappConfig } from '../utils/blockchain';
import type { WalletClient } from 'viem';

/**
 * Converts a viem WalletClient to an ethers Signer
 */
function walletClientToSigner(walletClient: WalletClient): ethers.Signer {
  const { account, chain, transport } = walletClient;
  const network = {
    chainId: chain?.id,
    name: chain?.name,
  };
  const provider = new ethers.BrowserProvider(transport, network);
  const signer = provider.getSigner(account?.address);
  return signer as any;
}

/**
 * Custom hook that provides contract instances with proper signer/provider
 */
export function useContract() {
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const readContract = useMemo(() => {
    if (!publicClient) return null;
    
    const provider = new ethers.JsonRpcProvider(dappConfig.network.rpcUrls[0]);
    return ColourMeNFT__factory.connect(
      dappConfig.contracts.ColourMeNFT.address,
      provider
    );
  }, [publicClient]);

  const writeContract = useMemo(() => {
    if (!isConnected || !walletClient) return null;

    try {
      const signer = walletClientToSigner(walletClient);
      return ColourMeNFT__factory.connect(
        dappConfig.contracts.ColourMeNFT.address,
        signer
      );
    } catch (error) {
      console.error('Error creating write contract:', error);
      return null;
    }
  }, [isConnected, walletClient]);

  return {
    readContract,
    writeContract,
    isReady: !!readContract,
  };
}

