import React, { useState, useEffect } from 'react';
import './Home.css';
import SVGDisplay from './SVGDisplay';
import Navbar from './Navbar';
import Window from './Window';
import TokenAddressBar from './TokenAddressBar';
import AddressBar from './AddressBar';
import WebsiteContent from './WebsiteContent';
import {
  connectToProvider,
  getTokenSVG,
  getContractData,
  type ContractData,
  formatAddress,
  connectToWallet,
  setArt,
  appendArt,
  type ConnectionResult,
  type ContractObject
} from '../utils/blockchain';
import type { ColourMeNFT } from '../typechain-types/contracts/ColourMeNFT.sol/ColourMeNFT';


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
  const [activeToken, setActiveToken] = useState(0);
  const [svgKey, setSvgKey] = useState(0); // For forcing SVG reload like in App.tsx

  // Blockchain state
  const [readOnlyContract, setReadOnlyContract] = useState<ColourMeNFT | null>(null);
  const [writeContract, setWriteContract] = useState<ColourMeNFT | null>(null);
  const [account, setAccount] = useState<string>('');
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [tokenPreviews, setTokenPreviews] = useState<Map<number, string>>(new Map());
  const [isLoadingContract, setIsLoadingContract] = useState(false);
  
  // Save functionality state
  const [saveRequestData, setSaveRequestData] = useState<{
    artData: ContractObject[];
    saveType: 'set' | 'append';
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('');


  // Function to refresh contract data from blockchain
  const refreshContractData = async () => {
    if (!readOnlyContract) return;
    
    try {
      const { data, result } = await getContractData(readOnlyContract);
      if (result.success && data) {
        setContractData(data);
        console.log('Refreshed contract data:', data);
      } else {
        console.error('Failed to refresh contract data:', result.error);
      }
    } catch (error) {
      console.error('Error refreshing contract data:', error);
    }
  };

  // Initialize blockchain connection and load contract data
  useEffect(() => {
    const initializeBlockchain = async () => {
      setIsLoadingContract(true);
      try {
        const { contract, result } = await connectToProvider();
        if (result.success && contract) {
          setReadOnlyContract(contract);
          console.log('Connected to blockchain contract');

          // Load contract data
          const { data, result: contractResult } = await getContractData(contract);
          if (contractResult.success && data) {
            setContractData(data);
            console.log('Loaded contract data:', data);
          } else {
            console.error('Failed to load contract data:', contractResult.error);
            // Load fallback data even if contract fails
            const { data: fallbackData } = await getContractData(null);
            setContractData(fallbackData);
          }
        } else {
          console.warn('Failed to connect to blockchain:', result.error);
          // Load fallback data when no contract connection
          const { data: fallbackData } = await getContractData(null);
          setContractData(fallbackData);
        }
      } catch (error) {
        console.error('Error initializing blockchain:', error);
        // Load fallback data on error
        const { data: fallbackData } = await getContractData(null);
        setContractData(fallbackData);
      } finally {
        setIsLoadingContract(false);
      }
    };

    initializeBlockchain();
  }, []);

  // Initialize write contract when account is available
  useEffect(() => {
    const initializeWriteContract = async () => {
      if (account) {
        try {
          const { contract, result } = await connectToWallet();
          if (result.success) {
            console.log('✅ [Home.tsx] Write contract connected successfully');
            setWriteContract(contract);
          } else {
            console.error('❌ [Home.tsx] Failed to connect write contract:', result.error);
          }
        } catch (error) {
          console.error('❌ [Home.tsx] Error initializing write contract:', error);
        }
      } else {
        console.log('⚠️ [Home.tsx] No account, clearing write contract');
        setWriteContract(null);
      }
    };

    initializeWriteContract();
  }, [account]);

  // Force SVG reload when active token changes (like in App.tsx)
  useEffect(() => {
    setSvgKey(prev => prev + 1);
  }, [activeToken]);

  // Load token previews for thumbnails (optimized batch loading)
  useEffect(() => {
    let isMounted = true;

    const loadTokenPreviews = async () => {
      if (!readOnlyContract || !contractData || contractData.tokenCount === 0) return;

      // Load previews for tokens that don't already have them
      const tokens = Array.from({ length: contractData.tokenCount }, (_, i) => i + 1);
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
  }, [readOnlyContract, contractData, tokenPreviews]);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      tokenPreviews.forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
  }, [tokenPreviews]);

  // Handle save request from SVG
  const handleSaveRequest = (data: { artData: any[] | string, saveType: 'set' | 'append' }) => {
    console.log('🎨 [Home.tsx] SAVE_REQUEST received:', { type: 'SAVE_REQUEST', data });
    console.log('🔍 [Home.tsx] handleSaveRequest called with:', data);
    
    // Parse artData if it's a JSON string
    let parsedArtData: ContractObject[] = [];
    
    if (typeof data.artData === 'string') {
      try {
        parsedArtData = JSON.parse(data.artData);
        console.log('✅ [Home.tsx] Parsed JSON artData:', parsedArtData.length, 'objects');
      } catch (error) {
        console.error('❌ [Home.tsx] Failed to parse artData JSON:', error);
        parsedArtData = [];
      }
    } else if (Array.isArray(data.artData)) {
      parsedArtData = data.artData;
      console.log('✅ [Home.tsx] Using array artData:', parsedArtData.length, 'objects');
    } else {
      console.warn('⚠️ [Home.tsx] artData is neither string nor array:', data.artData);
      parsedArtData = [];
    }
    
    const saveRequest = {
      artData: parsedArtData,
      saveType: data.saveType
    };
    
    console.log('📝 [Home.tsx] Setting saveRequestData:', saveRequest);
    setSaveRequestData(saveRequest);
  };

  // Handle successful save
  const handleSaveSuccess = () => {
    console.log('✅ [Home.tsx] Save successful, reloading SVG and thumbnail');
    setSvgKey(prev => prev + 1); // Force SVG reload
    setSaveRequestData(null); // Clear pending request
    setSaveStatus('Art saved successfully!');
    setTimeout(() => setSaveStatus(''), 3000);
    
    // Reload thumbnail for the current token
    if (activeToken > 0 && readOnlyContract) {
      reloadTokenThumbnail(activeToken);
    }
  };

  // Reload thumbnail for a specific token
  const reloadTokenThumbnail = async (tokenId: number) => {
    if (!readOnlyContract) return;
    
    try {
      console.log(`🖼️ [Home.tsx] Reloading thumbnail for token #${tokenId}`);
      const { svg: svgContent, result } = await getTokenSVG(readOnlyContract, tokenId);
      if (result.success) {
        // Clean up old URL if it exists
        const oldUrl = tokenPreviews.get(tokenId);
        if (oldUrl) {
          URL.revokeObjectURL(oldUrl);
        }
        
        // Create new preview URL
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        setTokenPreviews(prev => {
          const newPreviews = new Map(prev);
          newPreviews.set(tokenId, url);
          return newPreviews;
        });
        
        console.log(`✅ [Home.tsx] Thumbnail reloaded for token #${tokenId}`);
      } else {
        console.error(`❌ [Home.tsx] Failed to reload thumbnail for token #${tokenId}:`, result.error);
      }
    } catch (error) {
      console.error(`❌ [Home.tsx] Error reloading thumbnail for token #${tokenId}:`, error);
    }
  };

  // Auto-handle save requests when data changes
  useEffect(() => {
    console.log('🔄 [Home.tsx] useEffect triggered with state:', {
      saveRequestData: !!saveRequestData,
      writeContract: !!writeContract,
      account: !!account,
      activeToken: activeToken,
      isSaving: isSaving
    });
    
    if (saveRequestData && writeContract && account && activeToken > 0 && !isSaving) {
      console.log('✅ [Home.tsx] All conditions met, calling handleSaveRequest');
      handleSaveRequest(saveRequestData);
    } else {
      console.log('❌ [Home.tsx] Conditions not met for auto-save:', {
        hasSaveRequest: !!saveRequestData,
        hasWriteContract: !!writeContract,
        hasAccount: !!account,
        hasValidToken: activeToken > 0,
        notSaving: !isSaving
      });
    }
  }, [saveRequestData, writeContract, account, activeToken, isSaving]);

  // Handle save execution
  const executeSave = async (data: { artData: ContractObject[], saveType: 'set' | 'append' }) => {
    if (!writeContract || !account || !activeToken || activeToken === 0) {
      console.error('❌ [Home.tsx] Prerequisites not met for save:', {
        writeContract: !!writeContract,
        account: !!account,
        activeToken: activeToken
      });
      setSaveStatus('Cannot save: Missing requirements');
      return;
    }

    setIsSaving(true);
    setSaveStatus(`${data.saveType === 'set' ? 'Setting' : 'Appending'} art...`);

    try {
      console.log(`🔗 [Home.tsx] Starting ${data.saveType} transaction...`);
      
      let result: ConnectionResult;
      
      if (data.saveType === 'set') {
        console.log('📝 [Home.tsx] Calling setArt with:', { tokenId: activeToken, artDataLength: data.artData.length });
        result = await setArt(writeContract, activeToken, data.artData);
        console.log('📝 [Home.tsx] setArt result:', result);
      } else {
        console.log('➕ [Home.tsx] Calling appendArt with:', { tokenId: activeToken, artDataLength: data.artData.length });
        result = await appendArt(writeContract, activeToken, data.artData);
        console.log('➕ [Home.tsx] appendArt result:', result);
      }

      if (result.success) {
        console.log('✅ [Home.tsx] Transaction successful!', result.data);
        setSaveStatus(`Art ${data.saveType === 'set' ? 'set' : 'appended'} successfully!`);
        handleSaveSuccess();
      } else {
        console.error('❌ [Home.tsx] Transaction failed:', result.error);
        setSaveStatus(result.error || `Failed to ${data.saveType} art`);
      }
    } catch (error) {
      console.error('❌ [Home.tsx] Exception during save:', error);
      setSaveStatus(`Error saving to blockchain: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Execute save when saveRequestData changes
  useEffect(() => {
    if (saveRequestData && writeContract && account && activeToken > 0 && !isSaving) {
      executeSave(saveRequestData);
    }
  }, [saveRequestData, writeContract, account, activeToken, isSaving]);

  // Listen for messages from SVG (like in App.tsx)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data;
      
      if (type === 'SAVE_REQUEST') {
        console.log('🎨 [Home.tsx] SAVE_REQUEST received from SVG:', { type, data });
        handleSaveRequest(data);
      } else if (type === 'OBJECT_ADDED') {
        console.log('📝 [Home.tsx] OBJECT_ADDED received:', data);
        // Update current objects when new object is added
        const { artData } = data;
        if (artData && artData.diff) {
          try {
            const diffObjects = typeof artData.diff === 'string' 
              ? JSON.parse(artData.diff) 
              : artData.diff;
            
            if (Array.isArray(diffObjects) && diffObjects.length > 0) {
              console.log('📝 [Home.tsx] Processing diff objects:', diffObjects.length);
              // For append operations, add to current objects
              if (artData.saveType === 'append') {
                // Handle append logic if needed
                console.log('➕ [Home.tsx] Append operation detected');
              } else {
                // For set operations, replace current objects
                console.log('🔄 [Home.tsx] Set operation detected');
              }
            }
          } catch (error) {
            console.error('❌ [Home.tsx] Failed to parse OBJECT_ADDED data:', error);
          }
        }
      } else if (type === 'CLEAR_REQUEST') {
        console.log('🗑️ [Home.tsx] CLEAR_REQUEST received');
        // Reset objects when canvas is cleared
      } else if (type === 'LOAD_DATA') {
        console.log('📂 [Home.tsx] LOAD_DATA received:', data);
        // Update objects when data is loaded
        const { artData } = data;
        if (Array.isArray(artData)) {
          console.log('📂 [Home.tsx] Loading art data:', artData.length, 'objects');
        }
      }
    };

    console.log('👂 [Home.tsx] Setting up message listener');
    window.addEventListener('message', handleMessage);
    return () => {
      console.log('🔇 [Home.tsx] Removing message listener');
      window.removeEventListener('message', handleMessage);
    };
  }, []); // Empty dependency array like in App.tsx


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

      {/* Website Browser */}
      <Window id="mint" title="Browser - colourmenft.xyz" icon="🌐" buttonset={{ minimize: "", expand: "", close: "" }}>
        <TokenAddressBar contractAddress={contractData?.contractAddress || ''} tokenId={activeToken || 0} />
        <WebsiteContent 
          contractData={contractData}
          contract={readOnlyContract}
          onMintSuccess={(tokenId) => {
            setActiveToken(tokenId);
          }}
          onContractDataUpdate={refreshContractData}
          onAccountChange={setAccount}
        />
      </Window>

      {/* Main App Window */}
      <Window id="app" title={appTitle()} icon="🎨" buttonset={{ minimize: "", expand: "", close: "" }}>
        <div className="app-content-area">
          <SVGDisplay
            key={svgKey}
            tokenId={activeToken || undefined}
            account={account}
            onSaveRequest={handleSaveRequest}
            width={appWindowWidth()}
            height={appWindowWidth()}
          />
          {/* Save Status Display */}
          {saveStatus && (
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              zIndex: 1000
            }}>
              {saveStatus}
            </div>
          )}
        </div>
      </Window>

      {/* Token Explorer */}
      {isLoadingContract ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'white' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
          <div>Loading contract data from blockchain...</div>
        </div>
      ) : (
        <TokenExplorer
          activeToken={activeToken}
          onTokenSelect={setActiveToken}
          tokenCount={contractData?.tokenCount || 0}
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
                  <span className="meta-value">{contractData?.mintPrice}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Contract Address:</span>
                  <span className="meta-value address-full">{contractData?.contractAddress}</span>
                  <span className="meta-value address-truncated">{formatAddress(contractData?.contractAddress || '')}</span>
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
          <strong>💰 Mint Price: {contractData?.mintPrice} </strong> • <strong>👑 5% Royalties</strong> to support TechnicallyWeb3 projects
        </p>
        <p style={{ fontSize: '14px', marginTop: '10px', opacity: 0.8 }}>
          Built with ❤️ for the Web3 community • Powered by {contractData?.chain?.name || 'Base'}
        </p>
      </footer>
    </div>
  );
};

export default Home;
