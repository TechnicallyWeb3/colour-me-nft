import React from 'react';
import OSWindow from '../OSWindow';
import './HelpSection.css';

interface HelpSectionProps {
  id?: string;
  className?: string;
}

const HelpSection: React.FC<HelpSectionProps> = ({ 
  id = 'help', 
  className = '' 
}) => {
  return (
    <section id={id} className={`help-section ${className}`}>
      <OSWindow
        title="How to Use - Help"
        icon="❓"
        className="help-window"
        showControls={true}
        style={{ width: '100%', height: '100%' }}
      >
        <div className="help-content">
          <h3 className="help-title">Getting Started:</h3>
          <ul className="help-list">
            <li>
              <strong>Connect Your Wallet:</strong> Click the "Connect Wallet" button and connect your MetaMask or compatible wallet
            </li>
            <li>
              <strong>Switch to Base:</strong> Make sure you're on the Base network for low-cost transactions
            </li>
            <li>
              <strong>Create Art:</strong> Use the painting tools in the main application window to create your masterpiece
            </li>
            <li>
              <strong>Mint NFT:</strong> Once you're happy with your creation, click "Mint NFT" to create your token
            </li>
          </ul>
          
          <h3 className="help-title">Advanced Features:</h3>
          <ul className="help-list">
            <li>
              <strong>Token Explorer:</strong> Browse existing tokens, double-click to load them into the editor
            </li>
            <li>
              <strong>Right-click Menu:</strong> Right-click on tokens for additional options like viewing attributes
            </li>
            <li>
              <strong>Collaborative Art:</strong> Token owners can modify their existing NFTs (costs gas)
            </li>
            <li>
              <strong>Export:</strong> Save your artwork as SVG files for external use
            </li>
          </ul>
          
          <h3 className="help-title">Tips:</h3>
          <ul className="help-list">
            <li>Complex artworks may require multiple transactions due to gas limits</li>
            <li>Simpler designs with fewer objects are more gas-efficient</li>
            <li>All artwork is stored on-chain as SVG, ensuring permanence</li>
          </ul>

          <div className="help-shortcuts">
            <h3 className="help-title">Keyboard Shortcuts:</h3>
            <div className="shortcuts-grid">
              <div className="shortcut-item">
                <kbd>Ctrl + Z</kbd>
                <span>Undo</span>
              </div>
              <div className="shortcut-item">
                <kbd>Ctrl + Y</kbd>
                <span>Redo</span>
              </div>
              <div className="shortcut-item">
                <kbd>Ctrl + S</kbd>
                <span>Save</span>
              </div>
              <div className="shortcut-item">
                <kbd>Del</kbd>
                <span>Delete Selected</span>
              </div>
              <div className="shortcut-item">
                <kbd>Ctrl + A</kbd>
                <span>Select All</span>
              </div>
              <div className="shortcut-item">
                <kbd>Esc</kbd>
                <span>Clear Selection</span>
              </div>
            </div>
          </div>

          <div className="help-troubleshooting">
            <h3 className="help-title">Troubleshooting:</h3>
            <div className="troubleshooting-item">
              <strong>Q: My wallet won't connect</strong>
              <p>A: Make sure MetaMask is installed and you're on the Base network. Refresh the page and try again.</p>
            </div>
            <div className="troubleshooting-item">
              <strong>Q: Transaction failed</strong>
              <p>A: Check your gas fees and wallet balance. Complex artworks may need to be split into multiple transactions.</p>
            </div>
            <div className="troubleshooting-item">
              <strong>Q: Can't see my NFT</strong>
              <p>A: Wait a few minutes for the blockchain to process. Click the refresh button in the token info panel.</p>
            </div>
          </div>
        </div>
      </OSWindow>
    </section>
  );
};

export default HelpSection;
