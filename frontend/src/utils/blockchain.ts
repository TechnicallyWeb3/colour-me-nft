import { ethers } from 'ethers';
import { ColourMeNFT__factory } from '../typechain-types/factories/contracts/ColourMeNFT.sol/ColourMeNFT__factory';
import type { ColourMeNFT } from '../typechain-types/contracts/ColourMeNFT.sol/ColourMeNFT';
import type { ObjectStruct } from '../typechain-types/contracts/ColourMeNFT.sol/ColourMeNFT';

// dApp Configuration
export const dappConfig = {
  // Network Configuration
  network: {
    chainId: '0x7A69', // 31337 in hex (Hardhat default)
    chainIdDecimal: 31337,
    chainName: 'Hardhat Local',
    rpcUrls: ['http://127.0.0.1:8545'],
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorerUrls: null, // No block explorer for local network
  },
  // Contract Configuration  
  contracts: {
    ColourMeNFT: {
      address: "0xdbC43Ba45381e02825b14322cDdd15eC4B3164E6",
      deployedBlock: 0, // Start block for event filtering
    }
  },
  // App Configuration
  app: {
    name: 'Paint dApp',
    description: 'On-chain collaborative painting',
    icon: '🎨',
  }
};

// Types
export interface ContractObject {
  shape: number;
  color: string;
  stroke: number;
  points: { x: number; y: number }[];
}

export interface NetworkStatus {
  currentChainId: string;
  isCorrectNetwork: boolean;
  targetChainId: string;
  targetChainName: string;
}

export interface ConnectionResult {
  success: boolean;
  data?: any;
  error?: string;
}

// Helper Functions
export const convertToObjectStruct = (obj: ContractObject): ObjectStruct => ({
  shape: obj.shape,
  color: obj.color,
  stroke: obj.stroke,
  points: obj.points.map(p => ({ x: p.x, y: p.y }))
});

// Network Management
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

export const getNetworkStatus = async (): Promise<NetworkStatus> => {
  const currentChainId = await getCurrentNetwork() || '';
  return {
    currentChainId,
    isCorrectNetwork: currentChainId.toLowerCase() === dappConfig.network.chainId.toLowerCase(),
    targetChainId: dappConfig.network.chainId.toLowerCase(),
    targetChainName: dappConfig.network.chainName
  };
};

export const addNetwork = async (): Promise<ConnectionResult> => {
  if (!window.ethereum) {
    return { success: false, error: 'MetaMask not found' };
  }

  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [dappConfig.network],
    });
    return { success: true, data: dappConfig.network };
  } catch (error) {
    return { success: false, error: `Failed to add network: ${error}` };
  }
};

