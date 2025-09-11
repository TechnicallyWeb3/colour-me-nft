import React, { useState } from 'react';
import OSWindow from '../OSWindow';
import ContextMenu from '../ContextMenu';
import AttributesPopup from '../AttributesPopup';
import type { ContextMenuItem } from '../ContextMenu';
import './TokenExplorerSection.css';

interface TokenExplorerSectionProps {
  id?: string;
  className?: string;
  activeToken: number;
  onTokenSelect: (tokenId: number) => void;
  tokenCount: number;
  tokenPreviews: Map<number, string>;
  isLoading?: boolean;
}

const TokenExplorerSection: React.FC<TokenExplorerSectionProps> = ({
  id = 'explorer',
  className = '',
  activeToken,
  onTokenSelect,
  tokenCount,
  tokenPreviews,
  isLoading = false
}) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tokenId: number } | null>(null);
  const [showAttributes, setShowAttributes] = useState<number | null>(null);

  const handleRightClick = (e: React.MouseEvent, tokenId: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, tokenId });
  };

  const handleIconClick = (tokenId: number) => {
    onTokenSelect(tokenId);
    // Scroll to the app section
    document.getElementById('app')?.scrollIntoView({ behavior: 'smooth' });
  };

  const contextMenuItems: ContextMenuItem[] = [
    {
      id: 'open',
      label: 'Open in app',
      icon: '🎨',
      onClick: () => {
        if (contextMenu) {
          onTokenSelect(contextMenu.tokenId);
          document.getElementById('app')?.scrollIntoView({ behavior: 'smooth' });
        }
      }
    },
    {
      id: 'explorer',
      label: 'View in explorer',
      icon: '🔍',
      onClick: () => {
        if (contextMenu) {
          const baseUrl = 'https://basescan.org/token/0x'; // Replace with actual contract address
          window.open(`${baseUrl}CONTRACT_ADDRESS?a=${contextMenu.tokenId}`, '_blank');
        }
      }
    },
    {
      id: 'attributes',
      label: 'Attributes',
      icon: '📋',
      onClick: () => {
        if (contextMenu) {
          setShowAttributes(contextMenu.tokenId);
        }
      }
    }
  ];

  // Create array of token IDs from 1 to tokenCount, but only if tokenCount > 0
  const tokens = tokenCount > 0 ? Array.from({ length: tokenCount }, (_, i) => i + 1) : [];

  if (isLoading) {
    return (
      <section id={id} className={`token-explorer-section ${className}`}>
        <h2 className="section-header">Token Gallery</h2>
        <div className="loading-container">
          <div className="loading-icon">⏳</div>
          <div className="loading-text">Loading token data from blockchain...</div>
        </div>
      </section>
    );
  }

  return (
    <section id={id} className={`token-explorer-section ${className}`}>
      <h2 className="section-header">Token Gallery</h2>
      <OSWindow
        title="Token Explorer"
        icon="📁"
        className="token-explorer"
        showControls={true}
      >
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
                          className="token-preview-image"
                        />
                      ) : (
                        <div className="token-placeholder">
                          <span className="placeholder-icon">⏳</span>
                          <span className="placeholder-text">#{tokenId}</span>
                        </div>
                      )}
                    </div>
                    <div className="token-filename">{tokenId}.svg</div>
                  </div>
                );
              })
            ) : (
              /* Show message when no tokens are minted */
              <div className="no-tokens-message">
                <div className="no-tokens-icon">🎨</div>
                <div className="no-tokens-text">
                  No tokens minted yet.<br />
                  Be the first to create!
                </div>
              </div>
            )}
          </div>
        </div>
      </OSWindow>
      
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
      
      {showAttributes !== null && (
        <AttributesPopup
          tokenId={showAttributes}
          onClose={() => setShowAttributes(null)}
        />
      )}
    </section>
  );
};

export default TokenExplorerSection;
