import './NotFound.css'

export default function NotFound() {
  const handleRestart = () => {
    window.location.href = '/'
  }

  return (
    <div className="rsod-container">
      <div className="rsod-screen">
        <div className="rsod-header">
          <div className="rsod-title">
            <span className="rsod-error-code">ERROR 404</span>
            <span className="rsod-subtitle">Page Not Found</span>
          </div>
        </div>
        
        <div className="rsod-content">
          <div className="rsod-message">
            <p className="rsod-main-text">
              The page you are looking for has been deleted, moved, or does not exist.
            </p>
            <p className="rsod-sub-text">
              Paint application has encountered an unexpected error and needs to restart.
            </p>
          </div>
          
          <div className="rsod-details">
            <div className="rsod-detail-line">
              <span className="rsod-label">Error Code:</span>
              <span className="rsod-value">0x00000004</span>
            </div>
            <div className="rsod-detail-line">
              <span className="rsod-label">Memory Address:</span>
              <span className="rsod-value">0x40400000</span>
            </div>
            <div className="rsod-detail-line">
              <span className="rsod-label">Paint Application:</span>
              <span className="rsod-value">ColourMeNFT.exe</span>
            </div>
            <div className="rsod-detail-line">
              <span className="rsod-label">Web3 Status:</span>
              <span className="rsod-value">DISCONNECTED</span>
            </div>
          </div>
          
          <div className="rsod-actions">
            <p className="rsod-instruction">
              Press any key to restart the Paint Application...
            </p>
            <button className="rsod-restart-btn" onClick={handleRestart}>
              RESTART PAINT APPLICATION
            </button>
          </div>
        </div>
        
        <div className="rsod-footer">
          <p className="rsod-footer-text">
            ColourMeNFT Paint Application v1.0 | Web3 Paint Adventure
          </p>
        </div>
      </div>
    </div>
  )
}
