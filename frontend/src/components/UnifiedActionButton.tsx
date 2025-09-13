import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { 
  dappConfig,
  connectToProvider,
  connectToWallet,
  getTokenCount,
  getProjectInfo,
  mintToken,
  switchNetwork,
  setupNetworkListeners,
  getCurrentNetwork,
  addNetwork
} from '../utils/blockchain';
import type { ColourMeNFT } from '../typechain-types/contracts/ColourMeNFT.sol/ColourMeNFT';

interface UnifiedActionButtonProps {
  onMintSuccess?: (tokenId: number) => void;
  onAccountChange?: (account: string) => void;
}

const UnifiedActionButton: React.FC<UnifiedActionButtonProps> = ({ 
  onMintSuccess,
  onAccountChange 
}) => {
  // Connection state
  const [readOnlyContract, setReadOnlyContract] = useState<ColourMeNFT | null>(null);
  const [writeContract, setWriteContract] = useState<ColourMeNFT | null>(null);
  const [account, setAccount] = useState<string>('');
  const [walletProvider, setWalletProvider] = useState<ethers.BrowserProvider | null>(null);
  
  // Network state
  const [currentChainId, setCurrentChainId] = useState<string>('');
  
  // Contract data
  const [tokenCount, setTokenCount] = useState<number>(0);
  const [maxSupply, setMaxSupply] = useState<number>(0);
  
  // Button state
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Helper functions
  const showMessage = (message: string, isError = false) => {
    if (isError) {
      setErrorMessage(message);
      setStatusMessage('');
    } else {
      setStatusMessage(message);
      setErrorMessage('');
    }
    setTimeout(() => {
      setStatusMessage('');
      setErrorMessage('');
    }, 5000);
  };

  const isOnCorrectNetwork = (chainId: string = currentChainId) => {
    return chainId.toLowerCase() === dappConfig.network.chainId.toLowerCase();
  };
  
  const isSoldOut = tokenCount >= maxSupply;

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      console.log(`🔗 Connecting to ${dappConfig.network.chainName} (${dappConfig.activeNetwork})...`);
      
      // Connect to provider first
      const { contract: readContract, result } = await connectToProvider();
      if (result.success && readContract) {
        console.log(`✅ Connected to contract at ${dappConfig.contracts.ColourMeNFT.address}`);
        setReadOnlyContract(readContract);
        
        // Get contract data with single efficient call
        console.log('📊 Loading contract data...');
        const { projectInfo, result: projectResult } = await getProjectInfo(readContract);
        
        if (projectResult.success && projectInfo) {
          setTokenCount(projectInfo.tokenCount);
          setMaxSupply(projectInfo.maxSupply);
          console.log(`📈 Token count: ${projectInfo.tokenCount}`);
          console.log(`🎯 Max supply: ${projectInfo.maxSupply}`);
          console.log(`💰 Mint price: ${projectInfo.mintPrice}`);
          console.log(`📅 Mint timing: ${projectInfo.mintStart} - ${projectInfo.mintStart + projectInfo.mintDuration}`);
        } else {
          console.error('❌ Failed to load project info:', projectResult.error);
        }
      } else {
        console.error('❌ Failed to connect to contract:', result.error);
      }

      // Get current network
      const chainId = await getCurrentNetwork();
      if (chainId) {
        setCurrentChainId(chainId.toLowerCase());
        console.log(`🌐 Current network: ${chainId} (Required: ${dappConfig.network.chainId})`);
      }

      // Attempt to connect wallet automatically
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            handleConnectWallet();
          }
        } catch (error) {
          // Silent fail for auto-connect
        }
      }
    };

    initializeApp();

    // Setup network change listeners
    const cleanup = setupNetworkListeners(
      (chainId: string) => {
        setCurrentChainId(chainId.toLowerCase());
        if (isOnCorrectNetwork(chainId) && readOnlyContract) {
          // Reconnect if we're now on the correct network
          handleConnectWallet();
        }
      },
      (accounts: string[]) => {
        if (accounts.length === 0) {
          setAccount('');
          setWriteContract(null);
          setWalletProvider(null);
          if (onAccountChange) onAccountChange('');
          showMessage('Wallet disconnected', true);
        } else if (accounts[0] !== account) {
          const newAccount = accounts[0];
          setAccount(newAccount);
          if (onAccountChange) onAccountChange(newAccount);
          showMessage(`Switched to ${newAccount.slice(0, 6)}...${newAccount.slice(-4)}`);
          
          setTimeout(() => {
            handleConnectWallet();
          }, 100);
        }
      }
    );

    return cleanup || undefined;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update account in parent when it changes
  useEffect(() => {
    if (onAccountChange) {
      onAccountChange(account);
    }
  }, [account, onAccountChange]);

  // Update token count when needed
  useEffect(() => {
    if (readOnlyContract) {
      const updateTokenCount = async () => {
        console.log('🔄 Updating token count...');
        const { count, result } = await getTokenCount(readOnlyContract);
        if (result.success) {
          setTokenCount(count);
          console.log(`📈 Updated token count: ${count}`);
        } else {
          console.error('❌ Failed to update token count:', result.error);
        }
      };
      updateTokenCount();
    }
  }, [readOnlyContract, account]);

  const handleConnectWallet = async () => {
    setIsLoading(true);
    try {
      const { signer, contract, account: walletAccount, result } = await connectToWallet();
      
      if (result.success && walletAccount && signer) {
        setAccount(walletAccount);
        setWriteContract(contract);
        
        // Store the provider from the signer for potential future use
        if (signer.provider && signer.provider instanceof ethers.BrowserProvider) {
          setWalletProvider(signer.provider);
        }
        
        showMessage(`Connected to ${walletAccount.slice(0, 6)}...${walletAccount.slice(-4)}`);
      } else {
        showMessage(result.error || 'Failed to connect wallet', true);
      }
    } catch (error) {
      showMessage(`Connection failed: ${error}`, true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNetwork = async () => {
    setIsLoading(true);
    try {
      const result = await addNetwork();
      if (result.success) {
        showMessage('Network added successfully');
        const chainId = await getCurrentNetwork();
        if (chainId) setCurrentChainId(chainId.toLowerCase());
      } else {
        showMessage(result.error || 'Failed to add network', true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchNetwork = async () => {
    setIsLoading(true);
    try {
      const result = await switchNetwork();
      if (result.success) {
        showMessage('Network switched successfully');
        const chainId = await getCurrentNetwork();
        if (chainId) setCurrentChainId(chainId.toLowerCase());
      } else {
        showMessage(result.error || 'Failed to switch network', true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMint = async () => {
    console.log('🪙 Mint button clicked');
    
    if (!account) {
      console.log('🔗 No account connected, attempting to connect wallet...');
      await handleConnectWallet();
      return;
    }

    console.log(`👤 Account: ${account}`);
    console.log(`🌐 Current network: ${currentChainId}`);
    console.log(`🎯 Required network: ${dappConfig.network.chainId}`);
    console.log(`📍 Target contract: ${dappConfig.contracts.ColourMeNFT.address}`);

    if (!isOnCorrectNetwork()) {
      console.log('❌ Wrong network detected, attempting to switch...');
      await handleSwitchNetwork();
      return;
    }

    if (!writeContract) {
      console.log('⚠️ Write contract not available, reconnecting...');
      showMessage('Write contract not available - reconnecting...', true);
      await handleConnectWallet();
      return;
    }

    if (isSoldOut) {
      console.log('🚫 Collection sold out');
      showMessage('Collection is sold out', true);
      return;
    }

    setIsLoading(true);
    try {
      console.log(`🚀 Starting mint process for token #${tokenCount + 1}`);
      console.log(`📝 Minting to address: ${account}`);
      console.log(`📋 Using contract: ${writeContract.target}`);
      
      showMessage(`Minting token to ${account.slice(0, 6)}...${account.slice(-4)}...`);
      const result = await mintToken(writeContract, account);
      
      if (result.success) {
        const newTokenId = tokenCount + 1;
        setTokenCount(newTokenId);
        console.log(`✅ Mint successful! Token ID: ${newTokenId}`);
        console.log(`📊 Transaction hash: ${result.data?.hash}`);
        showMessage(`Token #${newTokenId} minted successfully!`);
        
        if (onMintSuccess) {
          onMintSuccess(newTokenId);
        }
      } else {
        console.error('❌ Mint failed:', result.error);
        showMessage(result.error || 'Minting failed', true);
      }
    } catch (error) {
      console.error('💥 Mint error:', error);
      showMessage(`Minting failed: ${error}`, true);
    } finally {
      setIsLoading(false);
    }
  };

  // Determine button state and action
  const getButtonState = () => {
    if (isLoading) {
      return {
        text: '⏳ Processing...',
        action: () => {},
        disabled: true,
        color: '#ccc'
      };
    }

    if (!account) {
      return {
        text: '🔗 Connect Wallet',
        action: handleConnectWallet,
        disabled: false,
        color: '#2196F3'
      };
    }

    if (!isOnCorrectNetwork()) {
      return {
        text: '🔄 Switch Network',
        action: async () => {
          // Try switching first, if that fails, try adding the network
          const switchResult = await switchNetwork();
          if (!switchResult.success) {
            await handleAddNetwork();
          }
        },
        disabled: false,
        color: '#FF9800'
      };
    }

    if (isSoldOut) {
      return {
        text: '🚫 Sold Out',
        action: () => {},
        disabled: true,
        color: '#ccc'
      };
    }

    return {
      text: '🪙 Mint NFT',
      action: handleMint,
      disabled: false,
      color: '#4CAF50'
    };
  };

  const buttonState = getButtonState();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '15px'
    }}>
      {/* Supply Information */}
      <div style={{
        backgroundColor: 'white',
        padding: '15px',
        borderRadius: '8px',
        textAlign: 'center',
        border: '2px solid #ddd'
      }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
          {tokenCount} / {maxSupply}
        </div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          Tokens Minted
        </div>
        {isSoldOut && (
          <div style={{ 
            marginTop: '10px', 
            color: '#f44336', 
            fontWeight: 'bold' 
          }}>
            🚫 Collection Sold Out
          </div>
        )}
      </div>

      {/* Account Info */}
      {account && (
        <div style={{
          backgroundColor: 'white',
          padding: '12px',
          borderRadius: '8px',
          textAlign: 'center',
          border: `2px solid ${isOnCorrectNetwork() ? '#4CAF50' : '#FF9800'}`
        }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
            Connected Account
          </div>
          <div style={{ 
            fontSize: '14px', 
            fontWeight: 'bold',
            color: '#333',
            marginBottom: '2px'
          }}>
            {account.slice(0, 6)}...{account.slice(-4)}
          </div>
          <div style={{ 
            fontSize: '10px', 
            color: '#999',
            marginBottom: '4px'
          }}>
            {account}
          </div>
          <div style={{ 
            fontSize: '11px', 
            color: isOnCorrectNetwork() ? '#4CAF50' : '#FF9800',
            marginTop: '4px'
          }}>
            {isOnCorrectNetwork() ? '✅ Correct Network' : '❌ Wrong Network'}
          </div>
        </div>
      )}

      {/* Network Info - only show when connected but on wrong network */}
      {account && !isOnCorrectNetwork() && (
        <div style={{
          backgroundColor: '#fff3e0',
          padding: '12px',
          borderRadius: '8px',
          border: '2px solid #FF9800'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#E65100', marginBottom: '8px' }}>
            Network Required
          </div>
          <div style={{ fontSize: '11px', color: '#F57C00' }}>
            <strong>Required:</strong> {dappConfig.network.chainName}
          </div>
          <div style={{ fontSize: '11px', color: '#F57C00' }}>
            <strong>Current:</strong> {currentChainId || 'Unknown'}
          </div>
        </div>
      )}

      {/* Unified Action Button */}
      <button
        onClick={buttonState.action}
        disabled={buttonState.disabled}
        style={{
          width: '100%',
          padding: '15px',
          backgroundColor: buttonState.color,
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: buttonState.disabled ? 'not-allowed' : 'pointer',
          fontSize: '18px',
          fontWeight: 'bold',
          transition: 'all 0.3s ease'
        }}
      >
        {buttonState.text}
      </button>

      {/* Status Messages */}
      {statusMessage && (
        <div style={{
          padding: '10px',
          backgroundColor: '#e8f5e8',
          color: '#2e7d32',
          borderRadius: '6px',
          fontSize: '14px',
          textAlign: 'center'
        }}>
          {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div style={{
          padding: '10px',
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderRadius: '6px',
          fontSize: '14px',
          textAlign: 'center'
        }}>
          {errorMessage}
        </div>
      )}
    </div>
  );
};

export default UnifiedActionButton;
