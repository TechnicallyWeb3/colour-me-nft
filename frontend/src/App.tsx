import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import Home from './components/Home'
import UnifiedActionButton from './components/UnifiedActionButton'
import SVGDisplay from './components/SVGDisplay'
import BlockchainControls from './components/BlockchainControls'
import DebugPage from './components/DebugPage'
import { 
  connectToProvider,
  getOwnerOf,
  getTokenSVG,
  estimateTransactionGas,
  calculateOptimalChunkSize,
  estimatePackedSavings,
  type ContractObject
} from './utils/blockchain'
import type { ColourMeNFT } from './typechain-types/contracts/ColourMeNFT.sol/ColourMeNFT'
import './App.css'

function HomePage() {
  const [readOnlyContract, setReadOnlyContract] = useState<ColourMeNFT | null>(null);
  const [account, setAccount] = useState<string>('');
  const [tokenId, setTokenId] = useState<number | null>(null);
  const [tokenOwner, setTokenOwner] = useState<string>('');
  const [isOwner, setIsOwner] = useState(false);
  const [svgKey, setSvgKey] = useState(0); // For forcing SVG reload
  const [tokenSvgPreview, setTokenSvgPreview] = useState<string>('');
  const [saveRequestData, setSaveRequestData] = useState<{
    artData: any[];
    saveType: 'set' | 'append';
  } | null>(null);
  const [currentObjects, setCurrentObjects] = useState<ContractObject[]>([]);
  const [transactionEstimate, setTransactionEstimate] = useState<{
    objectCount: number;
    estimatedGas: number;
    willUseQueue: boolean;
    estimatedChunks: number;
    packingSavings?: number;
    packingSavingsPercent?: number;
  }>({ objectCount: 0, estimatedGas: 0, willUseQueue: false, estimatedChunks: 0 });

  // Extract token ID from URL hash
  const getTokenIdFromHash = (): number | null => {
    const hash = window.location.hash.slice(1);
    const num = parseInt(hash, 10);
    return !isNaN(num) && num > 0 ? num : null;
  };

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      // Connect to provider
      const { contract, result } = await connectToProvider();
      if (result.success) {
        setReadOnlyContract(contract);
      }

      // Get token ID from hash
      const hashTokenId = getTokenIdFromHash();
      setTokenId(hashTokenId);
    };

    initializeApp();
  }, []);

  // Check token ownership and load preview when account or tokenId changes
  useEffect(() => {
    const checkOwnershipAndLoadPreview = async () => {
      if (readOnlyContract && tokenId) {
        const { owner, result } = await getOwnerOf(readOnlyContract, tokenId);
        if (result.success) {
          setTokenOwner(owner);
          setIsOwner(Boolean(account && owner.toLowerCase() === account.toLowerCase()));
          
          // Load SVG preview for sidebar
          const { svg: svgContent, result: svgResult } = await getTokenSVG(readOnlyContract, tokenId);
          if (svgResult.success) {
            // Convert SVG string to data URL for img tag
            const blob = new Blob([svgContent], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            setTokenSvgPreview(url);
          }
        } else {
          setTokenOwner('');
          setIsOwner(false);
          setTokenSvgPreview('');
        }
      } else {
        setTokenOwner('');
        setIsOwner(false);
        setTokenSvgPreview('');
      }
    };

    checkOwnershipAndLoadPreview();
  }, [readOnlyContract, tokenId, account]);

  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const newTokenId = getTokenIdFromHash();
      setTokenId(newTokenId);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Handle successful mint
  const handleMintSuccess = (newTokenId: number) => {
    // Navigate to the new token
    window.location.hash = `#${newTokenId}`;
    setTokenId(newTokenId);
    setSvgKey(prev => prev + 1); // Force SVG reload
  };

  // Handle account changes from UnifiedActionButton
  const handleAccountChange = (newAccount: string) => {
    setAccount(newAccount);
  };

  // Handle successful save
  const handleSaveSuccess = () => {
    setSvgKey(prev => prev + 1); // Force SVG reload
    setSaveRequestData(null); // Clear pending request
    
    // Reload preview image
    if (readOnlyContract && tokenId) {
      const updatePreview = async () => {
        const { svg: svgContent, result: svgResult } = await getTokenSVG(readOnlyContract, tokenId);
        if (svgResult.success) {
          // Clean up old URL
          if (tokenSvgPreview) {
            URL.revokeObjectURL(tokenSvgPreview);
          }
          // Create new preview URL
          const blob = new Blob([svgContent], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          setTokenSvgPreview(url);
        }
      };
      updatePreview();
    }
  };

  // Update transaction estimates based on current objects
  const updateTransactionEstimate = (objects: ContractObject[]) => {
    if (objects.length === 0) {
      setTransactionEstimate({
        objectCount: 0,
        estimatedGas: 0,
        willUseQueue: false,
        estimatedChunks: 0
      });
      return;
    }

    const estimatedGas = estimateTransactionGas(objects);
    const gasLimit = 800000; // Increased due to packed encoding efficiency
    const willUseQueue = estimatedGas > gasLimit;
    
    let estimatedChunks = 1;
    if (willUseQueue) {
      const { estimatedChunks: chunks } = calculateOptimalChunkSize(objects, gasLimit);
      estimatedChunks = chunks;
    }

    // Calculate packed encoding savings
    const savings = estimatePackedSavings(objects);

    setTransactionEstimate({
      objectCount: objects.length,
      estimatedGas,
      willUseQueue,
      estimatedChunks,
      packingSavings: savings.gasSavings,
      packingSavingsPercent: savings.savingsPercent
    });
  };

  // Handle save request from SVG
  const handleSaveRequest = (data: { artData: any[] | string, saveType: 'set' | 'append' }) => {
    console.log('🔍 [App.tsx] handleSaveRequest called with:', data);
    
    // Parse artData if it's a JSON string
    let parsedArtData: any[] = [];
    
    if (typeof data.artData === 'string') {
      try {
        parsedArtData = JSON.parse(data.artData);
        console.log('✅ [App.tsx] Parsed JSON artData:', parsedArtData.length, 'objects');
      } catch (error) {
        console.error('❌ [App.tsx] Failed to parse artData JSON:', error);
        parsedArtData = [];
      }
    } else if (Array.isArray(data.artData)) {
      parsedArtData = data.artData;
      console.log('✅ [App.tsx] Using array artData:', parsedArtData.length, 'objects');
    } else {
      console.warn('⚠️ [App.tsx] artData is neither string nor array:', data.artData);
      parsedArtData = [];
    }
    
    const saveRequest = {
      artData: parsedArtData,
      saveType: data.saveType
    };
    
    console.log('📝 [App.tsx] Setting saveRequestData:', saveRequest);
    setSaveRequestData(saveRequest);
  };

  // Handle messages from SVG
  useEffect(() => {

    
    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data;
      
      if (type === 'SAVE_REQUEST') {
        console.log('🎨 [App.tsx] SAVE_REQUEST received:', { type, data });
        handleSaveRequest(data);
      } else if (type === 'OBJECT_ADDED') {
        // Update current objects when new object is added
        const { artData } = data;
        if (artData && artData.diff) {
          try {
            const diffObjects = typeof artData.diff === 'string' 
              ? JSON.parse(artData.diff) 
              : artData.diff;
            
            if (Array.isArray(diffObjects) && diffObjects.length > 0) {
              // For append operations, add to current objects
              if (artData.saveType === 'append') {
                setCurrentObjects(prev => {
                  const newObjects = [...prev, ...diffObjects];
                  updateTransactionEstimate(newObjects);
                  return newObjects;
                });
              } else {
                // For set operations, replace current objects
                setCurrentObjects(diffObjects);
                updateTransactionEstimate(diffObjects);
              }
            }
          } catch (error) {
            console.error('Failed to parse OBJECT_ADDED data:', error);
          }
        }
      } else if (type === 'CLEAR_REQUEST') {
        // Reset objects when canvas is cleared
        setCurrentObjects([]);
        updateTransactionEstimate([]);
      } else if (type === 'LOAD_DATA') {
        // Update objects when data is loaded
        const { artData } = data;
        if (Array.isArray(artData)) {
          setCurrentObjects(artData);
          updateTransactionEstimate(artData);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []); // Empty dependency - currentObjects is used in callback

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (tokenSvgPreview) {
        URL.revokeObjectURL(tokenSvgPreview);
      }
    };
  }, [tokenSvgPreview]);

  return (
    <div className="App">
      <header className="App-header" style={{ padding: '20px 0', background: '#282c34', color: 'white' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 20px'
        }}>
          <div>
            <h1 style={{ margin: 0 }}>🎨 Paint dApp</h1>
            <p style={{ margin: '5px 0', opacity: 0.8 }}>
              Create collaborative on-chain art!
            </p>
          </div>
          
          <nav style={{ display: 'flex', gap: '10px' }}>
            <Link 
              to="/debug" 
              style={{ 
                color: '#61dafb', 
                textDecoration: 'none',
                padding: '8px 16px',
                border: '1px solid #61dafb',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              🐛 Debug
            </Link>
            
            <button
              onClick={() => {
                window.location.hash = '';
                setTokenId(null);
                setSvgKey(prev => prev + 1);
                setSaveRequestData(null);
                setCurrentObjects([]);
                updateTransactionEstimate([]);
              }}
              style={{ 
                color: '#61dafb', 
                background: 'none',
                border: '1px solid #61dafb',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🏠 New Canvas
            </button>
          </nav>
        </div>
      </header>

      <main style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '20px',
        display: 'grid',
        gridTemplateColumns: 'minmax(300px, 400px) 1fr',
        gap: '20px',
        alignItems: 'start',
        minHeight: 'calc(100vh - 140px)'
      }}>
        {/* Left Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Unified Action Button */}
          <div style={{
            padding: '20px',
            border: '2px solid #ddd',
            borderRadius: '12px',
            backgroundColor: '#f9f9f9'
          }}>
            <h2 style={{ 
              margin: '0 0 20px 0', 
              textAlign: 'center',
              color: '#333'
            }}>
              🎨 Paint NFT dApp
            </h2>
            <UnifiedActionButton 
              onMintSuccess={handleMintSuccess}
              onAccountChange={handleAccountChange}
            />
          </div>
          
          {/* Token Info */}
          {tokenId && (
            <div style={{
              padding: '15px',
              border: '2px solid #2196F3',
              borderRadius: '8px',
              backgroundColor: '#f3f9ff'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '10px'
              }}>
                <h3 style={{ margin: '0', color: '#1976d2' }}>
                  🖼️ Viewing Token #{tokenId}
                </h3>
                
                <button
                  onClick={handleSaveSuccess} // This triggers SVG reload
                  style={{
                    padding: '6px 8px',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                  title="Reload Token SVG"
                >
                  🔄
                </button>
              </div>
              
              {/* Token Preview */}
              {tokenSvgPreview && (
                <div style={{ 
                  marginBottom: '15px',
                  textAlign: 'center'
                }}>
                  <img 
                    src={tokenSvgPreview}
                    alt={`Token #${tokenId} Preview`}
                    style={{
                      width: '120px',
                      height: '120px',
                      border: '2px solid #ddd',
                      borderRadius: '8px',
                      backgroundColor: 'white',
                      objectFit: 'contain'
                    }}
                  />
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#666',
                    marginTop: '5px'
                  }}>
                    Token Preview
                  </div>
                </div>
              )}
              
              {tokenOwner && (
                <div style={{ fontSize: '14px', marginBottom: '10px' }}>
                  <strong>Owner:</strong> {tokenOwner.slice(0, 6)}...{tokenOwner.slice(-4)}
                  {isOwner && (
                    <span style={{ 
                      marginLeft: '8px',
                      padding: '2px 6px',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      YOU
                    </span>
                  )}
                </div>
              )}
              
              {account && (
                <div style={{ fontSize: '14px', marginBottom: '10px' }}>
                  <strong>Your Account:</strong> {account.slice(0, 6)}...{account.slice(-4)}
                </div>
              )}
              
              {!account && (
                <div style={{ 
                  fontSize: '14px', 
                  color: '#ff9800',
                  fontStyle: 'italic'
                }}>
                  Connect wallet to interact with tokens
                </div>
              )}
            </div>
          )}

          {/* Current Status */}
          {!tokenId && (
            <div style={{
              padding: '15px',
              border: '2px solid #4CAF50',
              borderRadius: '8px',
              backgroundColor: '#f1f8e9'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#2e7d32' }}>
                🎨 Create Mode
              </h3>
              <p style={{ margin: 0, fontSize: '14px', color: '#555' }}>
                You're using the local canvas. Paint something amazing, then mint it as an NFT!
              </p>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Transaction Estimation Panel */}
          {transactionEstimate.objectCount > 0 && (
            <div style={{
              background: 'white',
              padding: '15px',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              border: `2px solid ${transactionEstimate.willUseQueue ? '#FF9800' : '#4CAF50'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '20px' }}>
                  {transactionEstimate.willUseQueue ? '⚠️' : '✅'}
                </span>
                <h3 style={{ margin: 0, color: transactionEstimate.willUseQueue ? '#F57C00' : '#2E7D32' }}>
                  Transaction Estimate
                </h3>
              </div>
              
              <div style={{ display: 'flex', gap: '20px', fontSize: '14px', flexWrap: 'wrap' }}>
                <div>
                  <strong>Objects:</strong> {transactionEstimate.objectCount}
                </div>
                <div>
                  <strong>Points:</strong> {currentObjects.reduce((sum, obj) => sum + obj.points.length, 0)}
                </div>
                <div>
                  <strong>Estimated Gas:</strong> {transactionEstimate.estimatedGas.toLocaleString()}
                </div>
                <div>
                  <strong>Transactions:</strong> {transactionEstimate.estimatedChunks}
                  {transactionEstimate.willUseQueue && (
                    <span style={{ color: '#F57C00', marginLeft: '8px' }}>
                      (Will use queue)
                    </span>
                  )}
                </div>
                <div style={{ 
                  color: '#4CAF50', 
                  fontSize: '12px', 
                  fontWeight: 'bold',
                  backgroundColor: '#E8F5E8',
                  padding: '4px 8px',
                  borderRadius: '4px'
                }}>
                  📦 Packed Encoding
                  {transactionEstimate.packingSavings && transactionEstimate.packingSavings > 0 && (
                    <span style={{ marginLeft: '8px', color: '#2E7D32' }}>
                      (-{transactionEstimate.packingSavings.toLocaleString()} gas, 
                      -{transactionEstimate.packingSavingsPercent?.toFixed(1)}%)
                    </span>
                  )}
                </div>
              </div>
              
              {/* Additional packed encoding info */}
              {transactionEstimate.objectCount > 0 && (
                <div style={{ 
                  marginTop: '8px', 
                  padding: '8px', 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '4px',
                  fontSize: '12px'
                }}>
                  <strong>🚀 Packed Encoding Benefits:</strong>
                  <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                    <li>Up to 20x more objects per transaction</li>
                    <li>60-80% reduction in gas costs</li>
                    <li>Optimized for complex artwork with many points</li>
                  </ul>
                  <div style={{ marginTop: '4px', color: '#666' }}>
                    Objects with ≤6 points are most gas-efficient. Current capacity allows ~1000+ objects vs ~50 with old format.
                  </div>
                </div>
              )}
              
              {transactionEstimate.willUseQueue && (
                <div style={{ 
                  marginTop: '8px', 
                  padding: '8px', 
                  backgroundColor: '#FFF3E0',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: '#E65100'
                }}>
                  ⚠️ Your artwork has many objects and will require multiple transactions to save on-chain.
                </div>
              )}
            </div>
          )}

          {/* SVG Display */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center',
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <SVGDisplay
              key={svgKey}
              tokenId={tokenId || undefined}
              account={account}
              onSaveRequest={handleSaveRequest}
              width={800}
              height={800}
            />
          </div>

          {/* Blockchain Controls - Only show for token owners */}
          {tokenId && account && isOwner && (
            <BlockchainControls
              tokenId={tokenId}
              account={account}
              isOwner={isOwner}
              onSaveSuccess={handleSaveSuccess}
              saveRequestData={saveRequestData}
            />
          )}
        </div>
      </main>
    </div>
  )
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/app" element={<HomePage />} />
        <Route path="/debug" element={<DebugPage />} />
      </Routes>
    </Router>
  )
}

export default App