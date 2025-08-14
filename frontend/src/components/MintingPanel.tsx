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

interface MintingPanelProps {
  onMintSuccess?: (tokenId: number) => void;
}

const MintingPanel: React.FC<MintingPanelProps> = ({ onMintSuccess }) => {
  // Connection state
  const [readOnlyContract, setReadOnlyContract] = useState<ColourMeNFT | null>(null);
  const [writeContract, setWriteContract] = useState<ColourMeNFT | null>(null);
  const [account, setAccount] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Network state
  const [currentChainId, setCurrentChainId] = useState<string>('');
  const [isNetworkManaging, setIsNetworkManaging] = useState(false);
  
  // Contract data
  const [tokenCount, setTokenCount] = useState<number>(0);
  const [maxSupply, setMaxSupply] = useState<number>(0);
  const [isMinting, setIsMinting] = useState(false);
  
  // Status messages
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Helper functions
  const showStatus = (message: string, isError = false) => {
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

  // Helper function for network comparison
  const isOnCorrectNetwork = (chainId: string = currentChainId) => {
    return chainId.toLowerCase() === dappConfig.network.chainId.toLowerCase();
  };
  
  const isMintingAvailable = account && tokenCount < maxSupply;

  // Initialize provider and attempt wallet connection
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
          showStatus('Wallet disconnected', true);
        } else if (accounts[0] !== account) {
          setAccount(accounts[0]);
          showStatus(`Connected to ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`);
        }
      }
    );

    return cleanup || undefined;
  }, []);

  // Update token count when needed
  useEffect(() => {
    if (readOnlyContract) {
      const updateTokenCount = async () => {
        const { count } = await getTokenCount(readOnlyContract);
        setTokenCount(count);
      };
      updateTokenCount();
    }
  }, [readOnlyContract, account]); // Update when account changes (after mint)

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    try {
      const { signer, contract, account: walletAccount, result } = await connectToWallet();
      
      if (result.success && walletAccount) {
        setAccount(walletAccount);
        setWriteContract(contract);
        showStatus(`Connected to ${walletAccount.slice(0, 6)}...${walletAccount.slice(-4)}`);
      } else {
        showStatus(result.error || 'Failed to connect wallet', true);
      }
    } catch (error) {
      showStatus(`Connection failed: ${error}`, true);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleAddNetwork = async () => {
    setIsNetworkManaging(true);
    try {
      const result = await addNetwork();
      if (result.success) {
        showStatus('Network added successfully');
        const chainId = await getCurrentNetwork();
        if (chainId) setCurrentChainId(chainId.toLowerCase());
      } else {
        showStatus(result.error || 'Failed to add network', true);
      }
    } finally {
      setIsNetworkManaging(false);
    }
  };

  const handleSwitchNetwork = async () => {
    setIsNetworkManaging(true);
    try {
      const result = await switchNetwork();
      if (result.success) {
        showStatus('Network switched successfully');
        const chainId = await getCurrentNetwork();
        if (chainId) setCurrentChainId(chainId.toLowerCase());
      } else {
        showStatus(result.error || 'Failed to switch network', true);
      }
    } finally {
      setIsNetworkManaging(false);
    }
  };

  const handleMint = async () => {
    if (!account) {
      showStatus('Wallet not connected', true);
      return;
    }

    // If on wrong network, switch network instead of minting
    if (!isOnCorrectNetwork()) {
      await handleSwitchNetwork();
      return;
    }

    // If on correct network but no write contract, show error
    if (!writeContract) {
      showStatus('Write contract not available', true);
      return;
    }

    // Check if sold out
    if (tokenCount >= maxSupply) {
      showStatus('Collection is sold out', true);
      return;
    }

    setIsMinting(true);
    try {
      showStatus('Minting token...');
      const result = await mintToken(writeContract, account);
      
      if (result.success) {
        const newTokenId = tokenCount + 1;
        setTokenCount(newTokenId);
        showStatus(`Token #${newTokenId} minted successfully!`);
        
        if (onMintSuccess) {
          onMintSuccess(newTokenId);
        }
      } else {
        showStatus(result.error || 'Minting failed', true);
      }
    } catch (error) {
      showStatus(`Minting failed: ${error}`, true);
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div style={{
      padding: '20px',
      border: '2px solid #ddd',
      borderRadius: '12px',
      backgroundColor: '#f9f9f9',
      maxWidth: '400px',
      margin: '0 auto'
    }}>
      <h2 style={{ 
        margin: '0 0 20px 0', 
        textAlign: 'center',
        color: '#333'
      }}>
        🎨 Paint NFT Minting
      </h2>

      {/* Supply Information */}
      <div style={{
        backgroundColor: 'white',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
          {tokenCount} / {maxSupply}
        </div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          Tokens Minted
        </div>
        {tokenCount >= maxSupply && (
          <div style={{ 
            marginTop: '10px', 
            color: '#f44336', 
            fontWeight: 'bold' 
          }}>
            🚫 Collection Sold Out
          </div>
        )}
      </div>

      {/* Network Status */}
      <div style={{
        backgroundColor: 'white',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Network Status</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <span style={{ fontSize: '12px' }}>
            <strong>Required:</strong> {dappConfig.network.chainName} ({dappConfig.network.chainId.toLowerCase()})
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
          <span style={{ fontSize: '12px' }}>
            <strong>Current:</strong> {currentChainId || 'Unknown'}
            {isOnCorrectNetwork() ? ' ✅' : ' ❌'}
          </span>
        </div>

        {!isOnCorrectNetwork() && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={handleSwitchNetwork}
              disabled={isNetworkManaging || !account}
              style={{
                padding: '8px 16px',
                backgroundColor: (isNetworkManaging || !account) ? '#ccc' : '#FF9800',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: (isNetworkManaging || !account) ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                flex: 1
              }}
            >
              {isNetworkManaging ? '⏳ Switching...' : !account ? '🔒 Connect First' : '🔄 Switch Network'}
            </button>
            <button
              onClick={handleAddNetwork}
              disabled={isNetworkManaging || !account}
              style={{
                padding: '8px 16px',
                backgroundColor: (isNetworkManaging || !account) ? '#ccc' : '#9C27B0',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: (isNetworkManaging || !account) ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                flex: 1
              }}
            >
              {isNetworkManaging ? '⏳ Adding...' : !account ? '🔒 Connect First' : '➕ Add Network'}
            </button>
          </div>
        )}
      </div>

      {/* Wallet Connection */}
      <div style={{
        backgroundColor: 'white',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Wallet Connection</h4>
        
        {!account ? (
          <button
            onClick={handleConnectWallet}
            disabled={isConnecting}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: isConnecting ? '#ccc' : '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isConnecting ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            {isConnecting ? '⏳ Connecting...' : '🔗 Connect Wallet'}
          </button>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '14px', 
              color: '#666',
              marginBottom: '5px'
            }}>
              Connected:
            </div>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: 'bold',
              color: '#4CAF50'
            }}>
              {account.slice(0, 6)}...{account.slice(-4)}
            </div>
          </div>
        )}
      </div>

      {/* Mint Button */}
              <button
          onClick={handleMint}
          disabled={!account || (isMinting || isNetworkManaging) || tokenCount >= maxSupply}
          style={{
            width: '100%',
            padding: '15px',
            backgroundColor: 
              !account ? '#ccc' :
              tokenCount >= maxSupply ? '#ccc' :
              !isOnCorrectNetwork() ? '#FF9800' : 
              (isMinting || isNetworkManaging) ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 
              !account || tokenCount >= maxSupply || (isMinting || isNetworkManaging) ? 'not-allowed' : 'pointer',
            fontSize: '18px',
            fontWeight: 'bold'
          }}
        >
          {isNetworkManaging ? '⏳ Switching Network...' :
           isMinting ? '⏳ Minting...' : 
           tokenCount >= maxSupply ? '🚫 Sold Out' :
           !account ? '🔒 Connect Wallet to Mint' :
           !isOnCorrectNetwork() ? '🔄 Switch Network' :
           '🪙 Mint NFT'}
        </button>

      {/* Status Messages */}
      {statusMessage && (
        <div style={{
          marginTop: '15px',
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
          marginTop: '15px',
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

export default MintingPanel;
