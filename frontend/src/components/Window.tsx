import React from 'react';
import './Window.css';

type WindowButtonset = {
    minimize: string | null;
    expand: string | null;
    close: string | null;
}

type WindowProps = {
    id: string;
    title: string;
    icon: string;
    buttonset: WindowButtonset;
    children: React.ReactNode;
}

const Window: React.FC<WindowProps> = ({ id, title, icon, buttonset, children }) => {

  function renderButtonset() {
    return (
      <div className="os-control-buttons">
        {buttonset.minimize !== null && <div className="os-btn minimize">{buttonset.minimize}</div>}
        {buttonset.expand !== null && <div className="os-btn maximize">{buttonset.expand}</div>}
        {buttonset.close !== null && <div className="os-btn close">{buttonset.close}</div>}
      </div>
    )
  }


  return (
    <section id={id}>
      <div className="os-window">
        <div className="os-titlebar">
          <div className="os-titlebar-text">
            <div className="os-titlebar-icon">{icon}</div>
            {title}
          </div>
          {renderButtonset()}
        </div>
        <div className="os-content">
          {children}
        </div>
      </div>
    </section>
  )
}

export default Window;