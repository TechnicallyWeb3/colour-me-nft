import React from 'react';
import OSWindow from '../OSWindow';
import CountdownTimer from '../CountdownTimer';
import './NFTControlsSection.css';

interface NFTControlsSectionProps {
  id?: string;
  className?: string;
  isLaunched: boolean;
  mintCount: number;
  totalSupply: number;
  launchTimestamp: number;
  isLoadingTokenCount?: boolean;
  onMint?: () => void;
  onLaunchComplete?: () => void;
}

const NFTControlsSection: React.FC<NFTControlsSectionProps> = ({
  id = 'controls',
  className = '',
  isLaunched,
  mintCount,
  totalSupply,
  launchTimestamp,
  isLoadingTokenCount = false,
  onMint,
  onLaunchComplete
}) => {
  return (
    <section id={id} className={`nft-controls-section ${className}`}>
      <OSWindow
        title="NFT Controls"
        icon="🎮"
        className="nft-controls-window"
        showControls={true}
      >
        <div className="nft-controls-content">
          {!isLaunched ? (
            <div className="countdown-container">
              <CountdownTimer
                targetTimestamp={launchTimestamp}
                onComplete={onLaunchComplete}
                title="Launch Countdown"
                format="full"
              />
              <p className="countdown-message">
                Get ready for the most epic paint party in Web3!
              </p>
            </div>
          ) : (
            <div className="mint-controls">
              <div className="mint-counter">
                {isLoadingTokenCount ? (
                  <div className="loading-indicator">
                    <span className="loading-spinner">⏳</span>
                    Loading token count...
                  </div>
                ) : (
                  <div className="mint-stats">
                    <span className="mint-current">{mintCount}</span>
                    <span className="mint-separator">/</span>
                    <span className="mint-total">{totalSupply}</span>
                  </div>
                )}
              </div>
              
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ 
                    width: `${totalSupply > 0 ? (mintCount / totalSupply) * 100 : 0}%` 
                  }}
                ></div>
              </div>
              
              <button 
                className={`mint-button ${mintCount >= totalSupply || isLoadingTokenCount ? 'disabled' : ''}`}
                onClick={onMint}
                disabled={mintCount >= totalSupply || isLoadingTokenCount}
              >
                {mintCount >= totalSupply ? (
                  <>🔒 Sold Out</>
                ) : (
                  <>💰 Mint NFT ($1)</>
                )}
              </button>
              
              {mintCount >= totalSupply && (
                <p className="sold-out-message">
                  🎉 All tokens have been minted! Check the secondary market for available NFTs.
                </p>
              )}
            </div>
          )}
        </div>
      </OSWindow>
    </section>
  );
};

export default NFTControlsSection;
