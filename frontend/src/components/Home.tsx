import React, { useState, useEffect } from 'react';
import './Home.css';
import SVGDisplay from './SVGDisplay';
import { 
  connectToProvider,
  getTokenSVG,
  getTokenCount
} from '../utils/blockchain';
import type { ColourMeNFT } from '../typechain-types/contracts/ColourMeNFT.sol/ColourMeNFT';

// Mock launch timestamp - in a real app this would come from the smart contract
const getMintTimestamp = (): number => {
  // Mock launch date: 30 days from now
  return Date.now() + (30 * 24 * 60 * 60 * 1000);
};

interface TokenExplorerProps {
  activeToken: number;
  onTokenSelect: (tokenId: number) => void;
  tokenCount: number;
  tokenPreviews: Map<number, string>;
}

interface ContextMenuProps {
  x: number;
  y: number;
  tokenId: number;
  onClose: () => void;
  onAction: (action: string, tokenId: number) => void;
}

interface AttributesPopupProps {
  tokenId: number;
  onClose: () => void;
}

const AttributesPopup: React.FC<AttributesPopupProps> = ({ tokenId, onClose }) => {
  // Mock attributes - in a real app these would come from the blockchain
  const attributes = [
    { label: 'Token ID', value: tokenId.toString() },
    { label: 'Type', value: tokenId === 0 ? 'Example' : 'Minted NFT' },
    { label: 'Created', value: tokenId === 0 ? 'N/A' : 'On Base Network' },
    { label: 'Objects', value: Math.floor(Math.random() * 50) + 10 },
    { label: 'Colors Used', value: Math.floor(Math.random() * 10) + 3 },
    { label: 'Rarity', value: ['Common', 'Rare', 'Epic', 'Legendary'][Math.floor(Math.random() * 4)] }
  ];

  return (
    <>
      <div className="popup-overlay" onClick={onClose} />
      <div className="attributes-popup os-window">
        <div className="os-titlebar">
          <div className="os-titlebar-text">
            <div className="os-titlebar-icon">📋</div>
            Token #{tokenId} Attributes
          </div>
          <div className="os-control-buttons">
            <div className="os-btn close" onClick={onClose}></div>
          </div>
        </div>
        <div className="os-content">
          {attributes.map((attr, index) => (
            <div key={index} className="attribute-row">
              <span className="attribute-label">{attr.label}:</span>
              <span className="attribute-value">{attr.value}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, tokenId, onClose, onAction }) => {
  useEffect(() => {
    const handleClickOutside = () => onClose();
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  return (
    <div className="context-menu" style={{ left: x, top: y }}>
      <div className="context-menu-item" onClick={() => onAction('open', tokenId)}>
        Open in app
      </div>
      <div className="context-menu-item" onClick={() => onAction('explorer', tokenId)}>
        View in explorer
      </div>
      <div className="context-menu-item" onClick={() => onAction('attributes', tokenId)}>
        Attributes
      </div>
    </div>
  );
};

const TokenExplorer: React.FC<TokenExplorerProps> = ({ activeToken, onTokenSelect, tokenCount, tokenPreviews }) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tokenId: number } | null>(null);
  const [showAttributes, setShowAttributes] = useState<number | null>(null);

  const handleRightClick = (e: React.MouseEvent, tokenId: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, tokenId });
  };

  const handleContextAction = (action: string, tokenId: number) => {
    setContextMenu(null);
    
    switch (action) {
      case 'open':
        onTokenSelect(tokenId);
        // Scroll to the app section
        document.getElementById('app')?.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'explorer':
        // Open Base blockchain explorer in new tab
        const baseUrl = 'https://basescan.org/token/0x'; // Replace with actual contract address
        window.open(`${baseUrl}CONTRACT_ADDRESS?a=${tokenId}`, '_blank');
        break;
      case 'attributes':
        setShowAttributes(tokenId);
        break;
    }
  };

  const handleIconClick = (tokenId: number) => {
    onTokenSelect(tokenId);
    // Scroll to the app section
    document.getElementById('app')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Only show tokens if there are actually tokens minted (tokenCount > 0)
  // Create array of token IDs from 1 to tokenCount, but only if tokenCount > 0
  const tokens = tokenCount > 0 ? Array.from({ length: tokenCount }, (_, i) => i + 1) : [];

  return (
    <>
      <div className="os-window token-explorer">
        <div className="os-titlebar">
          <div className="os-titlebar-text">
            <div className="os-titlebar-icon">📁</div>
            Token Explorer
          </div>
          <div className="os-control-buttons">
            <div className="os-btn minimize"></div>
            <div className="os-btn maximize"></div>
            <div className="os-btn close"></div>
          </div>
        </div>
        
        <div className="explorer-content">
          <div className="token-grid">
            {/* Always show example.svg */}
            <div 
              className={`token-item ${activeToken === 0 ? 'active' : ''}`}
              onClick={() => onTokenSelect(0)}
              onContextMenu={(e) => handleRightClick(e, 0)}
            >
              <div 
                className="token-thumbnail"
                onDoubleClick={() => handleIconClick(0)}
              >
                <span>🎨</span>
              </div>
              <div className="token-filename">example.svg</div>
            </div>
            
            {/* Show minted tokens only if they exist */}
            {tokens.length > 0 ? (
              tokens.map(tokenId => {
                const previewUrl = tokenPreviews.get(tokenId);
                return (
                  <div 
                    key={tokenId}
                    className={`token-item ${activeToken === tokenId ? 'active' : ''}`}
                    onClick={() => onTokenSelect(tokenId)}
                    onContextMenu={(e) => handleRightClick(e, tokenId)}
                  >
                    <div 
                      className="token-thumbnail"
                      onDoubleClick={() => handleIconClick(tokenId)}
                    >
                      {previewUrl ? (
                        <img 
                          src={previewUrl}
                          alt={`Token #${tokenId}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            borderRadius: '2px'
                          }}
                        />
                      ) : (
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          height: '100%',
                          fontSize: '10px'
                        }}>
                          <span style={{ marginBottom: '2px' }}>⏳</span>
                          <span>#{tokenId}</span>
                        </div>
                      )}
                    </div>
                    <div className="token-filename">{tokenId}.svg</div>
                  </div>
                );
              })
            ) : (
              /* Show message when no tokens are minted */
              <div className="token-item" style={{ opacity: 0.6, cursor: 'default' }}>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          tokenId={contextMenu.tokenId}
          onClose={() => setContextMenu(null)}
          onAction={handleContextAction}
        />
      )}
      
      {showAttributes !== null && (
        <AttributesPopup
          tokenId={showAttributes}
          onClose={() => setShowAttributes(null)}
        />
      )}
    </>
  );
};

const Home: React.FC = () => {
  const [isLaunched, setIsLaunched] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [mintCount, setMintCount] = useState(0); // Start with 0, will be loaded from blockchain
  const [totalSupply] = useState(1000);
  const [activeToken, setActiveToken] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [svgKey, setSvgKey] = useState(0); // For forcing SVG reload like in App.tsx
  
  // Blockchain state
  const [readOnlyContract, setReadOnlyContract] = useState<ColourMeNFT | null>(null);
  const [tokenPreviews, setTokenPreviews] = useState<Map<number, string>>(new Map());
  const [isLoadingTokenCount, setIsLoadingTokenCount] = useState(false);

  // Initialize countdown from mock timestamp
  useEffect(() => {
    const launchTime = getMintTimestamp();
    
    const updateCountdown = () => {
      const now = Date.now();
      const timeLeft = launchTime - now;
      
      if (timeLeft <= 0) {
        setIsLaunched(true);
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        
        setCountdown({ days, hours, minutes, seconds });
      }
    };
    
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(timer);
  }, []);



  // Initialize blockchain connection
  useEffect(() => {
    const initializeBlockchain = async () => {
      try {
        const { contract, result } = await connectToProvider();
        if (result.success && contract) {
          setReadOnlyContract(contract);
          console.log('Connected to blockchain contract');
        } else {
          console.warn('Failed to connect to blockchain:', result.error);
        }
      } catch (error) {
        console.error('Error initializing blockchain:', error);
      }
    };

    initializeBlockchain();
  }, []);

  // Load actual token count from blockchain
  useEffect(() => {
    const loadTokenCount = async () => {
      if (!readOnlyContract) return;

      setIsLoadingTokenCount(true);
      try {
        const { count, result } = await getTokenCount(readOnlyContract);
        if (result.success) {
          setMintCount(count);
          console.log(`Loaded token count: ${count}`);
        } else {
          console.error('Failed to load token count:', result.error);
        }
      } catch (error) {
        console.error('Error loading token count:', error);
      } finally {
        setIsLoadingTokenCount(false);
      }
    };

    loadTokenCount();
  }, [readOnlyContract]);

  // Force SVG reload when active token changes (like in App.tsx)
  useEffect(() => {
    setSvgKey(prev => prev + 1);
  }, [activeToken]);

  // Load token previews for thumbnails (optimized batch loading)
  useEffect(() => {
    let isMounted = true;
    
    const loadTokenPreviews = async () => {
      if (!readOnlyContract || mintCount === 0) return;

      // Load previews for tokens that don't already have them
      const tokens = Array.from({ length: mintCount }, (_, i) => i + 1);
      const tokensToLoad = tokens.filter(tokenId => !tokenPreviews.has(tokenId));
      
      if (tokensToLoad.length === 0) return;

      console.log(`Loading previews for ${tokensToLoad.length} tokens...`);
      
      // Load tokens with a small delay between requests to avoid overwhelming the network
      for (const tokenId of tokensToLoad) {
        if (!isMounted) break;
        
        try {
          const { svg: svgContent, result } = await getTokenSVG(readOnlyContract, tokenId);
          if (result.success && isMounted) {
            // Convert SVG string to data URL for img tag
            const blob = new Blob([svgContent], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            
            setTokenPreviews(prev => {
              const newPreviews = new Map(prev);
              newPreviews.set(tokenId, url);
              return newPreviews;
            });
          }
        } catch (error) {
          console.error(`Error loading preview for token ${tokenId}:`, error);
        }
        
        // Small delay to prevent overwhelming the network
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    };

    loadTokenPreviews();
    
    return () => {
      isMounted = false;
    };
  }, [readOnlyContract, mintCount, tokenPreviews]);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      tokenPreviews.forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
  }, [tokenPreviews]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth' });
    setIsMobileMenuOpen(false); // Close mobile menu after navigation
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isMobileMenuOpen && !target.closest('.os-navbar')) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isMobileMenuOpen]);

  const handleMint = () => {
    // Implement minting logic here
    console.log('Minting NFT...');
    setMintCount(prev => prev + 1);
  };

  return (
    <div className="home-container">
      {/* Navigation */}
      <nav className="os-navbar">
        <div className="os-nav-links">
          <a href="#title" className="os-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('title'); }}>
            Home
          </a>
          <a href="#about" className="os-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('about'); }}>
            About
          </a>
          <a href="#help" className="os-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('help'); }}>
            Help
          </a>
          <a href="#app" className="os-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('app'); }}>
            App
          </a>
          <a href="#explorer" className="os-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('explorer'); }}>
            Explorer
          </a>
        </div>
        
        <div className={`os-hamburger ${isMobileMenuOpen ? 'open' : ''}`} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          <span></span>
          <span></span>
          <span></span>
        </div>
        
        <div className="os-social-links">
          <a href="https://twitter.com/ColourMeNFT" target="_blank" rel="noopener noreferrer" className="os-social-link">
            𝕏
          </a>
          <a href="https://tiktok.com/@TechnicallyWeb3" target="_blank" rel="noopener noreferrer" className="os-social-link">
            📱
          </a>
        </div>
        
        {/* Mobile Menu */}
        <div className={`os-nav-mobile ${isMobileMenuOpen ? 'open' : ''}`}>
          <a href="#title" className="os-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('title'); }}>
            Home
          </a>
          <a href="#about" className="os-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('about'); }}>
            About
          </a>
          <a href="#help" className="os-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('help'); }}>
            Help
          </a>
          <a href="#app" className="os-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('app'); }}>
            App
          </a>
          <a href="#explorer" className="os-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('explorer'); }}>
            Explorer
          </a>
        </div>
      </nav>

      {/* Title Section */}
      <section id="title" className="page-header">
        <h1>Color Me NFT</h1>
        <p>Create, color, and mint your digital artwork on Base</p>
      </section>

      {/* About Section */}
      <section id="about" className="section-content">
        <h2 className="section-header">About</h2>
        <div style={{ background: 'rgba(255,255,255,0.95)', padding: '30px', borderRadius: '8px' }}>
          <p>
            Color Me NFT is a revolutionary digital art platform that combines the nostalgia of retro computing 
            with cutting-edge blockchain technology. Create stunning pixel art, collaborate with others, 
            and mint your masterpieces as NFTs on the Base network.
          </p>
          <p>
            Our platform features a unique on-chain SVG rendering system that stores your artwork directly 
            on the blockchain, ensuring permanent ownership and provenance. Each NFT is dynamically generated 
            and can be modified by the owner, creating living, evolving digital art.
          </p>
          <p>
            Join our community of digital artists and collectors in this Web3 paint adventure!
          </p>
        </div>
      </section>

      {/* Help Section */}
      <section id="help" className="section-content">
        <h2 className="section-header">How to Use</h2>
        <div style={{ background: 'rgba(255,255,255,0.95)', padding: '30px', borderRadius: '8px' }}>
          <h3>Getting Started:</h3>
          <ul>
            <li><strong>Connect Your Wallet:</strong> Click the "Connect Wallet" button and connect your MetaMask or compatible wallet</li>
            <li><strong>Switch to Base:</strong> Make sure you're on the Base network for low-cost transactions</li>
            <li><strong>Create Art:</strong> Use the painting tools in the main application window to create your masterpiece</li>
            <li><strong>Mint NFT:</strong> Once you're happy with your creation, click "Mint NFT" to create your token</li>
          </ul>
          
          <h3>Advanced Features:</h3>
          <ul>
            <li><strong>Token Explorer:</strong> Browse existing tokens, double-click to load them into the editor</li>
            <li><strong>Right-click Menu:</strong> Right-click on tokens for additional options like viewing attributes</li>
            <li><strong>Collaborative Art:</strong> Token owners can modify their existing NFTs (costs gas)</li>
            <li><strong>Export:</strong> Save your artwork as SVG files for external use</li>
          </ul>
          
          <h3>Tips:</h3>
          <ul>
            <li>Complex artworks may require multiple transactions due to gas limits</li>
            <li>Simpler designs with fewer objects are more gas-efficient</li>
            <li>All artwork is stored on-chain as SVG, ensuring permanence</li>
          </ul>
        </div>
      </section>

      {/* NFT Controls */}
      <section id="controls" className="nft-controls">
        <div className="os-window">
          <div className="os-titlebar">
            <div className="os-titlebar-text">
              <div className="os-titlebar-icon">🎮</div>
              NFT Controls
            </div>
            <div className="os-control-buttons">
              <div className="os-btn minimize"></div>
              <div className="os-btn maximize"></div>
              <div className="os-btn close"></div>
            </div>
          </div>
          
          <div className="os-content">
            {!isLaunched ? (
              <div className="countdown-container">
                <h3>Launch Countdown</h3>
                <div className="countdown">
                  {countdown.days}d {countdown.hours}h {countdown.minutes}m {countdown.seconds}s
                </div>
                <p>Get ready for the most epic paint party in Web3!</p>
              </div>
            ) : (
              <div className="mint-controls">
                <div className="mint-counter">
                  {isLoadingTokenCount ? (
                    'Loading token count...'
                  ) : (
                    `Minted: ${mintCount} / ${totalSupply}`
                  )}
                </div>
                <button 
                  className="os-btn-large success"
                  onClick={handleMint}
                  disabled={mintCount >= totalSupply || isLoadingTokenCount}
                >
                  Mint NFT ($1)
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main App Window */}
      <section id="app" className="main-app-window">
        <div className="os-window">
          <div className="os-titlebar">
            <div className="os-titlebar-text">
              <div className="os-titlebar-icon">🎨</div>
              ColourMeNFT.xyz - {activeToken === 0 ? 'example.svg' : `${activeToken}.svg`}
            </div>
            <div className="os-control-buttons">
              <div className="os-btn minimize"></div>
              <div className="os-btn maximize"></div>
              <div className="os-btn close"></div>
            </div>
          </div>
          
          <div className="app-content-area">
            <SVGDisplay
              key={svgKey}
              tokenId={activeToken || undefined}
              width={1000}
              height={1000}
            />
          </div>
        </div>
      </section>

      {/* Token Explorer */}
      <section id="explorer">
        <h2 className="section-header">Token Gallery</h2>
        {isLoadingTokenCount ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'white' }}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
            <div>Loading token data from blockchain...</div>
          </div>
        ) : (
          <TokenExplorer 
            activeToken={activeToken}
            onTokenSelect={setActiveToken}
            tokenCount={mintCount}
            tokenPreviews={tokenPreviews}
          />
        )}
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>
          <strong>💰 $1 Mint Price</strong> • <strong>👑 5% Royalties</strong> to support TechnicallyWeb3 projects
        </p>
        <p style={{ fontSize: '14px', marginTop: '10px', opacity: 0.8 }}>
          Built with ❤️ for the Web3 community • Powered by Base
        </p>
      </footer>
    </div>
  );
};

export default Home;
