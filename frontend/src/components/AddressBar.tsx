import React, { useState, useEffect, useRef } from 'react';
import './AddressBar.css';
import { getOwnerOf, dappConfig } from '../utils/blockchain';
import type { ColourMeNFT } from '../typechain-types/contracts/ColourMeNFT.sol/ColourMeNFT';

interface TokenData {
  tokenId: number;
  owner: string;
  fileName: string; // For display and address bar
}

interface AddressBarProps {
  contract: ColourMeNFT | null;
  tokenCount: number;
  activeToken: number;
  onTokenSelect: (tokenId: number) => void;
}

const AddressBar: React.FC<AddressBarProps> = ({
  contract,
  tokenCount,
  activeToken,
  onTokenSelect
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [tokenData, setTokenData] = useState<TokenData[]>([]);
  const [filteredTokens, setFilteredTokens] = useState<TokenData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load token data (owners) when contract or tokenCount changes
  useEffect(() => {
    const loadTokenData = async () => {
      setIsLoading(true);
      const tokens: TokenData[] = [];
      
      // Always add example token (ID 0)
      tokens.push({
        tokenId: 0,
        owner: 'Example',
        fileName: 'example.svg'
      });

      // Only load minted tokens if we have a contract and tokens exist
      if (contract && tokenCount > 0) {
        // Load owner data for all minted tokens
        for (let tokenId = 1; tokenId <= tokenCount; tokenId++) {
          try {
            const { owner, result } = await getOwnerOf(contract, tokenId);
            if (result.success) {
            tokens.push({
              tokenId,
              owner,
              fileName: `${tokenId}.svg`
            });
            }
          } catch (error) {
            console.error(`Failed to get owner for token ${tokenId}:`, error);
          }
          
          // Small delay to prevent overwhelming the network
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      setTokenData(tokens);
      setIsLoading(false);
    };

    loadTokenData();
  }, [contract, tokenCount]);

  // Update input value when active token changes
  useEffect(() => {
    const currentToken = tokenData.find(token => token.tokenId === activeToken);
    if (currentToken && !isEditing) {
      setInputValue(`📁 Token/ ➤ ${currentToken.fileName}`);
    }
  }, [activeToken, tokenData, isEditing]);

  // Filter tokens based on input
  useEffect(() => {
    const prefix = "📁 Token/ ➤ ";
    let searchQuery = "";
    
    // Extract search query from input (remove prefix if present)
    if (inputValue.startsWith(prefix)) {
      searchQuery = inputValue.slice(prefix.length).trim();
    } else {
      searchQuery = inputValue.trim();
    }

    // Get current selected token filename
    const currentToken = tokenData.find(token => token.tokenId === activeToken);
    const currentFileName = currentToken?.fileName || '';

    // Show all results if query is empty OR matches current selected file
    if (!searchQuery || searchQuery.toLowerCase() === currentFileName.toLowerCase()) {
      setFilteredTokens(tokenData);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = tokenData.filter(token => {
        // Match by file name (starts with)
        if (token.fileName.toLowerCase().startsWith(query)) return true;
        // Match by owner address (starts with)
        if (token.owner.toLowerCase().startsWith(query)) return true;
        return false;
      });
      setFilteredTokens(filtered);
    }
    setSelectedIndex(-1); // Reset selection when filtering
  }, [inputValue, tokenData, activeToken]);

  // Handle input focus
  const handleFocus = () => {
    setIsEditing(true);
    setIsOpen(true);
    
    // Select only the filename part when clicking
    if (inputRef.current) {
      const match = inputValue.match(/📁 Token\/ ➤ (.+)/);
      if (match) {
        const prefixLength = inputValue.indexOf(match[1]);
        const endPosition = inputValue.length;
        setTimeout(() => {
          inputRef.current?.setSelectionRange(prefixLength, endPosition);
        }, 0);
      }
    }
  };

  // Handle dropdown toggle button
  const handleDropdownToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setIsEditing(true);
    }
  };

  // Handle input blur
  const handleBlur = () => {
    // Note: Click-outside handler now manages dropdown closing
    setIsEditing(false);
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const prefix = "📁 Token/ ➤ ";
    
    // Ensure prefix is always present
    if (!newValue.startsWith(prefix)) {
      // If user tried to delete prefix, restore it
      const currentToken = tokenData.find(token => token.tokenId === activeToken);
      if (currentToken) {
        setInputValue(`${prefix}${currentToken.fileName}`);
      } else {
        setInputValue(`${prefix}`);
      }
      return;
    }
    
    setInputValue(newValue);
    setIsEditing(true);
    setIsOpen(true);
  };

  // Handle token selection
  const handleTokenSelect = (tokenId: number) => {
    onTokenSelect(tokenId);
    setIsOpen(false);
    setIsEditing(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  // Handle Go button click
  const handleGoClick = () => {
    // Extract filename from the path format or use raw input
    let searchValue = inputValue;
    const pathMatch = inputValue.match(/📁 Token\/ ➤ (.+)/);
    if (pathMatch) {
      searchValue = pathMatch[1];
    }
    
    // Try to find token by input value
    const matchingToken = tokenData.find(token => 
      token.fileName.toLowerCase() === searchValue.toLowerCase() ||
      token.tokenId.toString() === searchValue
    );
    
    if (matchingToken) {
      handleTokenSelect(matchingToken.tokenId);
    } else {
      // If no match, reset to current token
      const currentToken = tokenData.find(token => token.tokenId === activeToken);
      if (currentToken) {
        setInputValue(`📁 Token/ ➤ ${currentToken.fileName}`);
      }
      setIsEditing(false);
    }
  };

  // Handle Explorer button click
  const handleExplorerClick = () => {
    if (activeToken === 0) {
      // No blockchain explorer for example token
      return;
    }
    
    // Open blockchain explorer in new tab
    const explorerUrl = dappConfig.network.explorerUrl;
    window.open(`${explorerUrl}/token/${dappConfig.contracts.ColourMeNFT.address}?a=${activeToken}`, '_blank');
  };

  // Handle OpenSea button click
  const handleOpenSeaClick = (tokenId: number) => {
    if (activeToken === 0) {
      // Return the project OpenSea page
      window.open(`${dappConfig.network.openseaUrl}/collection/colour-me-nft`, '_blank');
    } else {
      // Open the token's OpenSea page
      const openSeaUrl = dappConfig.network.openseaUrl;
      const chainName = dappConfig.network.chainName.toLowerCase();
      window.open(`${openSeaUrl}/assets/${chainName}/${dappConfig.contracts.ColourMeNFT.address}/${tokenId}`, '_blank');
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const input = inputRef.current;
    const prefix = "📁 Token/ ➤ ";
    
    // Prevent editing the prefix
    if (input && (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'ArrowLeft')) {
      const cursorPosition = input.selectionStart || 0;
      const prefixLength = prefix.length;
      
      if (e.key === 'Backspace' && cursorPosition <= prefixLength) {
        e.preventDefault();
        return;
      }
      
      if (e.key === 'Delete' && cursorPosition < prefixLength) {
        e.preventDefault();
        return;
      }
      
      if (e.key === 'ArrowLeft' && cursorPosition <= prefixLength) {
        e.preventDefault();
        input.setSelectionRange(prefixLength, prefixLength);
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && selectedIndex >= 0 && selectedIndex < filteredTokens.length) {
        handleTokenSelect(filteredTokens[selectedIndex].tokenId);
      } else {
        handleGoClick();
      }
      return;
    }

    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredTokens.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        setIsEditing(false);
        inputRef.current?.blur();
        break;
    }
  };

  // Auto-scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const selectedElement = dropdownRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [selectedIndex]);

  // Handle clicks outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsEditing(false);
        setSelectedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="address-bar-container" ref={containerRef}>
      <div className="address-bar-wrapper">
        <input
          ref={inputRef}
          type="text"
          className="address-bar-input"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          readOnly={!isEditing}
        />
        <div className="address-bar-dropdown-button" onClick={handleDropdownToggle}>
          ▼
        </div>
      </div>
      <button 
        className="address-bar-go-button" 
        onClick={handleGoClick}
        disabled={isLoading}
        title="Load token art"
      >
        {isLoading ? '⏳' : '➡️'}
      </button>
      <button 
        className="address-bar-explorer-button" 
        onClick={handleExplorerClick}
        disabled={isLoading || activeToken === 0}
        title={activeToken === 0 ? 'No explorer for example token' : 'View on blockchain explorer'}
      >
        📄
      </button>
      <button 
        className="address-bar-opensea-button" 
        onClick={() => handleOpenSeaClick(activeToken)}
        disabled={isLoading || activeToken === 0}
        title={activeToken === 0 ? 'No OpenSea listing for example token' : 'View on OpenSea marketplace'}
      >
        🌊
      </button>

      {isOpen && (
        <div ref={dropdownRef} className="address-bar-dropdown">
          {filteredTokens.length > 0 ? (
            filteredTokens.map((token, index) => (
              <div
                key={token.tokenId}
                className={`dropdown-item ${
                  selectedIndex === index ? 'selected' : ''
                } ${
                  activeToken === token.tokenId ? 'active' : ''
                }`}
                onClick={() => handleTokenSelect(token.tokenId)}
              >
                <div className="dropdown-item-icon">
                  {token.tokenId === 0 ? '🎨' : '🖼️'}
                </div>
                <div className="dropdown-item-content">
                  <div className="dropdown-item-title">
                    {token.fileName}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="dropdown-empty">
              {tokenData.length === 0 ? 'No tokens available' : 'No matching tokens found'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AddressBar;
