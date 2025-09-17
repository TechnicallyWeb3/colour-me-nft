import React from 'react';
import './About.css';
import Window from './Window';

interface AboutProps {
  mintPrice: string;
  chainName: string;
  setIsShill2EarnOpen: (isOpen: boolean) => void;
}

const About: React.FC<AboutProps> = ({ mintPrice, chainName, setIsShill2EarnOpen }) => {

  return (      
    <>
      {/* About Section */}
      <Window id="about" title="Document - About.txt" icon="🗒️" buttonset={{ minimize: "", expand: "", close: "" }}>
        <div className="about-scroll-container">
          <div className="about-content">
          <div className="about-title">
            COLOUR ME NFT - ABOUT
          </div>
          
          <div className="about-banner">
            🚀 NFTs ARE SO BACK! 🚀
          </div>
          
          <div className="about-text">
            Can we even technically call these NFTs? Not another pixel PFP. This isn't "just a JPEG". This is history!
          </div>
          
          <div className="about-text">
            Welcome to <strong>Colour Me NFT</strong> — the <strong>first-ever NFT App</strong>. A fully on-chain, interactive canvas where YOU are the artist. Mint your NFT and you don't just get a JPEG — you get a living, breathing SVG art app that runs forever on-chain. Find a creation made by your favourite artist, friend or just something you're vibing!
          </div>
          
          <div className="about-feature-box">
            🖌️ <strong>5 random colours. 3 random shapes. Unique canvases. Unlimited degen energy.</strong>
          </div>
          
          <div className="about-image-container">
            <img 
              src="../assets/toolbar_all.png" 
              alt="Toolbar variations showing different colour palettes and brush sizes"
              className="about-image"
            />
            <br />
            <small className="about-image-caption">
              Interactive drawing toolbar with colours, brush sizes, shapes, and tools
            </small>
          </div>
          
          <div className="about-features-section">
            <div className="about-features-title">
              🎨 Toolbar Features:
            </div>
            <ul className="about-features-list">
              <li>Shapes: rectangles, ellipses, triangles, lines, polylines, pentagons, hexagons.</li>
              <li>Colours + shapes are randomized at mint, making each canvas unique.</li>
              <li>Tools: brush, eraser and fill bucket and the colour black are common attributes.</li>
            </ul>
            <div className="about-image-container-full">
              <img 
                src="../assets/toolbar_full.png" 
                alt="Full interactive drawing toolbar with colours, brush sizes, shapes, and tools"
                className="about-image"
              />
              <br />
              <small className="about-image-caption">
                Interactive drawing toolbar with colours, brush sizes, shapes, and tools
              </small>
            </div>
          </div>
          
          <div className="about-text">
            This isn't stored on IPFS, Arweave, or some server that dies in a year. Nah, fam. Your art lives on the blockchain. <strong>Forever. Immutable. Unstoppable.</strong>
          </div>
          
          <div className="about-text">
            And the mint price? Just <strong>{mintPrice} (~$1)</strong> on {chainName}.
            That's literally cheaper than your morning coffee. If you can't see what a value this is, if you fade this, you're NGMI.
          </div>
          
          <div className="about-think-box">
            💡 <strong>Think of it like this:</strong>
          </div>
          
          <div className="about-think-list">
            <ul>
              <li>PFPs were the last era.</li>
              <li><strong>Tokenized Web Apps (TWAs)</strong> are the next.</li>
              <li>And Colour Me NFT is the <strong>first TWA</strong> the world has ever seen.</li>
            </ul>
          </div>
          
          <div className="about-text">
            Plus, every mint pays it forward: <strong>5% royalties go to TW3</strong> (Technically Web3) so we can keep building more first-of-its-kind, dope experiments that push Web3 forward.
          </div>
          
          <div className="about-text">
            👉 Whether you're an artist who wants to make something timeless, or just a degen who knows "first-of-its-kind" is ALWAYS alpha — this is your chance to grab history.
          </div>
          
          <div className="about-shill-box">
            <div className="about-shill-title">
              🎯 Wanna Shill This Project?
            </div>
            <div className="about-shill-text">
              Wanna talk about how dope this NFT project is? We want to thank you! Originally we were thinking of making this a <strong>FREE</strong> mint, then decided we would just share the <strong>Primary Sale Revenue</strong> with our community instead. So we're going to reward the top 50 posts on TikTok and X. Members of our community can <strong>earn upto $400</strong> to post about this project! To learn more, check out our Shill2Earn page including who is eligible, how to enter and how to get paid.
            </div>
            <div className="about-shill-footer">
              🏆 May the best shillers win! 🏆
            </div>
            <div className="about-shill-button-container">
              <a 
                href="#" 
                onClick={(e) => { 
                  e.preventDefault(); 
                  setIsShill2EarnOpen(true);
                }}
                className="about-shill-button"
              >
                Learn More About Shill2Earn →
              </a>
            </div>
          </div>
          </div>
        </div>
      </Window>
    </>
  );
};

export default About;