export const switchNetwork = async (): Promise<ConnectionResult> => {
  if (!window.ethereum) {
    return { success: false, error: 'MetaMask not found' };
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

// Provider and Contract Connection
export const connectToProvider = async (): Promise<{ 
  provider: ethers.JsonRpcProvider | null; 
  contract: ColourMeNFT | null; 
  result: ConnectionResult;
}> => {
  try {
    const rpcProvider = new ethers.JsonRpcProvider(dappConfig.network.rpcUrls[0]);
    const readContract = ColourMeNFT__factory.connect(dappConfig.contracts.ColourMeNFT.address, rpcProvider);
    
    // Test connection by calling a read function
    const count = await readContract.tokenCount();
    
    return {
      provider: rpcProvider,
      contract: readContract,
      result: {
        success: true,
        data: {
          rpcUrl: dappConfig.network.rpcUrls[0],
          contractAddress: dappConfig.contracts.ColourMeNFT.address,
          tokenCount: Number(count)
        }
      }
    };
  } catch (error) {
    return {
      provider: null,
      contract: null,
      result: { success: false, error: `Provider connection failed: ${error}` }
    };
  }
};

export const connectToWallet = async (): Promise<{
  signer: ethers.Signer | null;
  contract: ColourMeNFT | null;
  account: string;
  result: ConnectionResult;
}> => {
  try {
    if (!window.ethereum) {
      throw new Error('MetaMask not found');
    }

    // Check if we're on the correct network (case-insensitive comparison)
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (chainId.toLowerCase() !== dappConfig.network.chainId.toLowerCase()) {
      const switchResult = await switchNetwork();
      if (!switchResult.success) {
        throw new Error(`Network switch failed: ${switchResult.error}`);
      }
    }

    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const web3Provider = new ethers.BrowserProvider(window.ethereum);
    const web3Signer = await web3Provider.getSigner();
    
    const address = await web3Signer.getAddress();
    const writeContract = ColourMeNFT__factory.connect(dappConfig.contracts.ColourMeNFT.address, web3Signer);
    
    return {
      signer: web3Signer,
      contract: writeContract,
      account: address,
      result: {
        success: true,
        data: {
          address,
          chainId: dappConfig.network.chainId,
          contractAddress: dappConfig.contracts.ColourMeNFT.address
        }
      }
    };
  } catch (error) {
    return {
      signer: null,
      contract: null,
      account: '',
      result: { success: false, error: `Wallet connection failed: ${error}` }
    };
  }
};



// Helper function to get gas estimate with fallback for mint
const getGasEstimateForMint = async (
  contract: ColourMeNFT,
  toAddress: string
): Promise<bigint> => {
  try {
    const estimatedGas = await contract.mint.estimateGas(toAddress);
    return (estimatedGas * 120n) / 100n; // Add 20% buffer
  } catch (error) {
    console.warn('Gas estimation failed for mint, using fallback:', error);
    return 200000n;
  }
};

// Helper function to get gas estimate with fallback for setArt
const getGasEstimateForSetArt = async (
  contract: ColourMeNFT,
  tokenId: number,
  artData: ObjectStruct[]
): Promise<bigint> => {
  try {
    const estimatedGas = await contract.setArt.estimateGas(tokenId, artData);
    return (estimatedGas * 120n) / 100n; // Add 20% buffer
  } catch (error) {
    console.warn('Gas estimation failed for setArt, using fallback:', error);
    return 500000n;
  }
};

// Helper function to get gas estimate with fallback for appendArt
const getGasEstimateForAppendArt = async (
  contract: ColourMeNFT,
  tokenId: number,
  artData: ObjectStruct[]
): Promise<bigint> => {
  try {
    const estimatedGas = await contract.appendArt.estimateGas(tokenId, artData);
    return (estimatedGas * 120n) / 100n; // Add 20% buffer
  } catch (error) {
    console.warn('Gas estimation failed for appendArt, using fallback:', error);
    return 300000n;
  }
};

// Contract Write Methods
export const mintToken = async (
  contract: ColourMeNFT,
  toAddress: string
): Promise<ConnectionResult> => {
  try {
    // Pre-flight checks
    const tokenCount = await contract.tokenCount();
    const maxSupply = await contract.maxSupply();
    
    if (tokenCount >= maxSupply) {
      return { success: false, error: 'Collection is sold out' };
    }

    const gasLimit = await getGasEstimateForMint(contract, toAddress);
    
    const tx = await contract.mint(toAddress, {
      gasLimit: gasLimit
    });
    
    console.log('Mint transaction sent:', tx.hash);
    const receipt = await tx.wait();
    
    if (!receipt) {
      throw new Error('Transaction receipt not received');
    }
    
    return {
      success: true,
      data: {
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        to: toAddress,
        gasUsed: receipt.gasUsed?.toString()
      }
    };
  } catch (error: any) {
    console.error('Mint error:', error);
    
    // Parse common error messages
    let errorMessage = 'Mint failed';
    
    if (error?.code === -32603) {
      errorMessage = 'Transaction failed (Internal JSON-RPC error). Please try again.';
    } else if (error?.message?.includes('user rejected')) {
      errorMessage = 'Transaction was rejected by user';
    } else if (error?.message?.includes('insufficient funds')) {
      errorMessage = 'Insufficient funds for transaction';
    } else if (error?.message?.includes('nonce')) {
      errorMessage = 'Transaction nonce error. Please try again.';
    } else if (error?.reason) {
      errorMessage = `Transaction failed: ${error.reason}`;
    } else if (error?.message) {
      errorMessage = `Mint failed: ${error.message}`;
    }
    
    return { success: false, error: errorMessage };
  }
};

export const setArt = async (
  contract: ColourMeNFT,
  tokenId: number,
  artData: ContractObject[]
): Promise<ConnectionResult> => {
  try {
    const contractObjects: ObjectStruct[] = artData.map(convertToObjectStruct);
    
    // Pre-flight check - verify token ownership
    try {
      const owner = await contract.ownerOf(tokenId);
      const runner = contract.runner;
      if (!runner || typeof (runner as any).getAddress !== 'function') {
        return { success: false, error: 'No signer available' };
      }
      const signerAddress = await (runner as any).getAddress();
      if (owner.toLowerCase() !== signerAddress?.toLowerCase()) {
        return { success: false, error: 'You do not own this token' };
      }
    } catch (error) {
      return { success: false, error: 'Token does not exist or ownership check failed' };
    }

    const gasLimit = await getGasEstimateForSetArt(contract, tokenId, contractObjects);
    
    const tx = await contract.setArt(tokenId, contractObjects, {
      gasLimit: gasLimit
    });
    
    console.log('SetArt transaction sent:', tx.hash);
    const receipt = await tx.wait();
    
    if (!receipt) {
      throw new Error('Transaction receipt not received');
    }
    
    return {
      success: true,
      data: {
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        tokenId,
        elementCount: contractObjects.length,
        gasUsed: receipt.gasUsed?.toString()
      }
    };
  } catch (error: any) {
    console.error('SetArt error:', error);
    
    let errorMessage = 'Set art failed';
    
    if (error?.code === -32603) {
      errorMessage = 'Transaction failed (Internal JSON-RPC error). Please try again.';
    } else if (error?.message?.includes('user rejected')) {
      errorMessage = 'Transaction was rejected by user';
    } else if (error?.reason) {
      errorMessage = `Set art failed: ${error.reason}`;
    } else if (error?.message) {
      errorMessage = `Set art failed: ${error.message}`;
    }
    
    return { success: false, error: errorMessage };
  }
};

export const appendArt = async (
  contract: ColourMeNFT,
  tokenId: number,
  artData: ContractObject[]
): Promise<ConnectionResult> => {
  try {
    const contractObjects: ObjectStruct[] = artData.map(convertToObjectStruct);
    
    // Pre-flight check - verify token ownership
    try {
      const owner = await contract.ownerOf(tokenId);
      const runner = contract.runner;
      if (!runner || typeof (runner as any).getAddress !== 'function') {
        return { success: false, error: 'No signer available' };
      }
      const signerAddress = await (runner as any).getAddress();
      if (owner.toLowerCase() !== signerAddress?.toLowerCase()) {
        return { success: false, error: 'You do not own this token' };
      }
    } catch (error) {
      return { success: false, error: 'Token does not exist or ownership check failed' };
    }

    const gasLimit = await getGasEstimateForAppendArt(contract, tokenId, contractObjects);
    
    const tx = await contract.appendArt(tokenId, contractObjects, {
      gasLimit: gasLimit
    });
    
    console.log('AppendArt transaction sent:', tx.hash);
    const receipt = await tx.wait();
    
    if (!receipt) {
      throw new Error('Transaction receipt not received');
    }
    
    return {
      success: true,
      data: {
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        tokenId,
        elementCount: contractObjects.length,
        gasUsed: receipt.gasUsed?.toString()
      }
    };
  } catch (error: any) {
    console.error('AppendArt error:', error);
    
    let errorMessage = 'Append art failed';
    
    if (error?.code === -32603) {
      errorMessage = 'Transaction failed (Internal JSON-RPC error). Please try again.';
    } else if (error?.message?.includes('user rejected')) {
      errorMessage = 'Transaction was rejected by user';
    } else if (error?.reason) {
      errorMessage = `Append art failed: ${error.reason}`;
    } else if (error?.message) {
      errorMessage = `Append art failed: ${error.message}`;
    }
    
    return { success: false, error: errorMessage };
  }
};

// Contract Read Methods
export const getTokenURI = async (
  contract: ColourMeNFT,
  tokenId: number
): Promise<{ uri: string; result: ConnectionResult }> => {
  try {
    const uri = await contract.tokenURI(tokenId);
    return {
      uri,
      result: {
        success: true,
        data: { tokenId, uri }
      }
    };
  } catch (error) {
    return {
      uri: '',
      result: { success: false, error: `Get token URI failed: ${error}` }
    };
  }
};

export const getTokenSVG = async (
  contract: ColourMeNFT,
  tokenId: number
): Promise<{ svg: string; result: ConnectionResult }> => {
  try {
    const svgBytes = await contract.tokenSVG(tokenId);
    const svgString = ethers.toUtf8String(svgBytes);
    return {
      svg: svgString,
      result: {
        success: true,
        data: { tokenId, svgLength: svgString.length }
      }
    };
  } catch (error) {
    return {
      svg: '',
      result: { success: false, error: `Get token SVG failed: ${error}` }
    };
  }
};

export const getTokenCount = async (contract: ColourMeNFT): Promise<{ count: number; result: ConnectionResult }> => {
  try {
    const count = await contract.tokenCount();
    return {
      count: Number(count),
      result: {
        success: true,
        data: { tokenCount: Number(count) }
      }
    };
  } catch (error) {
    return {
      count: 0,
      result: { success: false, error: `Get token count failed: ${error}` }
    };
  }
};

export const getMaxSupply = async (contract: ColourMeNFT): Promise<{ maxSupply: number; result: ConnectionResult }> => {
  try {
    const maxSupply = await contract.maxSupply();
    return {
      maxSupply: Number(maxSupply),
      result: {
        success: true,
        data: { maxSupply: Number(maxSupply) }
      }
    };
  } catch (error) {
    return {
      maxSupply: 0,
      result: { success: false, error: `Get max supply failed: ${error}` }
    };
  }
};

export const getOwnerOf = async (contract: ColourMeNFT, tokenId: number): Promise<{ owner: string; result: ConnectionResult }> => {
  try {
    const owner = await contract.ownerOf(tokenId);
    return {
      owner,
      result: {
        success: true,
        data: { tokenId, owner }
      }
    };
  } catch (error) {
    return {
      owner: '',
      result: { success: false, error: `Get owner failed: ${error}` }
    };
  }
};

// Event Listeners Setup
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

// Utility function to check if MetaMask is available
export const isMetaMaskAvailable = (): boolean => {
  return typeof window !== 'undefined' && !!window.ethereum;
};

// Get contract instance (helper for external use)
export const getContractInstance = (
  address: string = dappConfig.contracts.ColourMeNFT.address,
  signerOrProvider: ethers.Signer | ethers.Provider
): ColourMeNFT => {
  return ColourMeNFT__factory.connect(address, signerOrProvider);
};
