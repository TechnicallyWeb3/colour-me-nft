import React from 'react';
import './Overview.css';
import Window from './Window';
import { formatAddress, type ContractData } from '../utils/blockchain';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXTwitter, faTiktok, faDiscord } from '@fortawesome/free-brands-svg-icons';

interface OverviewProps {
    contractData: ContractData | null;
}


const Overview: React.FC<OverviewProps> = ({ contractData }) => {
  return (
    <Window id="overview" title="Help - Overview" icon="❓" buttonset={{ minimize: "", expand: "", close: "" }}>
      <div className="help-content">
        <div className="help-formatted">
          <div className="help-header-section">
            <h1 className="help-main-title">🎨 ColourMeNFT</h1>
            <p className="help-subtitle">Revolutionary Web3 Paint Platform</p>

            <div className="help-meta-info">
              <div className="meta-item">
                <span className="meta-label">Launch Date:</span>
                <span className="meta-value">{contractData?.mintOpen ? contractData.mintOpen.toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) : 'TBD'}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Version:</span>
                <span className="meta-value">1.0</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Platform:</span>
                <span className="meta-value">{contractData?.chain?.name || 'Mainnet'}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Mint Price:</span>
                <span className="meta-value">{contractData?.mintPrice || 'FREE'}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Contract Address:</span>
                <span className="meta-value address-full">{contractData?.contractAddress || '[Contract Address]'}</span>
                <span className="meta-value address-truncated">{formatAddress(contractData?.contractAddress || '[Contract Address]')}</span>
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
                <span className="spec-value">{contractData?.chain?.name || 'Mainnet'} (Ethereum L2)</span>
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
                <span className="social-icon">
                  <FontAwesomeIcon icon={faXTwitter} />
                </span>
                <span className="social-text">@ColourMeNFT</span>
              </div>
              <div className="social-item">
                <span className="social-icon">
                  <FontAwesomeIcon icon={faTiktok} />
                </span>
                <span className="social-text">@TechnicallyWeb3</span>
              </div>
              <div className="social-item">
                <span className="social-icon">
                  <FontAwesomeIcon icon={faDiscord} />
                </span>
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
  );
};

export default Overview;