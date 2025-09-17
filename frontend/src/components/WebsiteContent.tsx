import React, { useState, useEffect, useRef } from 'react';
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

// Countdown Timer Component
interface CountdownTimerProps {
  targetDate: Date;
  prefix: string;
  onComplete?: () => void;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetDate, prefix, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft(0);
        if (onComplete) onComplete();
        return;
      }

      setTimeLeft(difference);
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [targetDate, onComplete]);

  const formatTime = (ms: number): string => {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    return `${days}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (timeLeft <= 0) {
    return <span>Open In: 0:00:00:00</span>;
  }

  return <span>{prefix} {formatTime(timeLeft)}</span>;
};

interface WebsiteContentProps {
  contractData: ContractData | null;
  contract: ColourMeNFT | null;
  onMintSuccess?: (tokenId: number) => void;
  onContractDataUpdate?: () => void;
  onAccountChange?: (account: string) => void;
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
  onContractDataUpdate,
  onAccountChange
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
  const [eventMessages, setEventMessages] = useState<EventMessage[]>([]);
  const eventListenersRef = useRef<(() => void) | null>(null);

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

  // Add event message to the list
  const addEventMessage = (event: Omit<EventMessage, 'id'>) => {
    const newEvent: EventMessage = {
      ...event,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    };
    setEventMessages(prev => [newEvent, ...prev.slice(0, 19)]); // Keep only last 20 events
  };

  // Load recent events from the blockchain
  const loadRecentEvents = async (contractInstance: ColourMeNFT) => {
    try {
      console.log('📜 Loading recent events from blockchain...');
      
      // Get recent CanvasMinted events (last 100 blocks for better coverage)
      const canvasMintedFilter = contractInstance.filters.CanvasMinted();
      const currentBlock = await contractInstance.runner?.provider?.getBlockNumber() || 0;
      const fromBlock = Math.max(0, currentBlock - 100);
      
      const canvasMintedEvents = await contractInstance.queryFilter(
        canvasMintedFilter,
        fromBlock,
        currentBlock
      );
      
      // Get recent ArtSaved events (last 100 blocks)
      const artSavedFilter = contractInstance.filters.ArtSaved();
      const artSavedEvents = await contractInstance.queryFilter(
        artSavedFilter,
        fromBlock,
        currentBlock
      );
      
      // Get current block timestamp for better time estimation
      const currentBlockData = await contractInstance.runner?.provider?.getBlock(currentBlock);
      const currentTimestamp = currentBlockData?.timestamp || Math.floor(Date.now() / 1000);
      
      // Process and add events to the list
      const recentEvents: EventMessage[] = [];
      
      // Process CanvasMinted events
      for (const event of canvasMintedEvents) {
        if (event.args) {
          const [, to, qty] = event.args;
          const formattedAddress = formatAddress(to.toString());
          const quantity = Number(qty);
          const message = `${formattedAddress} minted ${quantity} canvas${quantity > 1 ? 'es' : ''}`;
          
          // Estimate timestamp based on block number difference
          const blockDifference = currentBlock - Number(event.blockNumber);
          const estimatedTimestamp = new Date((currentTimestamp - (blockDifference * 12)) * 1000); // ~12 seconds per block
          
          recentEvents.push({
            id: `historical-mint-${event.transactionHash}-${event.index}`,
            timestamp: estimatedTimestamp,
            type: 'mint',
            message,
            txHash: event.transactionHash
          });
        }
      }
      
      // Process ArtSaved events
      for (const event of artSavedEvents) {
        if (event.args) {
          const [tokenId, artist] = event.args;
          const formattedAddress = formatAddress(artist.toString());
          const message = `${formattedAddress} saved art to token #${tokenId.toString()}`;
          
          // Estimate timestamp based on block number difference
          const blockDifference = currentBlock - Number(event.blockNumber);
          const estimatedTimestamp = new Date((currentTimestamp - (blockDifference * 12)) * 1000); // ~12 seconds per block
          
          recentEvents.push({
            id: `historical-save-${event.transactionHash}-${event.index}`,
            timestamp: estimatedTimestamp,
            type: 'save',
            message,
            txHash: event.transactionHash
          });
        }
      }
      
      // Sort by timestamp (newest first) and limit to 10 events
      recentEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setEventMessages(recentEvents.slice(0, 10));
      
      console.log(`📜 Loaded ${recentEvents.length} recent events`);
    } catch (error) {
      console.error('Failed to load recent events:', error);
    }
  };

  // Setup smart contract event listeners with error handling
  const setupContractEventListeners = (contractInstance: ColourMeNFT) => {
    console.log('🔔 Setting up contract event listeners...');

    // Clean up existing listeners
    if (eventListenersRef.current) {
      eventListenersRef.current();
    }

    // Load recent events first
    loadRecentEvents(contractInstance);

    // CanvasMinted event listener
    const canvasMintedListener = (tokenId: bigint, to: string, qty: bigint, event: any) => {
      console.log('🎨 CanvasMinted event received:', { tokenId: tokenId.toString(), to, qty: qty.toString() });
      
      const formattedAddress = formatAddress(to);
      const quantity = Number(qty);
      const message = `${formattedAddress} just minted ${quantity} canvas${quantity > 1 ? 'es' : ''}`;
      
      addEventMessage({
        timestamp: new Date(),
        type: 'mint',
        message,
        txHash: event.transactionHash
      });
    };

    // ArtSaved event listener
    const artSavedListener = (tokenId: bigint, artist: string, event: any) => {
      console.log('💾 ArtSaved event received:', { tokenId: tokenId.toString(), artist });
      
      const formattedAddress = formatAddress(artist);
      const message = `${formattedAddress} just saved art to token #${tokenId.toString()}`;
      
      addEventMessage({
        timestamp: new Date(),
        type: 'save',
        message,
        txHash: event.transactionHash
      });
    };

    // Set up event listeners with error handling and retry logic
    const setupListeners = () => {
      try {
        // Create filters with error handling
        const canvasMintedFilter = contractInstance.filters.CanvasMinted();
        const artSavedFilter = contractInstance.filters.ArtSaved();
        
        // Set up listeners with filters
        contractInstance.on(canvasMintedFilter, canvasMintedListener);
        contractInstance.on(artSavedFilter, artSavedListener);
        
        console.log('✅ Event listeners set up successfully');
      } catch (error) {
        console.error('❌ Failed to set up event listeners:', error);
        
        // Retry after a short delay
        setTimeout(() => {
          console.log('🔄 Retrying event listener setup...');
          setupListeners();
        }, 5000);
      }
    };

    // Initial setup
    setupListeners();

    // Store cleanup function
    eventListenersRef.current = () => {
      console.log('🧹 Cleaning up contract event listeners...');
      try {
        const canvasMintedFilter = contractInstance.filters.CanvasMinted();
        const artSavedFilter = contractInstance.filters.ArtSaved();
        
        contractInstance.off(canvasMintedFilter, canvasMintedListener);
        contractInstance.off(artSavedFilter, artSavedListener);
      } catch (error) {
        console.warn('⚠️ Error during event listener cleanup:', error);
      }
    };
  };

  const isOnCorrectNetwork = (chainId: string = currentChainId) => {
    return chainId.toLowerCase() === dappConfig.network.chainId.toLowerCase();
  };

  // Setup contract event listeners when contract is available
  useEffect(() => {
    if (contract) {
      setupContractEventListeners(contract);
      
      // Fallback: Poll for events every 30 seconds if real-time listeners fail
      const pollInterval = setInterval(async () => {
        try {
          await loadRecentEvents(contract);
        } catch (error) {
          console.warn('⚠️ Event polling failed:', error);
        }
      }, 30000);

      // Cleanup on unmount or contract change
      return () => {
        if (eventListenersRef.current) {
          eventListenersRef.current();
        }
        clearInterval(pollInterval);
      };
    }
  }, [contract]);

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
          onAccountChange?.('');
          showMessage('Wallet disconnected', true);
        } else if (accounts[0] !== account) {
          const newAccount = accounts[0];
          setAccount(newAccount);
          onAccountChange?.(newAccount);
          showMessage(`Switched to ${formatAddress(newAccount)}`);
          setTimeout(() => handleConnectWallet(), 100);
        }
      }
    );

    return cleanup || undefined;
  }, []);

  // Check for minting status changes every second to update UI immediately
  useEffect(() => {
    if (!contractData) return;

    const checkMintingStatus = () => {
      const now = new Date();
      const wasActive = contractData.isMintActive;
      const isNowActive = now >= contractData.mintOpen && now <= contractData.mintEnd && contractData.tokenCount < contractData.maxSupply;
      
      // If minting just became active, refresh contract data
      if (!wasActive && isNowActive) {
        console.log('Minting just opened! Refreshing contract data...');
        onContractDataUpdate?.();
      }
    };

    // Check immediately
    checkMintingStatus();

    // Check every second
    const interval = setInterval(checkMintingStatus, 1000);

    return () => clearInterval(interval);
  }, [contractData, onContractDataUpdate]);

  const handleConnectWallet = async () => {
    setIsLoading(true);
    try {
      const { signer, contract: walletContract, account: walletAccount, result } = await connectToWallet();
      
      if (result.success && walletAccount && signer) {
        setAccount(walletAccount);
        onAccountChange?.(walletAccount);
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
        
        // Note: Event message will be automatically added by the CanvasMinted event listener
        
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

    // Check if minting is closed (sold out or past end time)
    if (contractData) {
      const now = new Date();
      const isSoldOut = contractData.tokenCount >= contractData.maxSupply;
      const isPastEnd = now > contractData.mintEnd;
      
      if (isSoldOut || isPastEnd) {
        return {
          text: 'Minting Closed',
          action: () => {},
          disabled: true,
          className: 'sold-out'
        };
      }
    }

    // Check if minting is active (between open and end times)
    if (contractData && contractData.isMintActive) {
      return {
        text: 'Mint',
        action: handleMint,
        disabled: false,
        className: 'mint'
      };
    }

    // If minting is not active yet, show waiting state
    if (contractData && !contractData.isMintActive) {
      return {
        text: 'Minting Not Open',
        action: () => {},
        disabled: true,
        className: 'not-open'
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
      return 'Minting Closed';
    } else if (now > mintEnd) {
      return 'Minting Closed';
    } else if (isActive) {
      return <CountdownTimer targetDate={mintEnd} prefix="Open For:" />;
    } else if (now < mintOpen) {
      return <CountdownTimer targetDate={mintOpen} prefix="Open In:" />;
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
            <h2>🎨 Colour Me NFT</h2>
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
                  {event.txHash && (
                    <div className="event-tx-hash">
                      <a 
                        href={`${dappConfig.network.explorerUrl}/tx/${event.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tx-link"
                      >
                        {event.txHash.slice(0, 10)}...{event.txHash.slice(-8)}
                      </a>
                    </div>
                  )}
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
