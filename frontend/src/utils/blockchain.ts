import { ethers } from 'ethers';
import { ColourMeNFT__factory } from '../typechain-types/factories/contracts/ColourMeNFT.sol/ColourMeNFT__factory';
import type { ColourMeNFT } from '../typechain-types/contracts/ColourMeNFT.sol/ColourMeNFT';
import type { ObjectStruct } from '../typechain-types/contracts/ColourMeNFT.sol/ColourMeNFT';
import { encodeObject, encodeObjects, type ObjectStruct as FrontendObject } from './encoding';

// Format address for display (truncate middle)
export const formatAddress = (address: string): string => {
  if (address.length <= 20) return address;
  return `${address.slice(0, 10)}...${address.slice(-8)}`;
};

// Network Configurations
export const networkConfigs = {
  local: {
    chainId: '0x7A69', // 31337 in hex (Hardhat default)
    chainName: 'Hardhat Local',
    rpcUrls: ['http://127.0.0.1:8545'],
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrl: 'http://127.0.0.1:8545',
    explorerUrl: 'http://localhost:3000', // No explorer for local
    openseaUrl: 'http://localhost:8000', // Testnets OpenSea
    contracts: {
      ColourMeNFT: {
        address: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512", // Local hardhat deployment
        deployedBlock: 0,
      }
    }
  },
  testnet: {
    chainId: '0xaa36a7', // 11155111 in hex (Sepolia testnet)
    chainName: 'Sepolia Testnet',
    rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com/',
    explorerUrl: 'https://sepolia.etherscan.io',
    openseaUrl: 'https://testnets.opensea.io',
    contracts: {
      ColourMeNFT: {
        address: "0x98554c934b26439f5761C0D5a3610a669A05f934", // Live testnet deployment
        deployedBlock: 0,
      }
    }
  },
  mainnet: {
    chainId: '0x2105', // 8453 in hex (Base mainnet)
    chainName: 'Base',
    rpcUrls: ['https://mainnet.base.org'],
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrl: 'https://base-rpc.publicnode.com',
    explorerUrl: 'https://basescan.org',
    openseaUrl: 'https://opensea.io',
    contracts: {
      ColourMeNFT: {
        address: "0x0000000000000000000000000000000000000000", // TODO: Deploy to Base mainnet
        deployedBlock: 0,
      }
    }
  }
};

// Get active network configuration based on environment variable
const getActiveNetwork = (): keyof typeof networkConfigs => {
  const env = import.meta.env.VITE_NETWORK || 'local';
  if (env in networkConfigs) {
    return env as keyof typeof networkConfigs;
  }
  console.warn(`⚠️ Unknown network: ${env}, falling back to local`);
  return 'local';
};

// Contract Data Interface
export interface ContractData {
  // Chain Information
  chain: {
    name: string;
    id: string;
    rpc: string;
    symbol: string;
  };
  
  // Contract Information
  contractAddress: string;
  explorerUrl: string;
  openseaUrl: string;
  
  // Contract State
  tokenCount: number;
  maxSupply: number;
  mintOpen: Date;
  mintDuration: number; // in milliseconds
  mintPrice: string; // in ETH string format
  
  // Derived
  mintEnd: Date;
  isMintActive: boolean;
}

