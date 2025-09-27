import Window from './Window';
import SVGDisplay from './SVGDisplay';
import { useEffect, useState, useRef } from 'react';

interface ColourMeAppProps {
  appTitle: string;
  activeToken: number;
  account: string;
  handleSaveRequest: (data: { artData: any[], saveType: 'set' | 'append' }) => void;
}

const ColourMeApp: React.FC<ColourMeAppProps> = ({ appTitle, activeToken, account, handleSaveRequest }) => {
  // const [saveStatus, setSaveStatus] = useState<string>('');
  const [containerSize, setContainerSize] = useState(1000);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateContainerSize = () => {
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const containerSize = Math.min(containerRect.width, containerRect.height);
      setContainerSize(containerSize);
    }
  };

  useEffect(() => {
    // Initial size calculation
    updateContainerSize();

    // Set up ResizeObserver for smooth resizing
    if (containerRef.current && window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(updateContainerSize);
      resizeObserver.observe(containerRef.current);
      
      return () => {
        resizeObserver.disconnect();
      };
    } else {
      // Fallback to window resize
      window.addEventListener('resize', updateContainerSize);
      return () => window.removeEventListener('resize', updateContainerSize);
    }
  }, []);

  return (
    <Window id="app" title={appTitle} icon="🎨" buttonset={{ minimize: "", expand: "", close: "" }}>
      <div ref={containerRef} className="app-content-area">
        <SVGDisplay
          tokenId={activeToken || undefined}
          account={account}
          onSaveRequest={handleSaveRequest}
          width={containerSize}
          height={containerSize}
        />
        {/* Save Status Display */}
        {/* {saveStatus && (
          <div className="save-status">
            {saveStatus}
          </div>
        )} */}
      </div>
    </Window>
  )
};

export default ColourMeApp;