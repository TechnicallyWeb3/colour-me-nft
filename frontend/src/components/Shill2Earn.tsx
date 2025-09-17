import React, { useEffect } from 'react';
import './Shill2Earn.css';
import type { ContractData } from '../utils/blockchain';

interface Shill2EarnProps {
  isOpen: boolean;
  onClose: () => void;
  contractData: ContractData | null;
}

// Utility function to parse mint price and calculate reward pool
const getMintPrice = (mintPrice: string): number => {
  if (mintPrice === 'FREE') return 0;
  const parts = mintPrice.split(' ');
  const price = parseFloat(parts[0]) || 0;
  console.log('💰 Parsed mint price:', { mintPrice, parts, price });
  return price;
};

const calculateRewardPool = (contractData: ContractData | null): { amount: number; symbol: string; percentage: number } => {
  if (!contractData) {
    console.log('❌ No contract data for reward pool calculation');
    return { amount: 0, symbol: 'ETH', percentage: 0 };
  }
  
  const pricePerToken = getMintPrice(contractData.mintPrice);
  const totalAmount = pricePerToken * contractData.tokenCount;
  const maxAmount = 2.5; // Maximum reward pool
  const percentage = Math.min((totalAmount / maxAmount) * 100, 100);
  
  console.log('🎯 Reward pool calculation:', {
    pricePerToken,
    tokenCount: contractData.tokenCount,
    totalAmount,
    maxAmount,
    percentage
  });
  
  return {
    amount: totalAmount,
    symbol: contractData.chain.symbol,
    percentage
  };
};

