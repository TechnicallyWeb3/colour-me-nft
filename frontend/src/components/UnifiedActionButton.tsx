import React, { useState, useEffect } from 'react';
import { 
  dappConfig,
  connectToProvider,
  connectToWallet,
  getTokenCount,
  getMaxSupply,
  mintToken,
  addNetwork,
  switchNetwork,
  setupNetworkListeners,
  getCurrentNetwork,
  type ConnectionResult,
  type NetworkStatus
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
  
  const isMintingAvailable = account && tokenCount < maxSupply && isOnCorrectNetwork();
  const isSoldOut = tokenCount >= maxSupply;

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      // Connect to provider first
      const { contract: readContract, result } = await connectToProvider();
      if (result.success && readContract) {
        setReadOnlyContract(readContract);
        
        // Get contract data
        const [tokenCountResult, maxSupplyResult] = await Promise.all([
          getTokenCount(readContract),
          getMaxSupply(readContract)
        ]);
        
        if (tokenCountResult.result.success) setTokenCount(tokenCountResult.count);
        if (maxSupplyResult.result.success) setMaxSupply(maxSupplyResult.maxSupply);
      }

      // Get current network
      const chainId = await getCurrentNetwork();
      if (chainId) setCurrentChainId(chainId.toLowerCase());

      // Attempt to connect wallet automatically
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            handleConnectWallet();
          }
        } catch (error) {
          console.log('No auto-connect available');
        }
      }
    };

    initializeApp();

    // Test if MetaMask events are working
    if (window.ethereum) {
      console.log('Testing MetaMask event setup...');
      console.log('MetaMask object exists:', !!window.ethereum);
      console.log('MetaMask.on method exists:', typeof window.ethereum.on === 'function');
    }

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
        console.log('MetaMask accountsChanged event fired with accounts:', accounts);
        console.log('Current stored account:', account);
        
        if (accounts.length === 0) {
          console.log('Account disconnected');
          setAccount('');
          setWriteContract(null);
          if (onAccountChange) onAccountChange('');
          showMessage('Wallet disconnected', true);
        } else if (accounts[0] !== account) {
          const newAccount = accounts[0];
          console.log('Account changed from', account, 'to', newAccount);
          
          setAccount(newAccount);
          if (onAccountChange) onAccountChange(newAccount);
          showMessage(`Switched to ${newAccount.slice(0, 6)}...${newAccount.slice(-4)}`);
          
          setTimeout(() => {
            handleConnectWallet();
          }, 100);
        } else {
          console.log('No account change detected');
        }
      }
    );

    return cleanup || undefined;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Manual account check function
  const checkAccountManually = async () => {
    if (!window.ethereum) return;
    
    try {
      const currentAccounts = await window.ethereum.request({ method: 'eth_accounts' });
      console.log('MetaMask current accounts:', currentAccounts);
      console.log('App stored account:', account);
      
      if (currentAccounts.length > 0 && currentAccounts[0] !== account) {
        console.log('Manual check detected account change from', account, 'to', currentAccounts[0]);
        const newAccount = currentAccounts[0];
        setAccount(newAccount);
        if (onAccountChange) onAccountChange(newAccount);
        showMessage(`Switched to ${newAccount.slice(0, 6)}...${newAccount.slice(-4)}`);
        setTimeout(() => {
          handleConnectWallet();
        }, 100);
      } else if (currentAccounts.length === 0) {
        console.log('No accounts found in MetaMask');
      } else {
        console.log('No account change detected');
      }
    } catch (error) {
      console.error('Error in manual account check:', error);
    }
  };

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
        const { count } = await getTokenCount(readOnlyContract);
        setTokenCount(count);
      };
      updateTokenCount();
    }
  }, [readOnlyContract, account]);

  const handleConnectWallet = async () => {
    setIsLoading(true);
    try {
      const { signer, contract, account: walletAccount, result } = await connectToWallet();
      
      if (result.success && walletAccount) {
        console.log('Wallet connected to', walletAccount);
        setAccount(walletAccount);
        setWriteContract(contract);
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
    if (!account) {
      await handleConnectWallet();
      return;
    }

    if (!isOnCorrectNetwork()) {
      await handleSwitchNetwork();
      return;
    }

    if (!writeContract) {
      showMessage('Write contract not available - reconnecting...', true);
      await handleConnectWallet();
      return;
    }

    if (isSoldOut) {
      showMessage('Collection is sold out', true);
      return;
    }

    // Double-check current account before minting
    try {
      const currentAccounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (currentAccounts.length > 0 && currentAccounts[0] !== account) {
        setAccount(currentAccounts[0]);
        await handleConnectWallet();
        showMessage('Account updated, please try minting again', true);
        return;
      }
    } catch (error) {
      console.error('Error checking current account:', error);
    }

    setIsLoading(true);
    try {
      showMessage(`Minting token to ${account.slice(0, 6)}...${account.slice(-4)}...`);
      const result = await mintToken(writeContract, account);
      
      if (result.success) {
        const newTokenId = tokenCount + 1;
        setTokenCount(newTokenId);
        showMessage(`Token #${newTokenId} minted successfully!`);
        
        if (onMintSuccess) {
          onMintSuccess(newTokenId);
        }
      } else {
        showMessage(result.error || 'Minting failed', true);
      }
    } catch (error) {
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
      // Check if we should show "Add Network" or "Switch Network"
      // For simplicity, we'll show "Switch Network" and handle adding if needed
      return {
        text: '🔄 Switch Network',
        action: handleSwitchNetwork,
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
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '4px'
          }}>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Connected Account
            </div>
            <button
              onClick={checkAccountManually}
              style={{
                background: 'none',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                padding: '2px 6px'
              }}
              title="Check for Account Changes"
            >
              🔄
            </button>
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
