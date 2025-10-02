import { useAccount, usePublicClient } from 'wagmi';
import { useMemo, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { ColourMeNFT__factory } from '../typechain-types/factories/contracts/ColourMeNFT.sol/ColourMeNFT__factory';
import type { ColourMeNFT } from '../typechain-types/contracts/ColourMeNFT.sol/ColourMeNFT';
import { dappConfig } from '../utils/blockchain';

/**
 * Custom hook that provides contract instances with proper signer/provider
 * Uses window.ethereum directly for write operations (works with RainbowKit)
 */
export function useContract() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [writeContract, setWriteContract] = useState<ColourMeNFT | null>(null);

  const readContract = useMemo(() => {
    if (!publicClient) return null;
    
    const provider = new ethers.JsonRpcProvider(dappConfig.network.rpcUrls[0]);
    return ColourMeNFT__factory.connect(
      dappConfig.contracts.ColourMeNFT.address,
      provider
    );
  }, [publicClient]);

  // Set up write contract using window.ethereum (provided by RainbowKit)
  useEffect(() => {
    const setupWriteContract = async () => {
      if (!isConnected || !address) {
        setWriteContract(null);
        return;
      }

      if (!window.ethereum) {
        setWriteContract(null);
        return;
      }

      try {
        // Use window.ethereum directly (RainbowKit ensures this is available when connected)
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        // Get the actual network from the provider
        const network = await provider.getNetwork();
        
        // Verify we're on the correct network
        if (Number(network.chainId) !== parseInt(dappConfig.network.chainId, 16)) {
          console.warn('Network mismatch detected. Please switch to', dappConfig.network.chainName);
          setWriteContract(null);
          return;
        }
        
        const contract = ColourMeNFT__factory.connect(
          dappConfig.contracts.ColourMeNFT.address,
          signer
        );
        
        setWriteContract(contract);
      } catch (error) {
        console.error('Error creating write contract:', error);
        setWriteContract(null);
      }
    };

    setupWriteContract();
  }, [isConnected, address]);

  return {
    readContract,
    writeContract,
    isReady: !!readContract,
  };
}

