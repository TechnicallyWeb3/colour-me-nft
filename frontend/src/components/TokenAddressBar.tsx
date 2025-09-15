import React from 'react';
import './TokenAddressBar.css';
import { formatAddress, dappConfig } from '../utils/blockchain';

interface TokenAddressBarProps {
  contractAddress: string;
  tokenId: number;
  isLoading?: boolean;
}

const TokenAddressBar: React.FC<TokenAddressBarProps> = ({
  contractAddress,
  tokenId,
  isLoading = false
}) => {
  
  // Handle Copy button click
  const handleCopyClick = async () => {
    try {
      await navigator.clipboard.writeText(contractAddress);
      // Could add a toast notification here
      console.log('Contract address copied to clipboard');
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  };

  // Handle Explorer button click
  const handleExplorerClick = () => {
    // Open blockchain explorer in new tab
    const explorerUrl = dappConfig.network.explorerUrl;
    window.open(`${explorerUrl}/token/${contractAddress}?a=${tokenId}`, '_blank');
  };

  // Handle OpenSea button click
  const handleOpenSeaClick = () => {
    // Open OpenSea in new tab
    const openSeaUrl = dappConfig.network.openseaUrl;
    window.open(`${openSeaUrl}/assets/${dappConfig.network.chainName.toLowerCase()}/${contractAddress}/${tokenId}`, '_blank');
  };

  return (
    <div className="token-address-bar-container">
      <div className="token-address-bar-wrapper">
        <div className="token-address-display">
          <span className="address-label">🔏</span>
          <span className="address-full">{contractAddress}</span>
          <span className="address-truncated">{formatAddress(contractAddress)}</span>

        </div>
      </div>
      <div className="token-address-buttons"></div>
      <button 
        className="token-address-copy-button" 
        onClick={handleCopyClick}
        disabled={isLoading}
        title="Copy contract address"
      >
        {isLoading ? '⏳' : '📋'}
      </button>
      
      <button 
        className="token-address-explorer-button" 
        onClick={handleExplorerClick}
        disabled={isLoading}
        title="View on blockchain explorer"
      >
        📄
      </button>
      
      <button 
        className="token-address-opensea-button" 
        onClick={handleOpenSeaClick}
        disabled={isLoading}
        title="View on OpenSea marketplace"
      >
        🌊
      </button>
    </div>
  );
};

export default TokenAddressBar;