const Shill2Earn: React.FC<Shill2EarnProps> = ({ isOpen, onClose, contractData }) => {
  // Calculate reward pool data once
  const rewardPool = calculateRewardPool(contractData);
  
  // Prevent background scrolling when popup is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="shill2earn-overlay" onClick={onClose} />
      <div className="shill2earn-popup">
        <div className="shill2earn-header">
          <div className="shill2earn-title">
            <div className="shill2earn-icon">🚀</div>
            Shill2Earn - The New Meta
          </div>
          <div className="shill2earn-controls">
            <div className="shill2earn-btn close" onClick={onClose}></div>
          </div>
        </div>
        <div className="shill2earn-container">
        <div className="shill2earn-content">
          <div className="shill2earn-section">
            <h2 className="shill2earn-section-title">The New Meta: Shill2Earn 🚀</h2>
            <p className="shill2earn-intro">
              Forget free mints. Forget farming points for some dusty airdrop. We're flipping the script.
            </p>
             <div className="shill2earn-highlight">
               <strong>Colour Me NFT</strong> is giving away <strong>up to 2.5 ETH (~$10,000)</strong> to the top 100 shills!
             </div>
             
             <div className="reward-pool-section">
               <div className="reward-pool-label">
                 Reward Pool Progress 
                 {contractData && (
                   <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>
                     ({contractData.tokenCount} tokens minted)
                   </span>
                 )}
               </div>
               <div className="reward-pool-bar">
                 <div className="reward-pool-fill" style={{ width: `${rewardPool.percentage}%` }}>
                   <span className="reward-pool-amount">{rewardPool.percentage.toFixed(1)}%</span>
                 </div>
               </div>
               <div className="reward-pool-details">
                 <span className="reward-pool-current">
                   {rewardPool.amount.toFixed(5)} {rewardPool.symbol} raised
                 </span>
                 <span className="reward-pool-max">
                   / 2.5 {rewardPool.symbol} max
                 </span>
               </div>
             </div>
             
            <p>
              With <strong>Shill2Earn</strong>, your clout = your bag. We're rewarding the community that hypes us up and helps this project go viral.
            </p>
          </div>

          <div className="shill2earn-section">
            <div style={{ 
              textAlign: 'center', 
              marginBottom: '20px',
              maxWidth: '100%',
              overflow: 'hidden',
              boxSizing: 'border-box'
            }}>
              <img 
                src="/src/assets/hashtag_cropped.jpg" 
                alt="Social media post with #ColourMeNFT hashtag"
                style={{
                  maxWidth: '100%',
                  maxHeight: '200px',
                  height: 'auto',
                  width: 'auto',
                  borderRadius: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  objectFit: 'contain',
                  display: 'block',
                  margin: '0 auto'
                }}
              />
            </div>
            
            <h2 className="shill2earn-section-title">Here's How It Works 👇</h2>
            
            <div className="shill2earn-steps">
              <div className="shill2earn-step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <strong>Post</strong> → Make a TikTok or X post using hashtag <strong>#ColourMeNFT</strong>.
                  <div className="step-details">
                    Can be memes, reactions, art flexes, mint tutorials, whatever.
                  </div>
                </div>
              </div>
              
              <div className="shill2earn-step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <strong>Submit</strong> → Copy your post link and drop it in our Discord channel (mock link here).
                  <div className="step-details">
                    Mods will check if it meets the guidelines (no bots, no spam, no farmed engagement).
                  </div>
                </div>
              </div>
              
              <div className="shill2earn-step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <strong>Score</strong> → Once minting ends, we'll snapshot your stats:
                  <div className="scoring-formula">
                    <strong>Score = V + 2L + 3S + 4B</strong>
                    <div className="formula-breakdown">
                      V = views, L = likes, S = shares/retweets, B = bookmarks/saves.
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="shill2earn-step">
                <div className="step-number">4</div>
                <div className="step-content">
                  <strong>Win</strong> → Top 50 TikTok posts + Top 50 X posts split <strong>100% of the mint earnings</strong>.
                  <div className="step-details">
                    Yes, literally all of it. Up to <strong>2 posts per platform</strong> per creator (4 total chances).
                  </div>
                </div>
              </div>
            </div>
            
            <div style={{ textAlign: 'center', margin: '20px 0' }}>
              <img 
                src="/src/assets/pepeshill_full.jpg" 
                alt="Pepe the Frog meme about farming clout to farm ETH"
                style={{
                  maxWidth: '100%',
                  maxHeight: '200px',
                  height: 'auto',
                  borderRadius: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              />
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                "FARM CLOUT → FARM ETH"
              </div>
            </div>
            
            <div className="payout-highlight">
              💰 <strong>Potential payout:</strong> Earn up to <strong>$400</strong> just for posting.
              <br />
              And unlike grinding for points, you'll know exactly how much clout = how much ETH.
            </div>
            
            <div className="disqualification-warning">
              ⚠️ <strong>Important:</strong> Anyone found pumping their metrics artificially (bots, fake engagement, etc.) will be immediately disqualified from the contest.
            </div>
          </div>

          <div className="shill2earn-section">
            <h2 className="shill2earn-section-title">Who Can Join? 🕵️‍♂️</h2>
            <div className="requirements-grid">
              <div className="requirement-item">
                <strong>TikTok:</strong> Min. 1000 followers.
              </div>
              <div className="requirement-item">
                <strong>X:</strong> Min. 500 followers.
              </div>
              <div className="requirement-item">
                <strong>Account age:</strong> At least 3 months old.
              </div>
              <div className="requirement-item">
                <strong>Post history:</strong> At least 100 posts before Sept 15th.
              </div>
            </div>
          </div>

          <div className="shill2earn-section">
            <h2 className="shill2earn-section-title">Content Guidelines ✅</h2>
            <ul className="content-guidelines-list">
              <li>Content must be about <strong>Colour Me NFT</strong> and/or your experience with it.</li>
              <li>No hate, harassment, or defamation toward other projects, creators, or communities.</li>
              <li>No spam, botted engagement, or misleading claims. Organic posts only.</li>
              <li>Family-friendly visuals and language. Avoid explicit or NSFW content.</li>
              <li>Disclose sponsorship if applicable and follow platform rules and local laws.</li>
              <li>Include the hashtag <strong>#ColourMeNFT</strong> and ensure you spell it correctly.</li>
              <li>Use your own footage, images, or memes, or ensure you have permission to use them.</li>
            </ul>
          </div>

          <div className="shill2earn-section">
            <h2 className="shill2earn-section-title">Posting Ideas 💡</h2>
            <p className="section-description">
              Want to maximize your clout? Here's how to frame Colour Me NFT for maximum traction:
            </p>
            
            <div className="posting-ideas-grid">
            <div className="idea-category">
                <h3 className="idea-title">🔥 Viral Hooks</h3>
                <ul className="idea-list">
                  <li>"NFTs are so back..."</li>
                  <li>"This changes everything..."</li>
                  <li>"Is this the first-ever..."</li>
                  <li>"Can you believe it's only $1..."</li>
                </ul>
              </div>
              <div className="idea-category">
                <h3 className="idea-title">🎨 Artists</h3>
                <ul className="idea-list">
                  <li>"Mint your own on-chain canvas!"</li>
                  <li>"This isn't just a JPEG!"</li>
                  <li>"Create your own NFTs!"</li>
                  <li>"Sell your art on-chain!"</li>
                </ul>
              </div>
              
              <div className="idea-category">
                <h3 className="idea-title">🚀 Degens</h3>
                <ul className="idea-list">
                  <li>"First-of-its-kind NFT app!"</li>
                  <li>"Only $1 for the world's first TWA!"</li>
                  <li>"TWAs might be the new meta in NFTs!"</li>
                  <li>"Collect art from thousands of artists!"</li>
                </ul>
              </div>
              
              <div className="idea-category">
                <h3 className="idea-title">📱 Tech</h3>
                <ul className="idea-list">
                  <li>"Have you heard of TWA NFTs?"</li>
                  <li>"This project is 100% on-chain!"</li>
                  <li>"Did you know SVGs can be apps?"</li>
                  <li>"This smart contract is genius!"</li>
                </ul>
              </div>
              
              
            </div>
            
            <div className="posting-tips">
              <h3 className="tips-title">💡 Pro Tips:</h3>
              <ul className="tips-list">
                <li>Use trending sounds and hashtags beyond #ColourMeNFT</li>
                <li>Post during peak hours (7-9 PM EST for TikTok, 12-3 PM EST for X)</li>
                <li>Engage with comments quickly to boost algorithm</li>
                <li>Cross-post between platforms but tailor the content</li>
                <li>Tag @ColourMeNFT and @TechnicallyWeb3 for potential reposts</li>
              </ul>
            </div>
          </div>

          <div className="shill2earn-section">
            <h2 className="shill2earn-section-title">Why We're Doing This 🔥</h2>
            <p>
              We could've gone with a boring free mint. Instead, we're taking that hype and giving it BACK to the people who push us. If you've ever been early, if you've ever farmed clout for free — this is finally the <strong>meta that pays you back</strong>.
            </p>
            <div className="image-placeholder-large">
              [SPLASH IMAGE PLACEHOLDER]
              <br />
              <small>"Shill2Earn = The New Meta"</small>
            </div>
            <div className="shill2earn-cta">
              So shill hard, shill loud, and shill smart.
              <br />
              This ain't just marketing. This is <strong>Shill2Earn.</strong>
            </div>
          </div>
        </div>
        </div>
      </div>
    </>
  );
};

export default Shill2Earn;
