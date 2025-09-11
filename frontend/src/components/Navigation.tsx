import React, { useState, useEffect } from 'react';
import './Navigation.css';

interface NavigationItem {
  id: string;
  label: string;
  href: string;
}

interface NavigationProps {
  items?: NavigationItem[];
  className?: string;
  onNavigate?: (sectionId: string) => void;
}

const defaultNavItems: NavigationItem[] = [
  { id: 'title', label: 'Home', href: '#title' },
  { id: 'about', label: 'About', href: '#about' },
  { id: 'help', label: 'Help', href: '#help' },
  { id: 'app', label: 'App', href: '#app' },
  { id: 'explorer', label: 'Explorer', href: '#explorer' },
];

const Navigation: React.FC<NavigationProps> = ({
  items = defaultNavItems,
  className = '',
  onNavigate
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth' });
    setIsMobileMenuOpen(false);
    onNavigate?.(sectionId);
  };

  const handleNavClick = (e: React.MouseEvent, item: NavigationItem) => {
    e.preventDefault();
    scrollToSection(item.id);
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
    <nav className={`os-navbar ${className}`}>
      <div className="os-nav-links">
        {items.map((item) => (
          <a
            key={item.id}
            href={item.href}
            className="os-nav-link"
            onClick={(e) => handleNavClick(e, item)}
          >
            {item.label}
          </a>
        ))}
      </div>
      
      <div 
        className={`os-hamburger ${isMobileMenuOpen ? 'open' : ''}`} 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <span></span>
        <span></span>
        <span></span>
      </div>
      
      <div className="os-social-links">
        <a 
          href="https://twitter.com/ColourMeNFT" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="os-social-link"
        >
          𝕏
        </a>
        <a 
          href="https://tiktok.com/@TechnicallyWeb3" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="os-social-link"
        >
          📱
        </a>
      </div>
      
      {/* Mobile Menu */}
      <div className={`os-nav-mobile ${isMobileMenuOpen ? 'open' : ''}`}>
        {items.map((item) => (
          <a
            key={`mobile-${item.id}`}
            href={item.href}
            className="os-nav-link"
            onClick={(e) => handleNavClick(e, item)}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;
