import React, { useEffect, useState } from 'react';
import './Navbar.css';
import Shill2Earn from './Shill2Earn';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXTwitter, faTiktok, faDiscord } from '@fortawesome/free-brands-svg-icons';

const Navbar: React.FC = () => {

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isShill2EarnOpen, setIsShill2EarnOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth' });
    setIsMobileMenuOpen(false); // Close mobile menu after navigation
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isMobileMenuOpen && !target.closest('.os-navbar')) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isMobileMenuOpen]);

  return (
    <>
      {/* Navigation */}
      <nav className="os-navbar">
        <div className={`os-hamburger ${isMobileMenuOpen ? 'open' : ''}`} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          <span></span>
          <span></span>
          <span></span>
        </div>
        
        <div className="os-nav-links">
          <a href="#about" className="os-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('about'); }}>
            About
          </a>
          <a href="#mint" className="os-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('mint'); }}>
            Mint
          </a>
          <a href="#app" className="os-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('app'); }}>
            Colour Me NFT
          </a>
          <a href="#gallery" className="os-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('gallery'); }}>
            Gallery
          </a>
          <a href="#overview" className="os-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('overview'); }}>
            Overview
          </a>
          <a href="#" className="os-nav-link" onClick={(e) => { e.preventDefault(); setIsShill2EarnOpen(true); }}>
            Shill2Earn
          </a>
        </div>
        
        <div className="os-social-links">
          <a href="https://twitter.com/ColourMeNFT" target="_blank" rel="noopener noreferrer" className="os-social-link">
            <FontAwesomeIcon icon={faXTwitter} />
          </a>
          <a href="https://tiktok.com/@TechnicallyWeb3" target="_blank" rel="noopener noreferrer" className="os-social-link">
            <FontAwesomeIcon icon={faTiktok} />
          </a>
          <a href="#" target="_blank" rel="noopener noreferrer" className="os-social-link" title="Discord Coming Soon!">
            <FontAwesomeIcon icon={faDiscord} />
          </a>
        </div>
        
        {/* Mobile Menu */}
        <div className={`os-nav-mobile ${isMobileMenuOpen ? 'open' : ''}`}>
          <a href="#about" className="os-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('about'); }}>
            About
          </a>
          <a href="#mint" className="os-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('overview'); }}>
            Mint
          </a>
          <a href="#app" className="os-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('app'); }}>
            Colour Me NFT
          </a>
          <a href="#gallery" className="os-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('gallery'); }}>
            Gallery
          </a>
          <a href="#overview" className="os-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('overview'); }}>
            Overview
          </a>
          <a href="#" className="os-nav-link" onClick={(e) => { e.preventDefault(); setIsShill2EarnOpen(true); }}>
            Shill2Earn
          </a>
        </div>
      </nav>
      
      {/* Shill2Earn Popup */}
      <Shill2Earn 
        isOpen={isShill2EarnOpen} 
        onClose={() => setIsShill2EarnOpen(false)} 
      />
    </>

  )
}

export default Navbar;