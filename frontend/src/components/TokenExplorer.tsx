import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    onLoadMoreTokens?: (startToken: number, count: number) => void;
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
  
  const TokenExplorer: React.FC<TokenExplorerProps> = ({ activeToken, onTokenSelect, tokenCount, tokenPreviews, contract, onLoadMoreTokens }) => {
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tokenId: number } | null>(null);
    const [showAttributes, setShowAttributes] = useState<number | null>(null);
    
    // Infinite scroll state
  const [displayedTokens, setDisplayedTokens] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loadingRef = useRef<HTMLDivElement>(null);
  const lastScrolledTokenRef = useRef<number>(-1);
    const BATCH_SIZE = 50;
  
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

    // Load more tokens function
    const loadMoreTokens = useCallback(() => {
      if (isLoading || !hasMore || !onLoadMoreTokens) return;
      
      setIsLoading(true);
      const startToken = displayedTokens.length + 1; // +1 because tokens start from 1
      const tokensToLoad = Math.min(BATCH_SIZE, tokenCount - displayedTokens.length);
      
      console.log(`🔄 Loading more tokens: ${startToken} to ${startToken + tokensToLoad - 1}`);
      
      // Call parent to load more tokens
      onLoadMoreTokens(startToken, tokensToLoad);
      
      // Add tokens to displayed list
      const newTokens = Array.from({ length: tokensToLoad }, (_, i) => startToken + i);
      setDisplayedTokens(prev => [...prev, ...newTokens]);
      
      // Check if we have more tokens to load
      setHasMore(displayedTokens.length + tokensToLoad < tokenCount);
      
      setIsLoading(false);
    }, [isLoading, hasMore, displayedTokens.length, tokenCount, onLoadMoreTokens]);

    // Initialize displayed tokens when tokenCount changes
    useEffect(() => {
      if (tokenCount > 0 && displayedTokens.length === 0) {
        const initialTokens = Array.from({ length: Math.min(BATCH_SIZE, tokenCount) }, (_, i) => i + 1);
        setDisplayedTokens(initialTokens);
        setHasMore(tokenCount > BATCH_SIZE);
        
        // Load initial batch
        if (onLoadMoreTokens) {
          onLoadMoreTokens(1, Math.min(BATCH_SIZE, tokenCount));
        }
      }
    }, [tokenCount, onLoadMoreTokens]);

    // Intersection Observer for infinite scroll
    useEffect(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !isLoading) {
            loadMoreTokens();
          }
        },
        { threshold: 0.1 }
      );

      if (loadingRef.current) {
        observer.observe(loadingRef.current);
      }

      return () => observer.disconnect();
    }, [loadMoreTokens, hasMore, isLoading]);

    // Auto-scroll to active token when it changes (only once per token)
    useEffect(() => {
      if (activeToken >= 0 && activeToken !== lastScrolledTokenRef.current) {
        lastScrolledTokenRef.current = activeToken;
        
        // Check if token is in displayed tokens
        if (displayedTokens.includes(activeToken)) {
          // Find the token element and scroll it into view
          const tokenElement = document.querySelector(`[data-token-id="${activeToken}"]`);
          if (tokenElement) {
            console.log(`🎯 Auto-scrolling to token ${activeToken}`);
            tokenElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'center'
            });
          }
        } else if (activeToken > 0 && onLoadMoreTokens) {
          // Token not in displayed list, need to load more tokens
          console.log(`🔄 Token ${activeToken} not in displayed list, loading more tokens...`);
          
          // Calculate which batch contains this token
          const batchStart = Math.floor((activeToken - 1) / BATCH_SIZE) * BATCH_SIZE + 1;
          const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, tokenCount);
          
          // Load tokens up to the target token
          const tokensToLoad = batchEnd - displayedTokens.length;
          if (tokensToLoad > 0) {
            onLoadMoreTokens(displayedTokens.length + 1, tokensToLoad);
            
            // Add tokens to displayed list
            const newTokens = Array.from({ length: tokensToLoad }, (_, i) => displayedTokens.length + 1 + i);
            setDisplayedTokens(prev => [...prev, ...newTokens]);
            
            // Scroll to token after a short delay to allow rendering
            setTimeout(() => {
              const tokenElement = document.querySelector(`[data-token-id="${activeToken}"]`);
              if (tokenElement) {
                console.log(`🎯 Auto-scrolling to token ${activeToken} after loading`);
                tokenElement.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'center',
                  inline: 'center'
                });
              }
            }, 100);
          }
        }
      }
    }, [activeToken]); // Only depend on activeToken, not displayedTokens
  
    // Use displayed tokens for infinite scroll instead of all tokens
  
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
              data-token-id={0}
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
            {displayedTokens.length > 0 ? (
              displayedTokens.map(tokenId => {
                const previewUrl = tokenPreviews.get(tokenId);
                return (
                  <div
                    key={tokenId}
                    className={`token-item ${activeToken === tokenId ? 'active' : ''}`}
                    onClick={() => onTokenSelect(tokenId)}
                    onContextMenu={(e) => handleRightClick(e, tokenId)}
                    data-token-id={tokenId}
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

            {/* Loading indicator for infinite scroll */}
            {hasMore && (
              <div ref={loadingRef} className="token-loading-indicator">
                <span className="loading-text">Loading...</span>
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