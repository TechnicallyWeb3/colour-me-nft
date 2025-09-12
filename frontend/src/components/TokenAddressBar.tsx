import React from 'react';
import './TokenAddressBar.css';

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
    // Open Base blockchain explorer in new tab
    const baseUrl = 'https://basescan.org/token/';
    window.open(`${baseUrl}${contractAddress}?a=${tokenId}`, '_blank');
  };

  // Handle OpenSea button click
  const handleOpenSeaClick = () => {
    // Open OpenSea in new tab
    const openSeaUrl = 'https://opensea.io/assets/base/';
    window.open(`${openSeaUrl}${contractAddress}/${tokenId}`, '_blank');
  };

  // Format address for display (truncate middle)
  const formatAddress = (address: string): string => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="token-address-bar-container">
      <div className="token-address-bar-wrapper">
        <div className="token-address-display">
          <span className="address-label">Contract:</span>
          <span className="address-value" title={contractAddress}>
            {formatAddress(contractAddress)}
          </span>
          <span className="token-label">Token:</span>
          <span className="token-value">#{tokenId}</span>
        </div>
      </div>
      
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