// Get current contract data
export const getContractData = async (contract: ColourMeNFT | null): Promise<{ data: ContractData | null; result: ConnectionResult }> => {
  try {
    console.log('Loading contract data, contract available:', !!contract);
    
    const networkName = getActiveNetwork();
    const config = networkConfigs[networkName];
    
    // Chain information
    const chain = {
      name: config.chainName,
      id: config.chainId,
      rpc: config.rpcUrls[0],
      symbol: config.nativeCurrency.symbol
    };
    
    // Contract information
    const contractAddress = config.contracts.ColourMeNFT.address;
    const explorerUrl = config.explorerUrl;
    const openseaUrl = config.openseaUrl;
    
    if (!contract) {
      throw new Error('Contract not connected');
    }
    
    // Get all project info with a single efficient call
    const { projectInfo, result: projectResult } = await getProjectInfo(contract);
    
    if (!projectResult.success || !projectInfo) {
      throw new Error(`Failed to load project info: ${projectResult.error}`);
    }
    
    // Extract data from project info
    const tokenCount = projectInfo.tokenCount;
    const maxSupply = projectInfo.maxSupply;
    const mintOpen = new Date(projectInfo.mintStart * 1000); // convert to milliseconds
    const mintDuration = projectInfo.mintDuration * 1000; // convert to milliseconds
    const mintPrice = projectInfo?.mintPrice > 0n ? (ethers.formatEther(projectInfo.mintPrice) + ' ' + (chain?.symbol || 'ETH')) : 'FREE'; // convert wei to ETH
    // Calculate derived values
    const mintEnd = new Date(mintOpen.getTime() + mintDuration);
    const now = new Date();
    const isMintActive = now >= mintOpen && now <= mintEnd;
    
    const contractData: ContractData = {
      chain,
      contractAddress,
      explorerUrl,
      openseaUrl,
      tokenCount,
      maxSupply,
      mintOpen,
      mintDuration,
      mintPrice,
      mintEnd,
      isMintActive
    };
    
    return {
      data: contractData,
      result: {
        success: true,
        data: contractData
      }
    };
    
  } catch (error) {
    return {
      data: null,
      result: {
        success: false,
        error: `Failed to load contract data: ${error}`
      }
    };
  }
};

const activeNetwork = getActiveNetwork();
const activeConfig = networkConfigs[activeNetwork];

// dApp Configuration
export const dappConfig = {
  // Network Configuration
  network: {
    chainId: activeConfig.chainId,
    chainName: activeConfig.chainName,
    rpcUrls: activeConfig.rpcUrls,
    nativeCurrency: activeConfig.nativeCurrency,
    explorerUrl: activeConfig.explorerUrl,
    openseaUrl: activeConfig.openseaUrl,
  },
  // Contract Configuration  
  contracts: {
    ColourMeNFT: {
      address: activeConfig.contracts.ColourMeNFT.address,
      deployedBlock: activeConfig.contracts.ColourMeNFT.deployedBlock,
    }
  },
  // App Configuration
  app: {
    name: 'Paint dApp',
    description: `On-chain collaborative painting on ${activeConfig.chainName}`,
    icon: '🎨',
  },
  // Active network info
  activeNetwork,
  allNetworks: networkConfigs
};

// Types
export interface ContractObject {
  shape: number;
  color: string;
  stroke: number;
  points: { x: number; y: number }[];
}

