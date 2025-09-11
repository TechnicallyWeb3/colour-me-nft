import React from 'react';
import './OSWindow.css';

interface OSWindowProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
  className?: string;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
  showControls?: boolean;
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
}

const OSWindow: React.FC<OSWindowProps> = ({
  title,
  icon,
  children,
  className = '',
  onMinimize,
  onMaximize,
  onClose,
  showControls = true,
  width,
  height,
  style = {}
}) => {
  const windowStyle = {
    ...style,
    ...(width && { width }),
    ...(height && { height })
  };

  return (
    <div className={`os-window ${className}`} style={windowStyle}>
      <div className="os-titlebar">
        <div className="os-titlebar-text">
          {icon && <div className="os-titlebar-icon">{icon}</div>}
          {title}
        </div>
        {showControls && (
          <div className="os-control-buttons">
            {onMinimize && (
              <div className="os-btn minimize" onClick={onMinimize}></div>
            )}
            {onMaximize && (
              <div className="os-btn maximize" onClick={onMaximize}></div>
            )}
            {onClose && (
              <div className="os-btn close" onClick={onClose}></div>
            )}
            {!onMinimize && !onMaximize && !onClose && (
              <>
                <div className="os-btn minimize"></div>
                <div className="os-btn maximize"></div>
                <div className="os-btn close"></div>
              </>
            )}
          </div>
        )}
      </div>
      <div className="os-content">
        {children}
      </div>
    </div>
  );
};

export default OSWindow;
