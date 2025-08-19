import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import type { ColourMeNFT } from '../typechain-types/contracts/ColourMeNFT.sol/ColourMeNFT';
import ColourMe from './ColourMe';
import {
  dappConfig,
  getCurrentNetwork,
  addNetwork,
  switchNetwork,
  connectToProvider,
  connectToWallet,
  mintToken,
  setArt,
  appendArt,
  getTokenURI,
  getTokenSVG,
  getTokenCount,
  setupNetworkListeners
} from '../utils/blockchain';

interface LogEntry {
  id: string;
  timestamp: number;
  section: 'svg' | 'localStorage' | 'blockchain';
  category: string;
  message: string;
  data?: any;
  expanded?: boolean;
}

interface StorageData {
  timestamp: number;
  data: any[];
  size: number;
}



const DebugPage: React.FC = () => {
  // Logs for each section
  const [svgLogs, setSvgLogs] = useState<LogEntry[]>([]);
  const [storageData, setStorageData] = useState<LogEntry[]>([]);
  const [blockchainLogs, setBlockchainLogs] = useState<LogEntry[]>([]);
  
  // Monitoring state
  const [isMonitoring, setIsMonitoring] = useState(true);
  
  // Storage state
  const [colourMeArtData, setColourMeArtData] = useState<StorageData | null>(null);
  const [tokenArtData, setTokenArtData] = useState<StorageData | null>(null);
  
  // Storage refs for change detection
  const lastTokenRef = useRef<string>('');
  
  // Contract state
  const [provider, setProvider] = useState<ethers.JsonRpcProvider | null>(null);
  const [, setSigner] = useState<ethers.Signer | null>(null);
  const [readOnlyContract, setReadOnlyContract] = useState<ColourMeNFT | null>(null);
  const [writeContract, setWriteContract] = useState<ColourMeNFT | null>(null);
  const [account, setAccount] = useState<string>('');
  const [tokenCount, setTokenCount] = useState<number>(0);
  
  // UI state
  const [selectedTokenId, setSelectedTokenId] = useState<number>(1);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isNetworkManaging, setIsNetworkManaging] = useState(false);
  const [currentChainId, setCurrentChainId] = useState<string>('');
  const [tokenURI, setTokenURI] = useState<string>('');
  const [tokenSVG, setTokenSVG] = useState<string>('');

  // Add log entries for each section
  const addSvgLog = (category: string, message: string, data?: any) => {
    const logEntry: LogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      section: 'svg',
      category,
      message,
      data,
      expanded: false
    };
    setSvgLogs(prev => [logEntry, ...prev.slice(0, 49)]);
  };

  const addStorageLog = (category: string, message: string, data?: any) => {
    const logEntry: LogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      section: 'localStorage',
      category,
      message,
      data,
      expanded: false
    };
    setStorageData(prev => [logEntry, ...prev.slice(0, 49)]);
  };

  const addBlockchainLog = (category: string, message: string, data?: any) => {
    const logEntry: LogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      section: 'blockchain',
      category,
      message,
      data,
      expanded: false
    };
    setBlockchainLogs(prev => [logEntry, ...prev.slice(0, 49)]);
  };

  // Toggle log expansion
  const toggleLogExpansion = (section: 'svg' | 'localStorage' | 'blockchain', logId: string) => {
    const setLogs = section === 'svg' ? setSvgLogs : 
                   section === 'localStorage' ? setStorageData : setBlockchainLogs;
    
    setLogs(prev => prev.map(log => 
      log.id === logId ? { ...log, expanded: !log.expanded } : log
    ));
  };

  // Clear logs for specific section
  const clearSectionLogs = (section: 'svg' | 'localStorage' | 'blockchain') => {
    if (section === 'svg') setSvgLogs([]);
    else if (section === 'localStorage') setStorageData([]);
    else setBlockchainLogs([]);
  };

  // Monitor localStorage changes
  useEffect(() => {
    if (!isMonitoring) return;

    const checkLocalStorage = () => {
      try {
        // Check all colourMeArt.* keys
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('colourMeArt.')) {
            const value = localStorage.getItem(key);
            const lastKey = `${key}_last`;
            
            if (value && value !== (window as any)[lastKey]) {
              (window as any)[lastKey] = value;
              try {
                const parsed = JSON.parse(value);
                const tokenId = key.split('.')[1];
                const storageData: StorageData = {
                  timestamp: Date.now(),
                  data: parsed,
                  size: new Blob([value]).size
                };
                
                addStorageLog(key, `Token ${tokenId} art updated`, {
                  elementCount: parsed.length,
                  size: storageData.size,
                  data: parsed
                });
                
                // Update state for display (use token 1 for test display)
                if (tokenId === '1') {
                  setColourMeArtData(storageData);
                }
              } catch (error) {
                addStorageLog('error', `Error parsing ${key}: ${error}`);
              }
            }
          }
        }

        // Check tokenArt
        const tokenArt = localStorage.getItem('tokenArt');
        if (tokenArt && tokenArt !== lastTokenRef.current) {
          lastTokenRef.current = tokenArt;
          const parsed = JSON.parse(tokenArt);
          const storageData: StorageData = {
            timestamp: Date.now(),
            data: parsed,
            size: new Blob([tokenArt]).size
          };
          setTokenArtData(storageData);
          addStorageLog('tokenArt', 'Token art updated', {
            elementCount: parsed.length,
            size: storageData.size,
            data: parsed
          });
        }
      } catch (error) {
        addStorageLog('error', `Error reading localStorage: ${error}`);
      }
    };

    // Initial check
    checkLocalStorage();

    // Set up polling for localStorage changes
    const interval = setInterval(checkLocalStorage, 1000);

    // Listen for storage events from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'colourMeArt' || e.key === 'tokenArt') {
        addStorageLog(e.key, `Storage event detected: ${e.newValue ? 'updated' : 'removed'}`);
        checkLocalStorage();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isMonitoring]);

  // Listen for SVG messages only
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data;
      
      // Only handle SVG-specific messages
      if (
        type === 'SAVE_REQUEST' || 
        type === 'LOAD_DATA' || 
        type === 'CLEAR_REQUEST' || 
        type === 'OBJECT_ADDED'
      ) {
        
        if (type === 'SAVE_REQUEST') {
          const { saveType, artData } = data;
          const artDataParsed = typeof artData === 'string' ? JSON.parse(artData || '[]') : artData;
          const elementCount = Array.isArray(artDataParsed) ? artDataParsed.length : 0;
          
          addSvgLog(
            `SAVE_${saveType.toUpperCase()}`, 
            `Save request: ${saveType} (${elementCount} elements)`, 
            {
              saveType,
              elementCount,
              artData: artDataParsed,
              rawData: artData
            }
          );
          
          // // Send response back to SVG
          // if (event.source && event.source !== window) {
          //   (event.source as Window).postMessage({
          //     type: 'SAVE_RESPONSE',
          //     success: true,
          //     message: 'Debug page processed save request'
          //   }, '*');
          // }
        } else if (type === 'LOAD_DATA') {
          const { loadType, artData } = data;
          const elementCount = Array.isArray(artData) ? artData.length : 0;
          
          addSvgLog(
            `LOAD_${loadType.toUpperCase()}`, 
            `Load data: ${loadType} (${elementCount} elements)`, 
            {
              loadType,
              elementCount,
              artData
            }
          );
        } else if (type === 'OBJECT_ADDED') {
          const { objectType, artData } = data;
          const { saveType, diff } = artData;
          const diffParsed = typeof diff === 'string' ? JSON.parse(diff || '[]') : diff;
          const elementCount = Array.isArray(diffParsed) ? diffParsed.length : 0;
          
          addSvgLog(
            `ADDED_${objectType.toUpperCase().replace('-', '_')}`, 
            `Object added: ${objectType} (${saveType}, ${elementCount} elements)`, 
            {
              objectType,
              saveType,
              elementCount,
              diff: diffParsed,
              rawDiff: diff
            }
          );
        } else if (type === 'CLEAR_REQUEST') {
          addSvgLog('CLEAR', 'Canvas cleared');
        }
      }
      // Handle MetaMask and other blockchain messages
      else if (event.data.method || event.data.id || event.data.jsonrpc) {
        addBlockchainLog('wallet', 'Wallet message received', event.data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Get current network info
  const updateCurrentNetwork = async () => {
    const chainId = await getCurrentNetwork();
    if (chainId) {
      setCurrentChainId(chainId.toLowerCase());
      addBlockchainLog('network', `Current network: ${chainId}`, { chainId });
    }
  };

  // Add network to MetaMask
  const handleAddNetwork = async () => {
    setIsNetworkManaging(true);
    try {
      const result = await addNetwork();
      if (result.success) {
        addBlockchainLog('network', 'Network added successfully', result.data);
        await updateCurrentNetwork();
      } else {
        addBlockchainLog('error', result.error || 'Failed to add network');
      }
    } finally {
      setIsNetworkManaging(false);
    }
  };

  // Switch to dApp network
  const handleSwitchNetwork = async () => {
    setIsNetworkManaging(true);
    try {
      const result = await switchNetwork();
      if (result.success) {
        addBlockchainLog('network', 'Network switched successfully', result.data);
        await updateCurrentNetwork();
      } else {
        addBlockchainLog('error', result.error || 'Failed to switch network');
      }
    } finally {
      setIsNetworkManaging(false);
    }
  };

  // Connect to provider (for read functions)
  const handleConnectToProvider = async () => {
    const { provider, contract, result } = await connectToProvider();
    
    if (result.success) {
      setProvider(provider);
      setReadOnlyContract(contract);
      if (contract) {
        const { count } = await getTokenCount(contract);
        setTokenCount(count);
      }
      addBlockchainLog('connect', 'Connected to provider (read-only)', result.data);
    } else {
      addBlockchainLog('error', result.error || 'Provider connection failed');
    }
  };

  // Connect to wallet (for write functions)
  const handleConnectToWallet = async () => {
    setIsConnecting(true);
    try {
      const { signer, contract, account, result } = await connectToWallet();
      
      if (result.success) {
        setSigner(signer);
        setWriteContract(contract);
        setAccount(account);
        addBlockchainLog('connect', `Connected to MetaMask: ${account}`, result.data);
      } else {
        addBlockchainLog('error', result.error || 'Wallet connection failed');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Initialize provider and get network info on component mount
  useEffect(() => {
    handleConnectToProvider();
    updateCurrentNetwork();

    // Setup network and account change listeners
    const cleanup = setupNetworkListeners(
      (chainId: string) => {
        setCurrentChainId(chainId.toLowerCase());
        addBlockchainLog('network', `Network changed to: ${chainId}`, { chainId });
        
        // Reconnect if needed
        if (isOnCorrectNetwork(chainId)) {
          handleConnectToProvider();
        }
      },
      (accounts: string[]) => {
        if (accounts.length === 0) {
          setAccount('');
          setWriteContract(null);
          addBlockchainLog('wallet', 'Wallet disconnected');
        } else {
          addBlockchainLog('wallet', `Account changed to: ${accounts[0]}`);
        }
      }
    );

    return cleanup || undefined;
  }, []);

  // Contract write methods (require wallet)
  const handleMintToken = async () => {
    if (!writeContract || !account) {
      addBlockchainLog('error', 'Wallet not connected');
      return;
    }

    addBlockchainLog('mint', 'Minting token...', { to: account });
    const result = await mintToken(writeContract, account);
    
    if (result.success) {
      addBlockchainLog('mint', 'Token minted successfully', result.data);
      // Update token count using read contract
      if (readOnlyContract) {
        const { count } = await getTokenCount(readOnlyContract);
        setTokenCount(count);
      }
    } else {
      addBlockchainLog('error', result.error || 'Mint failed');
    }
  };

  const handleSetArt = async () => {
    if (!writeContract || !colourMeArtData) {
      addBlockchainLog('error', 'Wallet not connected or no art data');
      return;
    }

    addBlockchainLog('setArt', `Setting art on token ${selectedTokenId}`, {
      tokenId: selectedTokenId,
      elementCount: colourMeArtData.data.length
    });

    const result = await setArt(writeContract, selectedTokenId, colourMeArtData.data);
    
    if (result.success) {
      addBlockchainLog('setArt', 'Art set successfully', result.data);
    } else {
      addBlockchainLog('error', result.error || 'Set art failed');
    }
  };

  const handleAppendArt = async () => {
    if (!writeContract || !colourMeArtData) {
      addBlockchainLog('error', 'Wallet not connected or no art data');
      return;
    }

    addBlockchainLog('appendArt', `Appending art to token ${selectedTokenId}`, {
      tokenId: selectedTokenId,
      elementCount: colourMeArtData.data.length
    });

    const result = await appendArt(writeContract, selectedTokenId, colourMeArtData.data);
    
    if (result.success) {
      addBlockchainLog('appendArt', 'Art appended successfully', result.data);
    } else {
      addBlockchainLog('error', result.error || 'Append art failed');
    }
  };

  // Contract read methods (only need provider)
  const handleGetTokenURI = async () => {
    if (!readOnlyContract) {
      addBlockchainLog('error', 'Provider not connected');
      return;
    }

    addBlockchainLog('tokenURI', `Getting token URI for token ${selectedTokenId}`);
    const { uri, result } = await getTokenURI(readOnlyContract, selectedTokenId);
    
    if (result.success) {
      setTokenURI(uri);
      addBlockchainLog('tokenURI', 'Token URI retrieved', result.data);
    } else {
      addBlockchainLog('error', result.error || 'Get token URI failed');
    }
  };

  const handleGetTokenSVG = async () => {
    if (!readOnlyContract) {
      addBlockchainLog('error', 'Provider not connected');
      return;
    }

    addBlockchainLog('tokenSVG', `Getting token SVG for token ${selectedTokenId}`);
    const { svg, result } = await getTokenSVG(readOnlyContract, selectedTokenId);
    
    if (result.success) {
      setTokenSVG(svg);
      addBlockchainLog('tokenSVG', 'Token SVG retrieved', result.data);
    } else {
      addBlockchainLog('error', result.error || 'Get token SVG failed');
    }
  };

  // Clear localStorage
  const clearLocalStorage = () => {
    // Clear all colourMeArt.* keys
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('colourMeArt.') || key === 'tokenArt')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    setColourMeArtData(null);
    setTokenArtData(null);
    addStorageLog('clear', `All localStorage cleared (${keysToRemove.length} keys: ${keysToRemove.join(', ')})`);
  };

  // Get log style based on section
  const getSectionColor = (section: 'svg' | 'localStorage' | 'blockchain') => {
    switch (section) {
      case 'svg': return '#4CAF50';
      case 'localStorage': return '#2196F3';
      case 'blockchain': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  // Get message type specific color for better visual distinction
  const getMessageTypeColor = (category: string) => {
    if (category.startsWith('SAVE_')) return '#9C27B0'; // Purple for save operations
    if (category.startsWith('LOAD_')) return '#2196F3'; // Blue for load operations
    if (category.startsWith('OBJECT_')) {
      // Tool objects
      if (category.includes('BRUSH') || category.includes('ERASER') || category.includes('BUCKET')) {
        return '#FF9800'; // Orange for tools
      }
      // Shape objects
      return '#FF5722'; // Deep orange for shapes
    }
    if (category === 'CLEAR') return '#F44336'; // Red for clear operations
    return '#4CAF50'; // Default green
  };

  // Get emoji icon for message type
  const getMessageTypeIcon = (category: string) => {
    if (category === 'SAVE_SET') return '💾'; // Save/Set operation
    if (category === 'SAVE_APPEND') return '➕'; // Append operation
    if (category === 'LOAD_TOKEN') return '🎨'; // Load from token
    if (category === 'LOAD_LOCAL') return '📂'; // Load from local storage
    if (category === 'CLEAR') return '💣'; // Clear operation
    
    // Tool objects
    if (category === 'OBJECT_BRUSH') return '🖌️'; // Brush tool
    if (category === 'OBJECT_ERASER') return '🧽'; // Eraser tool
    if (category === 'OBJECT_BUCKET') return '🪣'; // Bucket fill tool
    
    // Shape objects
    if (category === 'OBJECT_LINE') return '―'; // Line shape
    if (category === 'OBJECT_POLYLINE') return 'ϟ'; // Polyline shape
    if (category === 'OBJECT_POLYGON_3') return '△'; // Triangle
    if (category === 'OBJECT_POLYGON_5') return '⬠'; // Pentagon
    if (category === 'OBJECT_POLYGON_6') return '⬡'; // Hexagon
    if (category === 'OBJECT_RECT') return '▯'; // Rectangle
    if (category === 'OBJECT_ELLIPSE') return '⬭'; // Ellipse/Circle
    
    return '📝'; // Default
  };

  // Format data for display
  const formatData = (data: any, maxLength = 200) => {
    if (!data) return 'null';
    const str = JSON.stringify(data, null, 2);
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
  };

  // Render log section
  const renderLogSection = (
    title: string,
    icon: string,
    logs: LogEntry[],
    section: 'svg' | 'localStorage' | 'blockchain',
    controls?: React.ReactNode
  ) => (
    <div style={{ 
      border: `2px solid ${getSectionColor(section)}`,
      borderRadius: '8px',
      marginBottom: '20px'
    }}>
      <div style={{ 
        backgroundColor: getSectionColor(section),
        color: 'white',
        padding: '10px 15px',
        borderRadius: '6px 6px 0 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{ margin: 0 }}>{icon} {title} ({logs.length})</h3>
        <button 
          onClick={() => clearSectionLogs(section)}
          style={{ 
            padding: '4px 8px',
            backgroundColor: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Clear
        </button>
      </div>
      
      {controls && (
        <div style={{ padding: '15px', backgroundColor: '#f9f9f9', borderBottom: '1px solid #ddd' }}>
          {controls}
        </div>
      )}
      
      <div style={{ 
        height: '300px',
        overflow: 'auto',
        padding: '10px',
        backgroundColor: '#fafafa'
      }}>
        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#999', fontStyle: 'italic', padding: '20px' }}>
            No logs yet...
          </div>
        ) : (
          logs.map(log => (
            <div 
              key={log.id}
              style={{ 
                margin: '5px 0',
                padding: '8px',
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            >
              <div 
                onClick={() => toggleLogExpansion(section, log.id)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <span>{log.expanded ? '🔽' : '▶️'}</span>
                <span style={{ color: '#666', fontSize: '12px' }}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span style={{ 
                  fontWeight: 'bold', 
                  color: section === 'svg' ? getMessageTypeColor(log.category) : getSectionColor(section)
                }}>
                  {section === 'svg' && getMessageTypeIcon(log.category)} {log.category}
                </span>
                <span>{log.message}</span>
              </div>
              
              {log.expanded && log.data && (
                <div style={{ 
                  marginTop: '8px',
                  padding: '8px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px',
                  overflow: 'auto'
                }}>
                  <pre style={{ margin: 0, fontSize: '11px', whiteSpace: 'pre-wrap' }}>
                    {formatData(log.data)}
                  </pre>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );

  function isOnCorrectNetwork(chainA: string) {
    return chainA.toLowerCase() === dappConfig.network.chainId.toLowerCase();
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', fontSize: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, color: '#333' }}>🐛 Debug Panel</h1>
        <button 
          onClick={() => setIsMonitoring(!isMonitoring)}
          style={{ 
            padding: '8px 16px',
            backgroundColor: isMonitoring ? '#4CAF50' : '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {isMonitoring ? '⏹️ Stop Monitoring' : '▶️ Start Monitoring'}
        </button>
      </div>

      {/* SVG Section */}
      {renderLogSection('SVG Messages', '🎨', svgLogs, 'svg', (
        <div>
          <div style={{ marginBottom: '10px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#4CAF50' }}>Interactive Paint Canvas</h4>
            <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#666' }}>
              Paint below to generate SVG messages. Use Save/Clear buttons in the canvas to test message logging.
            </p>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '10px' }}>
              <strong>Message Types:</strong> 
              💾 SAVE_SET (new art), ➕ SAVE_APPEND (add to existing), 
              🎨 LOAD_TOKEN (from blockchain), 📂 LOAD_LOCAL (from storage), 
              💣 CLEAR (canvas cleared)
              <br />
              <strong>Objects:</strong> 
              🖌️ BRUSH, 🧽 ERASER, 🪣 BUCKET, ➖ LINE, 〰️ POLYLINE, 
              🔺 TRIANGLE, ⭐ PENTAGON, ⬡ HEXAGON, ⬜ RECT, ⭕ ELLIPSE
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px', backgroundColor: 'white', borderRadius: '4px' }}>
            <ColourMe width={600} />
          </div>
        </div>
      ))}

      {/* LocalStorage Section */}
      {renderLogSection('LocalStorage Events', '💾', storageData, 'localStorage', (
        <div>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
            <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '4px', flex: 1 }}>
              <h4 style={{ margin: '0 0 5px 0', color: '#2196F3' }}>colourMeArt</h4>
              {colourMeArtData ? (
                <div style={{ fontSize: '12px' }}>
                  <div>Elements: {colourMeArtData.data.length}</div>
                  <div>Size: {colourMeArtData.size} bytes</div>
                  <div>Updated: {new Date(colourMeArtData.timestamp).toLocaleTimeString()}</div>
                </div>
              ) : (
                <div style={{ color: '#999', fontStyle: 'italic' }}>No data</div>
              )}
            </div>
            
            <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '4px', flex: 1 }}>
              <h4 style={{ margin: '0 0 5px 0', color: '#4CAF50' }}>tokenArt</h4>
              {tokenArtData ? (
                <div style={{ fontSize: '12px' }}>
                  <div>Elements: {tokenArtData.data.length}</div>
                  <div>Size: {tokenArtData.size} bytes</div>
                  <div>Updated: {new Date(tokenArtData.timestamp).toLocaleTimeString()}</div>
                </div>
              ) : (
                <div style={{ color: '#999', fontStyle: 'italic' }}>No data</div>
              )}
            </div>
          </div>
          
          <button 
            onClick={clearLocalStorage}
            style={{ 
              padding: '6px 12px',
              backgroundColor: '#FF5722',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            💣 Clear Storage
          </button>
        </div>
      ))}

      {/* Blockchain Section */}
      {renderLogSection('Blockchain Interactions', '⛓️', blockchainLogs, 'blockchain', (
        <div>
          {/* Network Status */}
          <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: 'white', borderRadius: '4px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Network Status</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px' }}>
                <strong>Target:</strong> {dappConfig.network.chainName} ({dappConfig.network.chainId.toLowerCase()})
              </span>
              <span style={{ fontSize: '12px' }}>
                <strong>Current:</strong> {currentChainId || 'Unknown'}
                {isOnCorrectNetwork(currentChainId) ? ' ✅' : ' ❌'}
              </span>
            </div>
                         <div style={{ display: 'flex', gap: '8px' }}>
               <button 
                 onClick={handleAddNetwork}
                 disabled={isNetworkManaging || !account}
                 style={{ 
                   padding: '6px 12px',
                   backgroundColor: (isNetworkManaging || !account) ? '#ccc' : '#9C27B0',
                   color: 'white',
                   border: 'none',
                   borderRadius: '4px',
                   cursor: (isNetworkManaging || !account) ? 'not-allowed' : 'pointer',
                   fontSize: '12px'
                 }}
               >
                 {isNetworkManaging ? '⏳' : !account ? '🔒 Connect Wallet' : '➕'} Add Network
               </button>
               <button 
                 onClick={handleSwitchNetwork}
                 disabled={isNetworkManaging || !account || isOnCorrectNetwork(currentChainId)}
                 style={{ 
                   padding: '6px 12px',
                   backgroundColor: (isNetworkManaging || !account || isOnCorrectNetwork(currentChainId)) ? '#ccc' : '#FF9800',
                   color: 'white',
                   border: 'none',
                   borderRadius: '4px',
                   cursor: (isNetworkManaging || !account || isOnCorrectNetwork(currentChainId)) ? 'not-allowed' : 'pointer',
                   fontSize: '12px'
                 }}
               >
                 {isNetworkManaging ? '⏳' : !account ? '🔒 Connect Wallet' : '🔄'} Switch Network
               </button>
             </div>
          </div>

          {/* Connection */}
          <div style={{ marginBottom: '15px' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <button 
                onClick={handleConnectToProvider}
                disabled={!!provider}
                style={{ 
                  padding: '8px 16px',
                  backgroundColor: provider ? '#4CAF50' : '#607D8B',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: provider ? 'not-allowed' : 'pointer'
                }}
              >
                {provider ? '✅ Provider Connected' : '🔌 Connect Provider'}
              </button>
              
              <button 
                onClick={handleConnectToWallet}
                disabled={isConnecting || !!account}
                style={{ 
                  padding: '8px 16px',
                  backgroundColor: account ? '#4CAF50' : '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: (isConnecting || account) ? 'not-allowed' : 'pointer'
                }}
              >
                {isConnecting ? '⏳ Connecting...' : account ? `✅ ${account.slice(0, 6)}...${account.slice(-4)}` : '🔗 Connect Wallet'}
              </button>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
                Tokens: {tokenCount}
              </span>
              
              <input 
                type="number" 
                value={selectedTokenId}
                onChange={(e) => setSelectedTokenId(parseInt(e.target.value) || 1)}
                min="1"
                style={{ 
                  padding: '6px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  width: '80px'
                }}
                placeholder="Token ID"
              />
            </div>
          </div>
          
          {/* Write Methods */}
          <div style={{ marginBottom: '15px' }}>
            <h4 style={{ margin: '0 0 8px 0' }}>Write Methods (require wallet):</h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button 
                onClick={handleMintToken} 
                disabled={!writeContract}
                style={{ 
                  padding: '6px 12px', 
                  backgroundColor: writeContract ? '#4CAF50' : '#ccc', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: writeContract ? 'pointer' : 'not-allowed' 
                }}
              >
                🪙 Mint Token
              </button>
              <button 
                onClick={handleSetArt} 
                disabled={!writeContract || !colourMeArtData} 
                style={{ 
                  padding: '6px 12px', 
                  backgroundColor: (writeContract && colourMeArtData) ? '#FF9800' : '#ccc', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: (writeContract && colourMeArtData) ? 'pointer' : 'not-allowed' 
                }}
              >
                🎨 Set Art
              </button>
              <button 
                onClick={handleAppendArt} 
                disabled={!writeContract || !colourMeArtData} 
                style={{ 
                  padding: '6px 12px', 
                  backgroundColor: (writeContract && colourMeArtData) ? '#9C27B0' : '#ccc', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: (writeContract && colourMeArtData) ? 'pointer' : 'not-allowed' 
                }}
              >
                ➕ Append Art
              </button>
            </div>
          </div>
          
          {/* Read Methods */}
          <div style={{ marginBottom: '15px' }}>
            <h4 style={{ margin: '0 0 8px 0' }}>Read Methods (provider only):</h4>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <button 
                onClick={handleGetTokenURI} 
                disabled={!readOnlyContract}
                style={{ 
                  padding: '6px 12px', 
                  backgroundColor: readOnlyContract ? '#607D8B' : '#ccc', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: readOnlyContract ? 'pointer' : 'not-allowed' 
                }}
              >
                📄 Get Token URI
              </button>
              <button 
                onClick={handleGetTokenSVG} 
                disabled={!readOnlyContract}
                style={{ 
                  padding: '6px 12px', 
                  backgroundColor: readOnlyContract ? '#795548' : '#ccc', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: readOnlyContract ? 'pointer' : 'not-allowed' 
                }}
              >
                🖼️ Get Token SVG
              </button>
            </div>
          </div>
              
              {tokenURI && (
                <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '4px', marginBottom: '8px' }}>
                  <strong>Token URI:</strong> <a href={tokenURI} target="_blank" rel="noopener noreferrer" style={{ wordBreak: 'break-all' }}>{tokenURI}</a>
                </div>
              )}
              
              {tokenSVG && (
                <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
                  <strong>Token SVG:</strong> {tokenSVG.length} characters
                  <details style={{ marginTop: '5px' }}>
                    <summary style={{ cursor: 'pointer' }}>View SVG</summary>
                    <pre style={{ fontSize: '10px', overflow: 'auto', maxHeight: '100px', backgroundColor: '#f5f5f5', padding: '5px', marginTop: '5px' }}>
                      {tokenSVG}
                    </pre>
                  </details>
                </div>
              )}
        </div>
      ))}
    </div>
  );
};

export default DebugPage;