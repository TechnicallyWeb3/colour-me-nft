import React, { useState, useEffect } from 'react';
import Navigation from './Navigation';
import AboutSection from './sections/AboutSection';
import HelpSection from './sections/HelpSection';
import NFTControlsSection from './sections/NFTControlsSection';
import TokenExplorerSection from './sections/TokenExplorerSection';
import OSWindow from './OSWindow';
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

const Home: React.FC = () => {
  const [isLaunched, setIsLaunched] = useState(false);
  const [mintCount, setMintCount] = useState(0); // Start with 0, will be loaded from blockchain
  const [totalSupply] = useState(1000);
  const [activeToken, setActiveToken] = useState(0);
  const [launchTimestamp] = useState(getMintTimestamp());

  const [svgKey, setSvgKey] = useState(0); // For forcing SVG reload like in App.tsx
  
  // Blockchain state
  const [readOnlyContract, setReadOnlyContract] = useState<ColourMeNFT | null>(null);
  const [tokenPreviews, setTokenPreviews] = useState<Map<number, string>>(new Map());
  const [isLoadingTokenCount, setIsLoadingTokenCount] = useState(false);

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

  const handleLaunchComplete = () => {
    setIsLaunched(true);
  };

  const handleTokenSelect = (tokenId: number) => {
    setActiveToken(tokenId);
  };

  return (
    <div className="home-container">
      {/* Navigation */}
      <Navigation />

      {/* Title Section */}
      <section id="title" className="page-header">
        <h1>Color Me NFT</h1>
        <p>Create, color, and mint your digital artwork on Base</p>
      </section>

      {/* About Section */}
      <AboutSection />

      {/* Help Section */}
      <HelpSection />

      {/* NFT Controls */}
      <NFTControlsSection
        isLaunched={isLaunched}
        mintCount={mintCount}
        totalSupply={totalSupply}
        launchTimestamp={launchTimestamp}
        isLoadingTokenCount={isLoadingTokenCount}
        onMint={handleMint}
        onLaunchComplete={handleLaunchComplete}
      />

      {/* Main App Window */}
      <section id="app" className="main-app-window">
        <OSWindow
          title={`ColourMeNFT.xyz - ${activeToken === 0 ? 'example.svg' : `${activeToken}.svg`}`}
          icon="🎨"
          showControls={true}
        >
          <div className="app-content-area">
            <SVGDisplay
              key={svgKey}
              tokenId={activeToken || undefined}
              width={1000}
              height={1000}
            />
          </div>
        </OSWindow>
      </section>

      {/* Token Explorer */}
      <TokenExplorerSection
        activeToken={activeToken}
        onTokenSelect={handleTokenSelect}
        tokenCount={mintCount}
        tokenPreviews={tokenPreviews}
        isLoading={isLoadingTokenCount}
      />

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