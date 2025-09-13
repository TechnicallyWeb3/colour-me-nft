import React, { useState, useEffect } from 'react';
import './WebsiteContent.css';
import { 
  connectToWallet, 
  mintToken,
  switchNetwork,
  addNetwork,
  getCurrentNetwork,
  setupNetworkListeners,
  dappConfig,
  formatAddress,
  type ContractData
} from '../utils/blockchain';
import type { ColourMeNFT } from '../typechain-types/contracts/ColourMeNFT.sol/ColourMeNFT';

interface WebsiteContentProps {
  contractData: ContractData | null;
  contract: ColourMeNFT | null;
  onMintSuccess?: (tokenId: number) => void;
}

interface EventMessage {
  id: string;
  timestamp: Date;
  type: 'mint' | 'save' | 'transfer';
  message: string;
  txHash?: string;
}

const WebsiteContent: React.FC<WebsiteContentProps> = ({
  contractData,
  contract,
  onMintSuccess
}) => {
  // Wallet state
  const [account, setAccount] = useState<string>('');
  const [writeContract, setWriteContract] = useState<ColourMeNFT | null>(null);
  const [currentChainId, setCurrentChainId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Minting state
  const [mintQuantity, setMintQuantity] = useState<number>(1);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Events state
  const [eventMessages, setEventMessages] = useState<EventMessage[]>([
    // Sample messages to show the format
    {
      id: '1',
      timestamp: new Date(Date.now() - 300000),
      type: 'mint',
      message: '0x1234...5678 just minted 2 canvases'
    },
    {
      id: '2', 
      timestamp: new Date(Date.now() - 600000),
      type: 'save',
      message: '0xabcd...bcda just saved art to token #21'
    }
  ]);

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

  // Initialize wallet connection
  useEffect(() => {
    const initializeWallet = async () => {
      // Get current network
      const chainId = await getCurrentNetwork();
      if (chainId) {
        setCurrentChainId(chainId.toLowerCase());
      }

      // Auto-connect if previously connected
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            handleConnectWallet();
          }
        } catch (error) {
          console.log('Auto-connect failed:', error);
        }
      }
    };

    initializeWallet();

    // Setup network change listeners
    const cleanup = setupNetworkListeners(
      (chainId: string) => {
        setCurrentChainId(chainId.toLowerCase());
        if (isOnCorrectNetwork(chainId) && contract) {
          handleConnectWallet();
        }
      },
      (accounts: string[]) => {
        if (accounts.length === 0) {
          setAccount('');
          setWriteContract(null);
          showMessage('Wallet disconnected', true);
        } else if (accounts[0] !== account) {
          const newAccount = accounts[0];
          setAccount(newAccount);
          showMessage(`Switched to ${formatAddress(newAccount)}`);
          setTimeout(() => handleConnectWallet(), 100);
        }
      }
    );

    return cleanup || undefined;
  }, []);

  const handleConnectWallet = async () => {
    setIsLoading(true);
    try {
      const { signer, contract: walletContract, account: walletAccount, result } = await connectToWallet();
      
      if (result.success && walletAccount && signer) {
        setAccount(walletAccount);
        setWriteContract(walletContract);
        showMessage(`Connected to ${formatAddress(walletAccount)}`);
      } else {
        showMessage(result.error || 'Failed to connect wallet', true);
      }
    } catch (error) {
      showMessage(`Connection failed: ${error}`, true);
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
        // If switch fails, try adding the network
        const addResult = await handleAddNetwork();
        if (!addResult) {
          showMessage(result.error || 'Failed to switch network', true);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNetwork = async () => {
    try {
      const result = await addNetwork();
      if (result.success) {
        showMessage('Network added successfully');
        const chainId = await getCurrentNetwork();
        if (chainId) setCurrentChainId(chainId.toLowerCase());
        return true;
      } else {
        showMessage(result.error || 'Failed to add network', true);
        return false;
      }
    } catch (error) {
      showMessage(`Failed to add network: ${error}`, true);
      return false;
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

    if (contractData && contractData.tokenCount >= contractData.maxSupply) {
      showMessage('Collection is sold out', true);
      return;
    }

    setIsLoading(true);
    try {
      showMessage(`Minting ${mintQuantity} token${mintQuantity > 1 ? 's' : ''} to ${formatAddress(account)}...`);
      
      // For now, we'll mint one at a time - you can extend this for quantity later
      const result = await mintToken(writeContract, account, mintQuantity);
      
      if (result.success) {
        const newTokenId = (contractData?.tokenCount || 0) + 1;
        showMessage(`Token #${newTokenId} minted successfully!`);
        
        // Add event message
        const newEvent: EventMessage = {
          id: Date.now().toString(),
          timestamp: new Date(),
          type: 'mint',
          message: `${formatAddress(account)} just minted ${mintQuantity} canvas${mintQuantity > 1 ? 'es' : ''}`,
          txHash: result.data?.hash
        };
        setEventMessages(prev => [newEvent, ...prev.slice(0, 9)]); // Keep only last 10
        
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

  const getButtonState = () => {
    if (isLoading) {
      return {
        text: 'Processing...',
        action: () => {},
        disabled: true,
        className: 'loading'
      };
    }

    if (!account) {
      return {
        text: 'Connect Wallet',
        action: handleConnectWallet,
        disabled: false,
        className: 'connect'
      };
    }

    if (!isOnCorrectNetwork()) {
      return {
        text: 'Switch Network',
        action: handleSwitchNetwork,
        disabled: false,
        className: 'switch-network'
      };
    }

    if (contractData && !contractData.isMintActive) {
      return {
        text: 'Connected (Minting Not Open)',
        action: () => {},
        disabled: true,
        className: 'not-open'
      };
    }

    if (contractData && contractData.tokenCount >= contractData.maxSupply) {
      return {
        text: 'Sold Out',
        action: () => {},
        disabled: true,
        className: 'sold-out'
      };
    }

    return {
      text: 'Mint',
      action: handleMint,
      disabled: false,
      className: 'mint'
    };
  };

  const buttonState = getButtonState();

  const renderMintingStatus = () => {
    if (!contractData) return <div className="loading-text">Loading...</div>;

    const now = new Date();
    const isActive = contractData.isMintActive;
    const mintEnd = contractData.mintEnd;
    const mintOpen = contractData.mintOpen;

    if (isActive) {
      const timeLeft = mintEnd.getTime() - now.getTime();
      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

      return (
        <div className="minting-open">
          <h3>Minting Open</h3>
          <div className="countdown">
            Ends in {days}d {hours}h {minutes}m
          </div>
        </div>
      );
    } else if (now < mintOpen) {
      const timeLeft = mintOpen.getTime() - now.getTime();
      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

      return (
        <div className="minting-closed-future">
          <h3>Minting Opens In</h3>
          <div className="countdown">
            {days}d {hours}h {minutes}m
          </div>
        </div>
      );
    } else {
      return (
        <div className="minting-closed">
          <h3>Minting Closed</h3>
          <p>Minting period has ended</p>
        </div>
      );
    }
  };

  return (
    <div className="website-content">
      <div className="website-layout">
        
        {/* Combined Minting Sidebar */}
        <div className="minting-sidebar">
          <div className="sidebar-header">
            <h2>🎨 ColourMe NFT</h2>
            <div className="sidebar-subtitle">Mint Your Canvas</div>
          </div>

          {/* Collection Stats */}
          <div className="collection-stats">
            <div className="stat-item">
              <div className="stat-label">Collection Progress</div>
              <div className="supply-counter">
                <span className="count">{contractData?.tokenCount || 0}</span>
                <span className="separator">/</span>
                <span className="total">{contractData?.maxSupply || 0}</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ 
                    width: `${contractData ? (contractData.tokenCount / contractData.maxSupply) * 100 : 0}%` 
                  }}
                ></div>
              </div>
            </div>

            <div className="stat-item">
              <div className="stat-label">Mint Price</div>
              <div className="mint-price">
                {contractData?.mintPrice || '0.0'} {contractData?.chain?.symbol || 'ETH'}
              </div>
            </div>
          </div>

          {/* Minting Status */}
          <div className="minting-status">
            {renderMintingStatus()}
          </div>

          {/* Wallet Connection Info */}
          {account && (
            <div className="wallet-info">
              <div className="wallet-header">Wallet Connected</div>
              <div className="wallet-address">{formatAddress(account)}</div>
              <div className={`network-indicator ${isOnCorrectNetwork() ? 'correct' : 'incorrect'}`}>
                {isOnCorrectNetwork() ? '✅ Correct Network' : '❌ Wrong Network'}
              </div>
            </div>
          )}

          {/* Mint Controls */}
          <div className="mint-controls">
            {/* Mint quantity input - only show when connected and ready to mint */}
            {account && isOnCorrectNetwork() && contractData?.isMintActive && !buttonState.disabled && buttonState.className === 'mint' && (
              <div className="quantity-section">
                <label htmlFor="mint-quantity">Quantity:</label>
                <input
                  id="mint-quantity"
                  type="number"
                  min="1"
                  max="10"
                  value={mintQuantity}
                  onChange={(e) => setMintQuantity(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                  className="quantity-input"
                />
              </div>
            )}

            <button
              onClick={buttonState.action}
              disabled={buttonState.disabled}
              className={`action-button ${buttonState.className}`}
            >
              {buttonState.text}
            </button>

            {/* Status Messages */}
            {statusMessage && (
              <div className="status-message success">
                {statusMessage}
              </div>
            )}

            {errorMessage && (
              <div className="status-message error">
                {errorMessage}
              </div>
            )}
          </div>

          {contractData && contractData.tokenCount >= contractData.maxSupply && (
            <div className="sold-out-banner">
              <span>🚫 SOLD OUT</span>
            </div>
          )}
        </div>

        {/* Event Messages Section */}
        <div className="activity-panel">
          <div className="panel-header">
            <h3>🔔 Recent Activity</h3>
          </div>
          <div className="event-messages">
            {eventMessages.length > 0 ? (
              eventMessages.map(event => (
                <div key={event.id} className={`event-message ${event.type}`}>
                  <div className="event-text">{event.message}</div>
                  <div className="event-time">
                    {event.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-events">No recent activity</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default WebsiteContent;
