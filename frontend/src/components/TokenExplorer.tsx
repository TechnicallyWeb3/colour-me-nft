import React, { useState, useEffect } from 'react';
import './TokenExplorer.css';
import Window from './Window';
import AddressBar from './AddressBar';
import type { ColourMeNFT } from '../typechain-types/contracts/ColourMeNFT.sol/ColourMeNFT';
import { dappConfig } from '../utils/blockchain';


interface TokenExplorerProps {
    activeToken: number;
    onTokenSelect: (tokenId: number) => void;
    tokenCount: number;
    tokenPreviews: Map<number, string>;
    contract: ColourMeNFT | null;
    onLoadMoreThumbnails: (startTokenId: number, endTokenId: number) => Promise<void>;
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
      { label: 'Created', value: tokenId === 0 ? 'N/A' : `On ${dappConfig.network.chainName || 'Mainnet'} Network'` },
      { label: 'Objects', value: Math.floor(Math.random() * 50) + 10 },
      { label: 'Colours Used', value: Math.floor(Math.random() * 10) + 3 },
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
      console.log('🔍 [ContextMenu] Component render - tokenId:', tokenId);
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
  
  const TokenExplorer: React.FC<TokenExplorerProps> = ({ activeToken, onTokenSelect, tokenCount, tokenPreviews, contract, onLoadMoreThumbnails }) => {
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tokenId: number } | null>(null);
    const [showAttributes, setShowAttributes] = useState<number | null>(null);
    const [visibleTokens, setVisibleTokens] = useState(100); // Start with 100 tokens visible
    const [isLoadingMore, setIsLoadingMore] = useState(false);
  
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
          // Open blockchain explorer in new tab
          const explorerUrl = dappConfig.network.explorerUrl;
          window.open(`${explorerUrl}/token/${dappConfig.contracts.ColourMeNFT.address}?a=${tokenId}`, '_blank');
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

    const handleLoadMore = async () => {
      setIsLoadingMore(true);
      
      const currentVisible = visibleTokens;
      const newVisible = Math.min(visibleTokens + 100, tokenCount);
      const startTokenId = currentVisible + 1;
      const endTokenId = newVisible;
      
      // Load thumbnails for the new tokens
      if (onLoadMoreThumbnails) {
        await onLoadMoreThumbnails(startTokenId, endTokenId);
      }
      
      // Update visible tokens count
      setVisibleTokens(newVisible);
      setIsLoadingMore(false);
    };
  
    // Only show tokens if there are actually tokens minted (tokenCount > 0)
    // Create array of token IDs from 1 to visibleTokens, but only if tokenCount > 0
    const tokens = tokenCount > 0 ? Array.from({ length: Math.min(visibleTokens, tokenCount) }, (_, i) => i + 1) : [];
    const hasMoreTokens = visibleTokens < tokenCount;
  
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
                          className="token-thumbnail-image"
                        />
                      ) : (
                        <div className="token-thumbnail-loading">
                          <span className="token-thumbnail-loading-icon">⏳</span>
                          <span className="token-thumbnail-loading-text">#{tokenId}</span>
                        </div>
                      )}
                    </div>
                    <div className="token-filename">{tokenId}.svg</div>
                  </div>
                );
              })
            ) : (
              /* Show message when no tokens are minted */
              <div className="token-item token-item-empty">
              </div>
            )}

            {/* Load More Button */}
            {hasMoreTokens && (
              <div className="load-more-container">
                <button 
                  className="load-more-button"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? (
                    <>
                      <span className="loading-spinner">⏳</span>
                      Loading more tokens...
                    </>
                  ) : (
                    <>
                      Load More Tokens ({tokenCount - visibleTokens} remaining)
                    </>
                  )}
                </button>
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

  export default TokenExplorer;