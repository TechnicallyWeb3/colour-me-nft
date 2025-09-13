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
  onContractDataUpdate?: () => void;
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
  onMintSuccess,
  onContractDataUpdate
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
        showMessage(`Successfully minted ${mintQuantity} token${mintQuantity > 1 ? 's' : ''}!`);
        
        // Add event message
        const newEvent: EventMessage = {
          id: Date.now().toString(),
          timestamp: new Date(),
          type: 'mint',
          message: `${formatAddress(account)} just minted ${mintQuantity} canvas${mintQuantity > 1 ? 'es' : ''}`,
          txHash: result.data?.hash
        };
        setEventMessages(prev => [newEvent, ...prev.slice(0, 9)]); // Keep only last 10
        
        // Refresh contract data from blockchain to get accurate token count
        if (onContractDataUpdate) {
          onContractDataUpdate();
        }
        
        // Set active token to the first newly minted token
        if (onMintSuccess && contractData) {
          const newTokenId = contractData.tokenCount + 1; // First new token
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
    if (!contractData) return 'Loading...';

    const now = new Date();
    const isActive = contractData.isMintActive;
    const mintEnd = contractData.mintEnd;
    const mintOpen = contractData.mintOpen;

    if (contractData.tokenCount >= contractData.maxSupply) {
      return 'Sold Out';
    } else if (isActive) {
      const timeLeft = mintEnd.getTime() - now.getTime();
      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      return `Ends in ${days}d ${hours}h ${minutes}m`;
    } else if (now < mintOpen) {
      const timeLeft = mintOpen.getTime() - now.getTime();
      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      return `Opens in ${days}d ${hours}h ${minutes}m`;
    } else {
      return 'Minting Closed';
    }
  };

  return (
    <div className="website-content">
      <div className="website-layout">
        
        {/* 90s Style Sidebar */}
        <div className="sidebar">
          <div className="sidebar-header">
            <h2>🎨 ColourMe NFT</h2>
            <div className="sidebar-subtitle">Mint Your Canvas</div>
          </div>

          {/* Collection Details Section */}
          <div className="section">
            <h3>Collection Details</h3>
            
            <p><strong>Status:</strong> {contractData?.isMintActive ? 'Open' : 'Closed'}</p>
            
            <p>{renderMintingStatus()}</p>
            
            <p><strong>Minted:</strong> {contractData?.tokenCount || 0}/{contractData?.maxSupply || 0}</p>
            
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ 
                  width: `${contractData ? (contractData.tokenCount / contractData.maxSupply) * 100 : 0}%` 
                }}
              ></div>
            </div>
            
            <p><strong>Price:</strong> {contractData?.mintPrice}</p>
          </div>

          {/* Login/Mint Section */}
          <div className="section">
            <h3>Login/Mint</h3>
            
            {!account ? (
              <button onClick={buttonState.action} className="simple-button">
                Connect Wallet
              </button>
            ) : (
              <div>
                <p><strong>Wallet Connected</strong></p>
                <p>{formatAddress(account)}</p>
                {!isOnCorrectNetwork() && (
                  <p style={{ color: 'red' }}>Wrong Network</p>
                )}
                
                {contractData?.isMintActive && isOnCorrectNetwork() && buttonState.className === 'mint' && (
                  <p>
                    Qty: <input 
                      type="number" 
                      min="1" 
                      max="10" 
                      value={mintQuantity}
                      onChange={(e) => setMintQuantity(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                      style={{ width: '50px', marginLeft: '5px', marginRight: '10px' }}
                    />
                    <button onClick={handleMint} className="simple-button">
                      Mint
                    </button>
                  </p>
                )}
                
                {buttonState.className !== 'mint' && contractData?.isMintActive && (
                  <button onClick={buttonState.action} className="simple-button">
                    {buttonState.text}
                  </button>
                )}
              </div>
            )}

            {/* Status Messages */}
            {statusMessage && <p style={{ color: 'green' }}>{statusMessage}</p>}
            {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
          </div>
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
