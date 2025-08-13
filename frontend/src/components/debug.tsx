import React, { useEffect, useState, useRef } from 'react';

interface DebugProps {
  className?: string;
}

interface ColourMeArtData {
  type: string;
  timestamp: number;
  data: any;
  size: number;
}

const Debug: React.FC<DebugProps> = ({ className = '' }) => {
  const [localStorageData, setLocalStorageData] = useState<ColourMeArtData | null>(null);
  const [tokenStorageData, setTokenStorageData] = useState<ColourMeArtData | null>(null);
  const [messageLog, setMessageLog] = useState<string[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const lastLocalRef = useRef<string>('');
  const lastTokenRef = useRef<string>('');

  // Monitor localStorage changes
  useEffect(() => {
    if (!isMonitoring) return;

    const checkLocalStorage = () => {
      try {
        const colourMeArt = localStorage.getItem('colourMeArt');
        const tokenArt = localStorage.getItem('tokenArt');
        if (colourMeArt && colourMeArt !== lastLocalRef.current) {
          lastLocalRef.current = colourMeArt;
          
          setLocalStorageData({
            type: 'local',
            timestamp: Date.now(),
            data: JSON.parse(colourMeArt),
            size: new Blob([colourMeArt]).size
          });
          addMessage(`LocalStorage local updated`);
        }

        if (tokenArt && tokenArt !== lastTokenRef.current) {
          lastTokenRef.current = tokenArt;
          setTokenStorageData({
            type: 'token',
            timestamp: Date.now(),
            data: JSON.parse(tokenArt),
            size: new Blob([tokenArt]).size
          });
          addMessage(`LocalStorage token updated`);
        }

      } catch (error) {
        addMessage(`Error reading localStorage: ${error}`);
      }
    };

    // Check immediately
    checkLocalStorage(); // initial not needed since we are listening for storage events and SVG will initialize the token storage

    // Listen for storage events (from other tabs/windows)
    const handleStorageChange = (e: StorageEvent) => {
      console.log('Storage event detected: ', e);
      if (e.key === 'colourMeArt' && e.newValue !== lastLocalRef.current) {
        addMessage(`Local event detected: ${e.newValue ? 'updated' : 'removed'}`);
        checkLocalStorage();
      }
      if (e.key === 'tokenArt' && e.newValue !== lastTokenRef.current) {
        addMessage(`Token event detected: ${e.newValue ? 'updated' : 'removed'}`);
        checkLocalStorage();
      }
    };

    window.addEventListener('storage', handleStorageChange);
  }, [isMonitoring]);

  // Handle messages from SVG
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data;
      
      if (type === 'SAVE_REQUEST') {
        addMessage(`SAVE_REQUEST received from SVG`);
        
        // Extract the art data from the SVG's localStorage and store it in parent page
        try {
          // The SVG should send the actual art data in the message
          if (data && data.artData) {
            // Store in parent page's localStorage so debug component can see it
            // localStorage.setItem('colourMeArt', JSON.stringify(data.artData));
            addMessage(`Art data received and stored: ${JSON.stringify(data.artData).length} characters`);
            
            // Trigger a localStorage check to update the display
            const colourMeArt = localStorage.getItem('colourMeArt');
            if (colourMeArt) {
              const parsedData = JSON.parse(colourMeArt);
              const dataSize = new Blob([colourMeArt]).size;
              
              setLocalStorageData({
                type: 'local',
                timestamp: Date.now(),
                data: parsedData,
                size: dataSize
              });
            }
          } else {
            addMessage(`SAVE_REQUEST received but no art data found in message`);
          }
        } catch (error) {
          addMessage(`Error processing SAVE_REQUEST data: ${error}`);
        }
        
        // Send response back to SVG if needed
        if (event.source && event.source !== window) {
          (event.source as Window).postMessage({
            type: 'SAVE_RESPONSE',
            success: true,
            message: 'Save request processed successfully'
          }, '*');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const addMessage = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setMessageLog(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]); // Keep last 50 messages
  };

  const clearLocalStorage = () => {
    localStorage.removeItem('colourMeArt');
    setLocalStorageData(null);
    addMessage('LocalStorage cleared');
  };

  const downloadArtData = () => {
    if (localStorageData) {
      const blob = new Blob([JSON.stringify(localStorageData.data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `colour-me-art-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addMessage('Art data downloaded');
    }
  };

  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
    addMessage(`Monitoring ${!isMonitoring ? 'enabled' : 'disabled'}`);
  };

  return (
    <div className={`debug-component ${className}`} style={{ 
      padding: '20px', 
      border: '1px solid #ccc', 
      borderRadius: '8px',
      backgroundColor: '#f9f9f9',
      fontFamily: 'monospace',
      fontSize: '14px'
    }}>
      <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>Debug Component</h3>
      
      {/* Controls */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button 
          onClick={toggleMonitoring}
          style={{ 
            padding: '8px 16px',
            backgroundColor: isMonitoring ? '#4CAF50' : '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
        </button>
        
        <button 
          onClick={clearLocalStorage}
          style={{ 
            padding: '8px 16px',
            backgroundColor: '#ff9800',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Clear LocalStorage
        </button>
        
        {localStorageData && (
          <button 
            onClick={downloadArtData}
            style={{ 
              padding: '8px 16px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Download Art Data
          </button>
        )}
      </div>

      {/* LocalStorage Status */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#555' }}>LocalStorage Status</h4>
        {localStorageData ? (
          <div style={{ 
            padding: '10px', 
            backgroundColor: '#e8f5e8', 
            borderRadius: '4px',
            border: '1px solid #4CAF50'
          }}>
            <div><strong>Last Updated:</strong> {new Date(localStorageData.timestamp).toLocaleString()}</div>
            <div><strong>Data Size:</strong> {localStorageData.size} bytes</div>
            <div><strong>Element Count:</strong> {Array.isArray(localStorageData.data) ? localStorageData.data.length : 'N/A'}</div>
            <details style={{ marginTop: '10px' }}>
              <summary style={{ cursor: 'pointer', color: '#666' }}>View Raw Data</summary>
              <pre style={{ 
                marginTop: '10px', 
                padding: '10px', 
                backgroundColor: '#f5f5f5', 
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '200px'
              }}>
                {JSON.stringify(localStorageData.data, null, 2)}
              </pre>
            </details>
          </div>
        ) : (
          <div style={{ 
            padding: '10px', 
            backgroundColor: '#ffebee', 
            borderRadius: '4px',
            border: '1px solid #f44336'
          }}>
            No colourMeArt data found in localStorage
          </div>
        )}
      </div>

      {/* Message Log */}
      <div>
        <h4 style={{ margin: '0 0 10px 0', color: '#555' }}>Message Log</h4>
        <div style={{ 
          height: '200px', 
          overflow: 'auto', 
          backgroundColor: '#fff', 
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '10px'
        }}>
          {messageLog.length > 0 ? (
            messageLog.map((message, index) => (
              <div key={index} style={{ 
                marginBottom: '5px', 
                padding: '2px 0',
                borderBottom: '1px solid #eee'
              }}>
                {message}
              </div>
            ))
          ) : (
            <div style={{ color: '#999', fontStyle: 'italic' }}>No messages yet...</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Debug;
