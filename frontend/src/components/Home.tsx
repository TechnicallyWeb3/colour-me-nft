import React, { useState, useEffect } from 'react';
import './Home.css';
import SVGDisplay from './SVGDisplay';
import Navbar from './Navbar';
import Window from './Window';
import AddressBar from './AddressBar';
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
  contract: ColourMeNFT | null;
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

const TokenExplorer: React.FC<TokenExplorerProps> = ({ activeToken, onTokenSelect, tokenCount, tokenPreviews, contract }) => {
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
      <Window id="explorer" title="Token Explorer" icon="📁" buttonset={{ minimize: "", expand: "", close: "" }}>
        <AddressBar
          contract={contract}
          tokenCount={tokenCount}
          activeToken={activeToken}
          onTokenSelect={onTokenSelect}
        />
        <div className="explorer-content token-grid">
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
      </Window>
      
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

  const handleMint = () => {
    // Implement minting logic here
    console.log('Minting NFT...');
    setMintCount(prev => prev + 1);
  };

  const appTitle = () => {
    return `ColourMeNFT - ${activeToken}.svg`;
  };

  const appWindowWidth = () => {
    // Use a fixed width to prevent dynamic resizing issues
    // The CSS will handle responsive behavior through max-width and aspect-ratio
    return 1000;
  };

  return (
    <div className="home-container">
      <Navbar />

      {/* Title Section */}
      <section id="title" className="page-header">
        <h1>Color Me NFT</h1>
        <p>Create, color, and mint your digital artwork on Base</p>
      </section>

      {/* About Section */}
      <Window id="about" title="Document - About.txt" icon="🗒️" buttonset={{ minimize: "", expand: "", close: "" }}>
        <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos voluptate distinctio necessitatibus explicabo laboriosam sunt ipsum tempora, accusamus repellendus eos molestiae consequatur ullam fugit dolor maiores incidunt. Sed veniam, architecto repudiandae quas dolorum maxime corrupti nostrum, expedita temporibus error provident iure blanditiis? Nulla officiis aspernatur vel eveniet dolor culpa asperiores, doloremque suscipit quasi beatae quidem nesciunt repellat modi voluptatibus adipisci fuga ab exercitationem. Consectetur, pariatur. Quae quisquam sapiente tenetur. </p>
      </Window>

      {/* NFT Controls */}
      <Window id="mint" title="NFT Controls" icon="🌐" buttonset={{ minimize: "", expand: "", close: "" }}>
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
      </Window>

      {/* Main App Window */}
      <Window id="app" title={appTitle()} icon="🎨" buttonset={{ minimize: "", expand: "", close: "" }}>
        <div className="app-content-area">
          <SVGDisplay
            key={svgKey}
            tokenId={activeToken || undefined}
            width={appWindowWidth()}
            height={appWindowWidth()}
          />
        </div>
      </Window>

      {/* Token Explorer */}
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
          contract={readOnlyContract}
        />
      )}

      {/* Help Section */}
      {/* <Window id="help" title="Help" icon="❓" buttonset={{ minimize: "", expand: "", close: "" }}> 
        <div style={{ padding: '20px', lineHeight: '1.6' }}>
          <h3 style={{ color: '#0054e3', marginBottom: '15px', fontSize: '16px', fontWeight: 'bold' }}>Getting Started:</h3>
          <ul style={{ marginBottom: '25px', paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}><strong>Connect Your Wallet:</strong> Click the "Connect Wallet" button and connect your MetaMask or compatible wallet</li>
            <li style={{ marginBottom: '8px' }}><strong>Switch to Base:</strong> Make sure you're on the Base network for low-cost transactions</li>
            <li style={{ marginBottom: '8px' }}><strong>Create Art:</strong> Use the painting tools in the main application window to create your masterpiece</li>
            <li style={{ marginBottom: '8px' }}><strong>Mint NFT:</strong> Once you're happy with your creation, click "Mint NFT" to create your token</li>
          </ul>
          
          <h3 style={{ color: '#0054e3', marginBottom: '15px', fontSize: '16px', fontWeight: 'bold' }}>Advanced Features:</h3>
          <ul style={{ marginBottom: '25px', paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}><strong>Token Explorer:</strong> Browse existing tokens, double-click to load them into the editor</li>
            <li style={{ marginBottom: '8px' }}><strong>Right-click Menu:</strong> Right-click on tokens for additional options like viewing attributes</li>
            <li style={{ marginBottom: '8px' }}><strong>Collaborative Art:</strong> Token owners can modify their existing NFTs (costs gas)</li>
            <li style={{ marginBottom: '8px' }}><strong>Export:</strong> Save your artwork as SVG files for external use</li>
          </ul>
          
          <h3 style={{ color: '#0054e3', marginBottom: '15px', fontSize: '16px', fontWeight: 'bold' }}>Tips:</h3>
          <ul style={{ paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}>Complex artworks may require multiple transactions due to gas limits</li>
            <li style={{ marginBottom: '8px' }}>Simpler designs with fewer objects are more gas-efficient</li>
            <li style={{ marginBottom: '8px' }}>All artwork is stored on-chain as SVG, ensuring permanence</li>
          </ul>
        </div>
      </Window> */}
      <Window id="overview" title="Help - Overview" icon="❓" buttonset={{ minimize: "", expand: "", close: "" }}>
      <div className="help-content">
          <div className="help-formatted">
            <div className="help-header-section">
              <h1 className="help-main-title">🎨 ColourMeNFT</h1>
              <p className="help-subtitle">Revolutionary Web3 Paint Platform</p>
              
              <div className="help-meta-info">
                <div className="meta-item">
                  <span className="meta-label">Date:</span>
                  <span className="meta-value">September 2025</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Version:</span>
                  <span className="meta-value">1.0</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Platform:</span>
                  <span className="meta-value">Base Network</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Mint Price:</span>
                  <span className="meta-value highlight">$1 USD</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Contract Address:</span>
                  <span className="meta-value">[DEPLOYING SOON]</span>
                </div>
              </div>
            </div>

            <div className="help-section">
              <h2 className="section-title">📖 About This Project</h2>
              <p className="section-description">
                Welcome to the future of digital art creation! ColourMeNFT combines the 
                nostalgia of retro computing with cutting-edge blockchain technology.
              </p>
              <p className="section-description">
                Our platform brings together artists, collectors, and Web3 enthusiasts in
                a unique creative ecosystem where every pixel tells a story.
              </p>
            </div>

            <div className="help-section">
              <h2 className="section-title">🚀 Quick Start</h2>
              <ol className="steps-list">
                <li><strong>Connect</strong> your Web3 wallet (MetaMask, etc.)</li>
                <li><strong>Mint</strong> your NFT canvas for $1</li>
                <li><strong>Create</strong> vector art using unique tools and colours</li>
                <li><strong>Save</strong> your artwork directly to the blockchain</li>
                <li><strong>Sell</strong> or trade your artwork with the community</li>
              </ol>
            </div>

            <div className="help-section">
              <h2 className="section-title">✨ What Makes Us Special</h2>
              <ul className="feature-list">
                <li>🎨 Create stunning vector art directly in your browser</li>
                <li>⛓️ Everything stored <strong>ON-CHAIN</strong> as SVG format</li>
                <li>💰 Mint your canvas on Base network for just <strong>$1</strong></li>
                <li>🤝 Collaborate and modify existing NFTs (living art!)</li>
                <li>👥 Community-driven creative platform</li>
                <li>🔒 No external dependencies - truly decentralized art</li>
                <li>🖌️ Unique tools and colours so no 2 canvases are the same</li>
              </ul>
            </div>

            <div className="help-section">
              <h2 className="section-title">🚀 Key Features</h2>
              <div className="features-grid">
                <div className="feature-item">✅ Dynamic SVG rendering system</div>
                <div className="feature-item">🏆 Permanent ownership & provenance</div>
                <div className="feature-item">🌱 Living, evolving digital art</div>
                <div className="feature-item">⚡ Low-cost transactions on Base</div>
                <div className="feature-item">📤 Export functionality</div>
              </div>
            </div>

            <div className="help-section">
              <h2 className="section-title">⚙️ Technical Details</h2>
              <div className="tech-specs">
                <div className="spec-row">
                  <span className="spec-label">Blockchain:</span>
                  <span className="spec-value">Base (Ethereum L2)</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Token Standard:</span>
                  <span className="spec-value">ERC-721</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Storage:</span>
                  <span className="spec-value">On-chain SVG</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Rendering:</span>
                  <span className="spec-value">Dynamic, client-side</span>
                </div>
              </div>
            </div>

            <div className="help-section">
              <h2 className="section-title">🌐 Community & Support</h2>
              <p className="section-description">
                Join thousands of artists and NFT collectors in this Web3 paint adventure! Experience the 
                perfect blend of nostalgia and innovation.
              </p>
              
              <div className="social-links">
                <div className="social-item">
                  <span className="social-icon">🌐 Website</span>
                  <span className="social-text">ColourMeNFT.xyz</span>
                </div>
                <div className="social-item">
                  <span className="social-icon">🐦 Twitter</span>
                  <span className="social-text">@ColourMeNFT</span>
                </div>
                <div className="social-item">
                  <span className="social-icon">📱 TikTok</span>
                  <span className="social-text">@TechnicallyWeb3</span>
                </div>
                <div className="social-item">
                  <span className="social-icon">💬 Discord</span>
                  <span className="social-text">Discord Coming Soon!</span>
                </div>
              </div>
            </div>

            <div className="help-footer">
              <p>Built with ❤️ by the TechnicallyWeb3 team</p>
              <p className="copyright">© 2025 ColourMeNFT - Powered by Base Network</p>
            </div>
          </div>
        </div>
      </Window>

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