// New packed contract object (matches the updated Object struct)
export interface PackedContractObject {
  base: bigint;
  additionalPoints: Uint8Array;
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

// Legacy function for backwards compatibility
export const convertToObjectStruct = (obj: ContractObject): ObjectStruct => {
  // Convert to frontend object first, then encode to packed format
  const frontendObj: FrontendObject = {
    shape: obj.shape,
    color: obj.color,
    stroke: obj.stroke,
    points: obj.points
  };
  
  const packed = encodeObject(frontendObj);
  
  return {
    base: packed.base,
    additionalPoints: packed.additionalPoints
  };
};

// New function for converting multiple objects with packed encoding
export const convertToPackedObjects = (objects: ContractObject[]): ObjectStruct[] => {
  const frontendObjects: FrontendObject[] = objects.map(obj => ({
    shape: obj.shape,
    color: obj.color,
    stroke: obj.stroke,
    points: obj.points
  }));
  
  const packedObjects = encodeObjects(frontendObjects);
  
  return packedObjects.map(packed => ({
    base: packed.base,
    additionalPoints: packed.additionalPoints
  }));
};

// Transaction size estimation with packed encoding benefits
export const estimateObjectGasSize = (obj: ContractObject): number => {
  // Base gas for packed object structure (much more efficient)
  let gasEstimate = 60; // Reduced base cost due to packed encoding
  
  // First 6 points are packed into the base uint256 (very efficient)
  const basePoints = Math.min(obj.points.length, 6);
  gasEstimate += basePoints * 20; // Much cheaper for packed points
  
  // Additional points beyond 6 (stored as bytes)
  const additionalPoints = Math.max(0, obj.points.length - 6);
  gasEstimate += additionalPoints * 30; // Still cheaper than unpacked
  
  // Additional cost for complex shapes (reduced due to packed encoding)
  if (obj.shape === 4 || obj.shape === 5) { // polyline or polygon
    gasEstimate += obj.points.length * 10; // Reduced from 20
  }
  
  return gasEstimate;
};

// New function to estimate packed encoding savings
export const estimatePackedSavings = (objects: ContractObject[]): {
  unpackedGas: number;
  packedGas: number;
  gasSavings: number;
  savingsPercent: number;
} => {
  const unpackedGas = objects.reduce((total, obj) => {
    // Old unpacked estimation
    return total + 100 + (obj.points.length * 80) + 
           ((obj.shape === 4 || obj.shape === 5) ? obj.points.length * 20 : 0);
  }, 0);
  
  const packedGas = objects.reduce((total, obj) => {
    return total + estimateObjectGasSize(obj);
  }, 0);
  
  const gasSavings = unpackedGas - packedGas;
  const savingsPercent = unpackedGas > 0 ? (gasSavings / unpackedGas) * 100 : 0;
  
  return {
    unpackedGas,
    packedGas,
    gasSavings,
    savingsPercent
  };
};

export const estimateTransactionGas = (objects: ContractObject[]): number => {
  const baseTransactionGas = 21000; // Base Ethereum transaction
  const contractCallGas = 25000; // Base contract interaction
  
  // Defensive programming: ensure objects is an array
  if (!Array.isArray(objects)) {
    console.warn('estimateTransactionGas received non-array objects:', objects);
    return baseTransactionGas + contractCallGas;
  }
  
  const objectsGas = objects.reduce((total, obj) => {
    return total + estimateObjectGasSize(obj);
  }, 0);
  
  return baseTransactionGas + contractCallGas + objectsGas;
};

export const calculateOptimalChunkSize = (
  objects: ContractObject[], 
  maxGasLimit: number = 800000 // Increased limit due to packed encoding efficiency
): { chunkSize: number; estimatedChunks: number } => {
  if (objects.length === 0) {
    return { chunkSize: 0, estimatedChunks: 0 };
  }
  
  // Find the largest single object to ensure we can fit at least one per transaction
  const maxSingleObjectGas = Math.max(...objects.map(estimateObjectGasSize));
  const baseGas = 46000; // Base transaction + contract call gas
  
  if (baseGas + maxSingleObjectGas > maxGasLimit) {
    throw new Error('Single object too large for any transaction');
  }
  
  // Binary search to find optimal chunk size
  let minChunk = 1;
  let maxChunk = objects.length;
  let optimalChunk = 1;
  
  while (minChunk <= maxChunk) {
    const midChunk = Math.floor((minChunk + maxChunk) / 2);
    const testObjects = objects.slice(0, midChunk);
    const estimatedGas = estimateTransactionGas(testObjects);
    
    if (estimatedGas <= maxGasLimit) {
      optimalChunk = midChunk;
      minChunk = midChunk + 1;
    } else {
      maxChunk = midChunk - 1;
    }
  }
  
  return {
    chunkSize: optimalChunk,
    estimatedChunks: Math.ceil(objects.length / optimalChunk)
  };
};

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
  toAddress: string,
  quantity: number = 1
): Promise<bigint> => {
  try {
    const estimatedGas = await contract.mint.estimateGas(toAddress, quantity);
    return (estimatedGas * 120n) / 100n; // Add 20% buffer
  } catch (error) {
    console.warn('Gas estimation failed for mint, using fallback:', error);
    return BigInt(200000 * quantity); // Scale fallback with quantity
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

// Transaction Queue Types
export interface TransactionChunk {
  id: string;
  chunkIndex: number;
  totalChunks: number;
  objects: ContractObject[];
  type: 'set' | 'append';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  txHash?: string;
  gasUsed?: string;
}

export interface TransactionQueue {
  tokenId: number;
  chunks: TransactionChunk[];
  isProcessing: boolean;
  currentChunkIndex: number;
}

// Helper function to chunk array
const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

// Create transaction queue from art data
export const createTransactionQueue = (
  tokenId: number,
  artData: ContractObject[],
  saveType: 'set' | 'append' = 'set',
  maxGasLimit: number = 500000
): TransactionQueue => {
  if (artData.length === 0) {
    return {
      tokenId,
      chunks: [],
      isProcessing: false,
      currentChunkIndex: 0
    };
  }

  const { chunkSize } = calculateOptimalChunkSize(artData, maxGasLimit);
  const chunkedData = chunkArray(artData, chunkSize);
  
  const chunks: TransactionChunk[] = chunkedData.map((chunkObjects, index) => ({
    id: `${tokenId}-${index}-${Date.now()}`,
    chunkIndex: index,
    totalChunks: chunkedData.length,
    objects: chunkObjects,
    type: index === 0 ? saveType : 'append', // First chunk uses saveType, rest use append
    status: 'pending'
  }));

  return {
    tokenId,
    chunks,
    isProcessing: false,
    currentChunkIndex: 0
  };
};

// Execute a single chunk transaction
export const executeTransactionChunk = async (
  contract: ColourMeNFT,
  tokenId: number,
  chunk: TransactionChunk
): Promise<ConnectionResult & { chunk: TransactionChunk }> => {
  try {
    let result: ConnectionResult;
    
    if (chunk.type === 'set') {
      result = await setArt(contract, tokenId, chunk.objects);
    } else {
      result = await appendArt(contract, tokenId, chunk.objects);
    }
    
    const updatedChunk: TransactionChunk = {
      ...chunk,
      status: result.success ? 'completed' : 'failed',
      error: result.success ? undefined : result.error,
      txHash: result.success ? result.data?.hash : undefined,
      gasUsed: result.success ? result.data?.gasUsed : undefined
    };
    
    return {
      ...result,
      chunk: updatedChunk
    };
  } catch (error) {
    const updatedChunk: TransactionChunk = {
      ...chunk,
      status: 'failed',
      error: `Transaction execution failed: ${error}`
    };
    
    return {
      success: false,
      error: `Transaction execution failed: ${error}`,
      chunk: updatedChunk
    };
  }
};

// Execute transaction queue (all chunks in sequence)
export const executeTransactionQueue = async (
  contract: ColourMeNFT,
  queue: TransactionQueue,
  onChunkUpdate?: (chunk: TransactionChunk, queueProgress: { completed: number; total: number }) => void
): Promise<ConnectionResult & { finalQueue: TransactionQueue }> => {
  const updatedQueue: TransactionQueue = {
    ...queue,
    isProcessing: true
  };
  
  let completedCount = 0;
  
  for (let i = 0; i < updatedQueue.chunks.length; i++) {
    const chunk = updatedQueue.chunks[i];
    
    // Skip already completed chunks
    if (chunk.status === 'completed') {
      completedCount++;
      continue;
    }
    
    // Update chunk status to processing
    updatedQueue.chunks[i] = { ...chunk, status: 'processing' };
    updatedQueue.currentChunkIndex = i;
    
    if (onChunkUpdate) {
      onChunkUpdate(updatedQueue.chunks[i], { completed: completedCount, total: updatedQueue.chunks.length });
    }
    
    // Execute the chunk
    const result = await executeTransactionChunk(contract, updatedQueue.tokenId, chunk);
    updatedQueue.chunks[i] = result.chunk;
    
    if (result.success) {
      completedCount++;
      if (onChunkUpdate) {
        onChunkUpdate(result.chunk, { completed: completedCount, total: updatedQueue.chunks.length });
      }
    } else {
      // Stop on first failure
      updatedQueue.isProcessing = false;
      return {
        success: false,
        error: `Transaction ${i + 1} failed: ${result.error}`,
        finalQueue: updatedQueue
      };
    }
  }
  
  updatedQueue.isProcessing = false;
  
  return {
    success: true,
    data: {
      totalChunks: updatedQueue.chunks.length,
      completedChunks: completedCount
    },
    finalQueue: updatedQueue
  };
};

// Execute single chunk from queue (for retry functionality)
export const executeQueueChunk = async (
  contract: ColourMeNFT,
  queue: TransactionQueue,
  chunkIndex: number
): Promise<ConnectionResult & { updatedQueue: TransactionQueue }> => {
  if (chunkIndex < 0 || chunkIndex >= queue.chunks.length) {
    return {
      success: false,
      error: 'Invalid chunk index',
      updatedQueue: queue
    };
  }
  
  const chunk = queue.chunks[chunkIndex];
  const result = await executeTransactionChunk(contract, queue.tokenId, chunk);
  
  const updatedQueue: TransactionQueue = {
    ...queue,
    chunks: queue.chunks.map((c, i) => i === chunkIndex ? result.chunk : c)
  };
  
  return {
    ...result,
    updatedQueue
  };
};

// Contract Read Methods
export const getProjectInfo = async (
  contract: ColourMeNFT
): Promise<{ projectInfo: any; result: ConnectionResult }> => {
  try {
    const projectInfo = await contract.getProjectInfo();
    const [
      name,
      symbol,
      baseURL,
      tokenCount,
      maxSupply,
      mintPrice,
      mintLimit,
      mintStart,
      mintDuration
    ] = projectInfo;

    const info = {
      name: name,
      symbol: symbol,
      baseURL: baseURL,
      tokenCount: Number(tokenCount),
      maxSupply: Number(maxSupply),
      mintPrice: mintPrice,
      mintLimit: Number(mintLimit),
      mintStart: Number(mintStart),
      mintDuration: Number(mintDuration)
    };

    return {
      projectInfo: info,
      result: { success: true, data: info }
    };
  } catch (error) {
    return {
      projectInfo: null,
      result: { success: false, error: `Failed to get project info: ${error}` }
    };
  }
};

// Contract Write Methods
export const mintToken = async (
  contract: ColourMeNFT,
  toAddress: string,
  quantity: number = 1
): Promise<ConnectionResult> => {
  try {
    console.log('🪙 Minting token:', toAddress, 'quantity:', quantity);
    // Pre-flight checks
    const tokenCount = await contract.tokenCount();
    const maxSupply = await contract.maxSupply();
    
    if (tokenCount >= maxSupply) {
      return { success: false, error: 'Collection is sold out' };
    }

    if (tokenCount + BigInt(quantity) > maxSupply) {
      return { success: false, error: `Only ${Number(maxSupply - tokenCount)} tokens remaining` };
    }

    const gasLimit = await getGasEstimateForMint(contract, toAddress, quantity);
    
    const tx = await contract.mint(toAddress, quantity, {
      gasLimit: gasLimit
    });
    
    console.log('🪙 Mint transaction sent:', tx.hash);
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
    console.log('🎨 [blockchain.ts] setArt called with:', { tokenId, artDataLength: artData.length, artData });
    const contractObjects: ObjectStruct[] = convertToPackedObjects(artData);
    console.log('📦 [blockchain.ts] Converted to packed objects:', { packedObjectsLength: contractObjects.length, contractObjects });
    
    // Pre-flight check - verify token ownership
    try {
      console.log('🔐 [blockchain.ts] Checking token ownership for token:', tokenId);
      const owner = await contract.ownerOf(tokenId);
      console.log('👤 [blockchain.ts] Token owner:', owner);
      
      const runner = contract.runner;
      if (!runner || typeof (runner as any).getAddress !== 'function') {
        console.error('❌ [blockchain.ts] No signer available');
        return { success: false, error: 'No signer available' };
      }
      const signerAddress = await (runner as any).getAddress();
      console.log('✏️ [blockchain.ts] Signer address:', signerAddress);
      
      if (owner.toLowerCase() !== signerAddress?.toLowerCase()) {
        console.error('❌ [blockchain.ts] Ownership mismatch:', { owner: owner.toLowerCase(), signer: signerAddress?.toLowerCase() });
        return { success: false, error: 'You do not own this token' };
      }
      console.log('✅ [blockchain.ts] Ownership verified');
    } catch (error) {
      console.error('❌ [blockchain.ts] Ownership check failed:', error);
      return { success: false, error: 'Token does not exist or ownership check failed' };
    }

    console.log('⛽ [blockchain.ts] Getting gas estimate...');
    const gasLimit = await getGasEstimateForSetArt(contract, tokenId, contractObjects);
    console.log('⛽ [blockchain.ts] Gas limit estimated:', gasLimit.toString());
    
    console.log('📤 [blockchain.ts] Sending setArt transaction...');
    const tx = await contract.setArt(tokenId, contractObjects, {
      gasLimit: gasLimit
    });
    console.log('📤 [blockchain.ts] Transaction sent:', tx.hash);
    
    console.log('🎨 SetArt transaction sent:', tx.hash);
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
    console.log('➕ [blockchain.ts] appendArt called with:', { tokenId, artDataLength: artData.length, artData });
    const contractObjects: ObjectStruct[] = convertToPackedObjects(artData);
    console.log('📦 [blockchain.ts] Converted to packed objects:', { packedObjectsLength: contractObjects.length, contractObjects });
    
    // Pre-flight check - verify token ownership
    try {
      console.log('🔐 [blockchain.ts] Checking token ownership for token:', tokenId);
      const owner = await contract.ownerOf(tokenId);
      console.log('👤 [blockchain.ts] Token owner:', owner);
      
      const runner = contract.runner;
      if (!runner || typeof (runner as any).getAddress !== 'function') {
        console.error('❌ [blockchain.ts] No signer available');
        return { success: false, error: 'No signer available' };
      }
      const signerAddress = await (runner as any).getAddress();
      console.log('✏️ [blockchain.ts] Signer address:', signerAddress);
      
      if (owner.toLowerCase() !== signerAddress?.toLowerCase()) {
        console.error('❌ [blockchain.ts] Ownership mismatch:', { owner: owner.toLowerCase(), signer: signerAddress?.toLowerCase() });
        return { success: false, error: 'You do not own this token' };
      }
      console.log('✅ [blockchain.ts] Ownership verified');
    } catch (error) {
      console.error('❌ [blockchain.ts] Ownership check failed:', error);
      return { success: false, error: 'Token does not exist or ownership check failed' };
    }

    console.log('⛽ [blockchain.ts] Getting gas estimate...');
    const gasLimit = await getGasEstimateForAppendArt(contract, tokenId, contractObjects);
    console.log('⛽ [blockchain.ts] Gas limit estimated:', gasLimit.toString());
    
    console.log('📤 [blockchain.ts] Sending appendArt transaction...');
    const tx = await contract.appendArt(tokenId, contractObjects, {
      gasLimit: gasLimit
    });
    console.log('📤 [blockchain.ts] Transaction sent:', tx.hash);
    
    console.log('➕ AppendArt transaction sent:', tx.hash);
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
    const svg = await contract.tokenSVG(tokenId);
    return {
      svg,
      result: {
        success: true,
        data: { tokenId, svgLength: svg.length }
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
