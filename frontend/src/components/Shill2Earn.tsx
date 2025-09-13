import React, { useState, useEffect } from 'react';
import './Shill2Earn.css';

interface Shill2EarnProps {
  isOpen: boolean;
  onClose: () => void;
}

const Shill2Earn: React.FC<Shill2EarnProps> = ({ isOpen, onClose }) => {
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
              <strong>Colour Me NFT</strong> is giving away <strong>2.5 ETH (~$10,000)</strong> to the top 100 shills!
            </div>
            <p>
              With <strong>Shill2Earn</strong>, your clout = your bag. We're rewarding the community that hypes us up and helps this project go viral.
            </p>
          </div>

          <div className="shill2earn-section">
            <h2 className="shill2earn-section-title">Here's How It Works 👇</h2>
            
            <div className="shill2earn-steps">
              <div className="shill2earn-step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <strong>Post</strong> → Make a TikTok or X post using hashtag <strong>#ColourMeNFT</strong>.
                  <div className="step-details">
                    Can be memes, reactions, art flexes, mint tutorials, whatever.
                  </div>
                  <div className="image-placeholder-small">
                    [SOCIAL POSTS PLACEHOLDER]
                    <br />
                    <small>TikTok/X posts with #ColourMeNFT</small>
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
                  <div className="image-placeholder-small">
                    [MEME GRAPHIC PLACEHOLDER]
                    <br />
                    <small>"FARM CLOUT → FARM ETH"</small>
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
