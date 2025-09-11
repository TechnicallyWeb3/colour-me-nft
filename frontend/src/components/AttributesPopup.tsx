import React from 'react';
import OSWindow from './OSWindow';
import './AttributesPopup.css';

export interface TokenAttribute {
  label: string;
  value: string | number;
}

interface AttributesPopupProps {
  tokenId: number;
  attributes?: TokenAttribute[];
  onClose: () => void;
  className?: string;
}

const AttributesPopup: React.FC<AttributesPopupProps> = ({ 
  tokenId, 
  attributes, 
  onClose, 
  className = '' 
}) => {
  // Default attributes if none provided
  const defaultAttributes: TokenAttribute[] = [
    { label: 'Token ID', value: tokenId.toString() },
    { label: 'Type', value: tokenId === 0 ? 'Example' : 'Minted NFT' },
    { label: 'Created', value: tokenId === 0 ? 'N/A' : 'On Base Network' },
    { label: 'Objects', value: Math.floor(Math.random() * 50) + 10 },
    { label: 'Colors Used', value: Math.floor(Math.random() * 10) + 3 },
    { label: 'Rarity', value: ['Common', 'Rare', 'Epic', 'Legendary'][Math.floor(Math.random() * 4)] }
  ];

  const displayAttributes = attributes || defaultAttributes;

  return (
    <>
      <div className="popup-overlay" onClick={onClose} />
      <OSWindow
        title={`Token #${tokenId} Attributes`}
        icon="📋"
        onClose={onClose}
        className={`attributes-popup popup-window ${className}`}
        showControls={true}
      >
        <div className="attributes-content">
          {displayAttributes.map((attr, index) => (
            <div key={index} className="attribute-row">
              <span className="attribute-label">{attr.label}:</span>
              <span className="attribute-value">{attr.value}</span>
            </div>
          ))}
        </div>
      </OSWindow>
    </>
  );
};

export default AttributesPopup;
