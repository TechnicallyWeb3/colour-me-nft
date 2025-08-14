import React, { useState, useEffect } from 'react';
import { 
  connectToWallet,
  setArt,
  appendArt,
  type ConnectionResult,
  type ContractObject
} from '../utils/blockchain';
import type { ColourMeNFT } from '../typechain-types/contracts/ColourMeNFT.sol/ColourMeNFT';

interface BlockchainControlsProps {
  tokenId?: number;
  account?: string;
  isOwner?: boolean;
  onSaveSuccess?: () => void;
  saveRequestData?: {
    artData: ContractObject[];
    saveType: 'set' | 'append';
  } | null;
}

const BlockchainControls: React.FC<BlockchainControlsProps> = ({ 
  tokenId, 
  account, 
  isOwner = false,
  onSaveSuccess,
  saveRequestData
}) => {
  const [writeContract, setWriteContract] = useState<ColourMeNFT | null>(null);
  // Use external saveRequestData instead of internal state
  const pendingSaveRequest = saveRequestData;
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Helper to show messages
  const showMessage = (message: string, isError = false) => {
    if (isError) {
      setErrorMessage(message);
      setStatusMessage('');
    } else {
      setStatusMessage(message);
      setErrorMessage('');
    }
    setTimeout(() => {
      setStatusMessage('');
      setErrorMessage('');
    }, 5000);
  };

  // Initialize write contract when account is available
  useEffect(() => {
    const initializeContract = async () => {
      if (account) {
        try {
          const { contract, result } = await connectToWallet();
          if (result.success) {
            setWriteContract(contract);
          } else {
            console.error('Failed to connect write contract:', result.error);
          }
        } catch (error) {
          console.error('Error initializing write contract:', error);
        }
      } else {
        setWriteContract(null);
      }
    };

    initializeContract();
  }, [account]);

  // Handle save requests from SVG
  const handleSaveRequest = async (data: { artData: ContractObject[], saveType: 'set' | 'append' }) => {
    if (!writeContract || !account || !tokenId || !isOwner) {
      showMessage('Cannot save: Missing requirements', true);
      return;
    }

    setIsSaving(true);

    try {
      showMessage(`${data.saveType === 'set' ? 'Setting' : 'Appending'} art on token #${tokenId}...`);
      
      let result: ConnectionResult;
      
      if (data.saveType === 'set') {
        result = await setArt(writeContract, tokenId, data.artData);
      } else {
        result = await appendArt(writeContract, tokenId, data.artData);
      }

      if (result.success) {
        showMessage(`Art ${data.saveType === 'set' ? 'set' : 'appended'} successfully!`);
        
        // Notify parent component to reload SVG
        if (onSaveSuccess) {
          onSaveSuccess();
        }
      } else {
        showMessage(result.error || `Failed to ${data.saveType} art`, true);
      }
    } catch (error) {
      showMessage(`Error saving to blockchain: ${error}`, true);
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-handle save requests when data changes
  useEffect(() => {
    if (pendingSaveRequest && writeContract && account && tokenId && isOwner && !isSaving) {
      handleSaveRequest(pendingSaveRequest);
    }
  }, [pendingSaveRequest, writeContract, account, tokenId, isOwner]);

  // Manual save functions for testing
  const handleManualSet = async () => {
    if (!pendingSaveRequest) return;
    await handleSaveRequest({
      artData: pendingSaveRequest.artData,
      saveType: 'set'
    });
  };

  const handleManualAppend = async () => {
    if (!pendingSaveRequest) return;
    await handleSaveRequest({
      artData: pendingSaveRequest.artData,
      saveType: 'append'
    });
  };

  // Don't render if requirements not met
  if (!tokenId || !account || !isOwner) {
    return null;
  }

  return (
    <div style={{
      padding: '15px',
      border: '2px solid #4CAF50',
      borderRadius: '8px',
      backgroundColor: '#f1f8e9',
      marginTop: '20px'
    }}>
      <h3 style={{ 
        margin: '0 0 15px 0', 
        color: '#2e7d32',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        ⛓️ Blockchain Controls
        <span style={{ 
          fontSize: '14px', 
          fontWeight: 'normal',
          backgroundColor: 'rgba(76, 175, 80, 0.2)',
          padding: '2px 8px',
          borderRadius: '12px'
        }}>
          Token #{tokenId}
        </span>
      </h3>

      {/* Connection Status */}
      <div style={{
        backgroundColor: 'white',
        padding: '12px',
        borderRadius: '6px',
        marginBottom: '15px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
            Write Contract: {writeContract ? '✅ Connected' : '❌ Not Connected'}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Account: {account.slice(0, 6)}...{account.slice(-4)}
          </div>
        </div>
        <div style={{
          padding: '4px 8px',
          backgroundColor: '#4CAF50',
          color: 'white',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          OWNER
        </div>
      </div>

      {/* Save Status */}
      {pendingSaveRequest && (
        <div style={{
          backgroundColor: 'white',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '15px',
          border: '1px solid #2196F3'
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#1976d2' }}>
            Pending Save Request
          </h4>
          <div style={{ fontSize: '14px', marginBottom: '8px' }}>
            <strong>Type:</strong> {pendingSaveRequest.saveType.toUpperCase()}
          </div>
          <div style={{ fontSize: '14px', marginBottom: '12px' }}>
            <strong>Elements:</strong> {pendingSaveRequest.artData.length}
          </div>
          
          {/* Manual Controls for Testing */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleManualSet}
              disabled={isSaving}
              style={{
                padding: '8px 12px',
                backgroundColor: isSaving ? '#ccc' : '#FF9800',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                flex: 1
              }}
            >
              {isSaving ? '⏳ Saving...' : '🎨 Set Art'}
            </button>
            
            <button
              onClick={handleManualAppend}
              disabled={isSaving}
              style={{
                padding: '8px 12px',
                backgroundColor: isSaving ? '#ccc' : '#9C27B0',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                flex: 1
              }}
            >
              {isSaving ? '⏳ Saving...' : '➕ Append Art'}
            </button>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {statusMessage && (
        <div style={{
          padding: '10px',
          backgroundColor: '#e8f5e8',
          color: '#2e7d32',
          borderRadius: '6px',
          fontSize: '14px',
          marginBottom: '10px'
        }}>
          ✅ {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div style={{
          padding: '10px',
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderRadius: '6px',
          fontSize: '14px',
          marginBottom: '10px'
        }}>
          ❌ {errorMessage}
        </div>
      )}

      {/* Instructions */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        padding: '12px',
        borderRadius: '6px',
        fontSize: '13px',
        color: '#555'
      }}>
        <strong>💡 Instructions:</strong>
        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
          <li>Make changes in the canvas above</li>
          <li>Click the <strong>💾 Save</strong> button in the canvas</li>
          <li>Art will be automatically saved to the blockchain</li>
          <li>The canvas will reload to show the updated NFT</li>
        </ul>
      </div>

      {/* Debug Info */}
      <details style={{ marginTop: '10px' }}>
        <summary style={{ 
          cursor: 'pointer', 
          fontSize: '12px', 
          color: '#666',
          userSelect: 'none'
        }}>
          🔍 Debug Info
        </summary>
        <div style={{
          backgroundColor: '#f5f5f5',
          padding: '10px',
          borderRadius: '4px',
          marginTop: '8px',
          fontSize: '11px',
          fontFamily: 'monospace'
        }}>
          <div><strong>Token ID:</strong> {tokenId}</div>
          <div><strong>Account:</strong> {account}</div>
          <div><strong>Is Owner:</strong> {isOwner ? 'Yes' : 'No'}</div>
          <div><strong>Write Contract:</strong> {writeContract ? 'Connected' : 'Not Connected'}</div>
          <div><strong>Pending Request:</strong> {pendingSaveRequest ? `${pendingSaveRequest.saveType} (${pendingSaveRequest.artData.length} elements)` : 'None'}</div>
        </div>
      </details>
    </div>
  );
};

export default BlockchainControls;
