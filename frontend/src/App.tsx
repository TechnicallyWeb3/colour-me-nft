import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import MintingPanel from './components/MintingPanel'
import SVGDisplay from './components/SVGDisplay'
import BlockchainControls from './components/BlockchainControls'
import DebugPage from './components/DebugPage'
import { 
  connectToProvider,
  getOwnerOf,
  getTokenSVG
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

      // Get current account if connected
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setAccount(accounts[0]);
          }
        } catch (error) {
          console.log('No wallet connected');
        }
      }

      // Get token ID from hash
      const hashTokenId = getTokenIdFromHash();
      setTokenId(hashTokenId);
    };

    initializeApp();

    // Listen for account changes
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        setAccount(accounts.length > 0 ? accounts[0] : '');
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      return () => window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    }
  }, []);

  // Check token ownership and load preview when account or tokenId changes
  useEffect(() => {
    const checkOwnershipAndLoadPreview = async () => {
      if (readOnlyContract && tokenId) {
        const { owner, result } = await getOwnerOf(readOnlyContract, tokenId);
        if (result.success) {
          setTokenOwner(owner);
          setIsOwner(account && owner.toLowerCase() === account.toLowerCase());
          
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

  // Handle save request from SVG
  const handleSaveRequest = (data: { artData: any[], saveType: 'set' | 'append' }) => {
    setSaveRequestData(data);
  };

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
          {/* Minting Panel */}
          <MintingPanel onMintSuccess={handleMintSuccess} />
          
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
        <Route path="/" element={<HomePage />} />
        <Route path="/debug" element={<DebugPage />} />
      </Routes>
    </Router>
  )
}

export default App