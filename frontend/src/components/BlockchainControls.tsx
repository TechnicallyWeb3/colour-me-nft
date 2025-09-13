import React, { useState, useEffect } from 'react';
import { 
  connectToWallet,
  setArt,
  appendArt,
  createTransactionQueue,
  executeTransactionQueue,
  executeQueueChunk,
  estimateTransactionGas,
  type ConnectionResult,
  type ContractObject,
  type TransactionQueue as TxQueue
} from '../utils/blockchain';
import type { ColourMeNFT } from '../typechain-types/contracts/ColourMeNFT.sol/ColourMeNFT';
import TransactionQueue from './TransactionQueue';

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
  console.log('🔄 [BlockchainControls] Component rendered with props:', {
    tokenId,
    account: account ? `${account.slice(0, 6)}...${account.slice(-4)}` : null,
    isOwner,
    saveRequestData: saveRequestData ? { saveType: saveRequestData.saveType, artDataLength: saveRequestData.artData?.length } : null
  });
  
  const [writeContract, setWriteContract] = useState<ColourMeNFT | null>(null);
  // Use external saveRequestData instead of internal state
  const pendingSaveRequest = saveRequestData;
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Transaction queue state
  const [transactionQueue, setTransactionQueue] = useState<TxQueue | null>(null);
  const [isExecutingQueue, setIsExecutingQueue] = useState(false);
  const [shouldUseQueue, setShouldUseQueue] = useState(false);

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
      console.log('🔌 [BlockchainControls] Initializing write contract for account:', account);
      if (account) {
        try {
          const { contract, result } = await connectToWallet();
          if (result.success) {
            console.log('✅ [BlockchainControls] Write contract connected successfully');
            setWriteContract(contract);
          } else {
            console.error('❌ [BlockchainControls] Failed to connect write contract:', result.error);
          }
        } catch (error) {
          console.error('❌ [BlockchainControls] Error initializing write contract:', error);
        }
      } else {
        console.log('⚠️ [BlockchainControls] No account, clearing write contract');
        setWriteContract(null);
      }
    };

    initializeContract();
  }, [account]);

  // Check if transaction queue is needed
  const checkTransactionRequirements = (artData: ContractObject[]) => {
    // Defensive programming: handle invalid data
    if (!Array.isArray(artData) || artData.length === 0) {
      return { useQueue: false, estimatedGas: 0, objectCount: 0 };
    }
    
    const estimatedGas = estimateTransactionGas(artData);
    const gasLimit = 500000; // Conservative gas limit
    
    return {
      useQueue: estimatedGas > gasLimit,
      estimatedGas,
      objectCount: artData.length
    };
  };

  // Handle save requests from SVG
  const handleSaveRequest = async (data: { artData: ContractObject[], saveType: 'set' | 'append' }) => {
    console.log('🚀 [BlockchainControls] handleSaveRequest called with:', {
      saveType: data.saveType,
      artDataLength: data.artData?.length || 0,
      artData: data.artData
    });
    
    console.log('🔍 [BlockchainControls] Checking prerequisites:', {
      writeContract: !!writeContract,
      account: account,
      tokenId: tokenId,
      isOwner: isOwner
    });
    
    if (!writeContract || !account || !tokenId || !isOwner) {
      console.error('❌ [BlockchainControls] Prerequisites not met:', {
        writeContract: !!writeContract,
        account: !!account,
        tokenId: !!tokenId,
        isOwner: isOwner
      });
      showMessage('Cannot save: Missing requirements', true);
      return;
    }

    const txRequirements = checkTransactionRequirements(data.artData);
    
    // If transaction is large, create a queue instead of direct execution
    if (txRequirements.useQueue) {
      try {
        const queue = createTransactionQueue(tokenId, data.artData, data.saveType);
        setTransactionQueue(queue);
        setShouldUseQueue(true);
        showMessage(`Large dataset detected. Created ${queue.chunks.length} transaction${queue.chunks.length > 1 ? 's' : ''} (${txRequirements.objectCount} objects total).`);
        return;
      } catch (error) {
        showMessage(`Error creating transaction queue: ${error}`, true);
        return;
      }
    }

    // Direct execution for small transactions
    setIsSaving(true);

    try {
      console.log(`🔗 [BlockchainControls] Starting ${data.saveType} transaction...`);
      showMessage(`${data.saveType === 'set' ? 'Setting' : 'Appending'} art on token #${tokenId}...`);
      
      let result: ConnectionResult;
      
      if (data.saveType === 'set') {
        console.log('📝 [BlockchainControls] Calling setArt with:', { tokenId, artDataLength: data.artData.length });
        result = await setArt(writeContract, tokenId, data.artData);
        console.log('📝 [BlockchainControls] setArt result:', result);
      } else {
        console.log('➕ [BlockchainControls] Calling appendArt with:', { tokenId, artDataLength: data.artData.length });
        result = await appendArt(writeContract, tokenId, data.artData);
        console.log('➕ [BlockchainControls] appendArt result:', result);
      }

      if (result.success) {
        console.log('✅ [BlockchainControls] Transaction successful!', result.data);
        showMessage(`Art ${data.saveType === 'set' ? 'set' : 'appended'} successfully!`);
        
        // Notify parent component to reload SVG
        if (onSaveSuccess) {
          onSaveSuccess();
        }
      } else {
        console.error('❌ [BlockchainControls] Transaction failed:', result.error);
        showMessage(result.error || `Failed to ${data.saveType} art`, true);
      }
    } catch (error) {
      console.error('❌ [BlockchainControls] Exception during save:', error);
      showMessage(`Error saving to blockchain: ${error}`, true);
    } finally {
      setIsSaving(false);
    }
  };

  // Queue execution functions
  const handleExecuteAllTransactions = async () => {
    if (!transactionQueue || !writeContract || isExecutingQueue) return;
    
    setIsExecutingQueue(true);
    showMessage('Executing transaction queue...');
    
    try {
      const result = await executeTransactionQueue(
        writeContract,
        transactionQueue,
        (chunk, progress) => {
          showMessage(`Processing transaction ${chunk.chunkIndex + 1}/${chunk.totalChunks} (${progress.completed}/${progress.total} completed)`);
        }
      );
      
      setTransactionQueue(result.finalQueue);
      
      if (result.success) {
        showMessage('All transactions completed successfully!');
        setShouldUseQueue(false);
        
        // Notify parent component to reload SVG
        if (onSaveSuccess) {
          onSaveSuccess();
        }
      } else {
        showMessage(result.error || 'Transaction queue execution failed', true);
      }
    } catch (error) {
      showMessage(`Queue execution error: ${error}`, true);
    } finally {
      setIsExecutingQueue(false);
    }
  };

  const handleRetryChunk = async (chunkIndex: number) => {
    if (!transactionQueue || !writeContract || isExecutingQueue) return;
    
    setIsExecutingQueue(true);
    showMessage(`Retrying transaction ${chunkIndex + 1}...`);
    
    try {
      const result = await executeQueueChunk(writeContract, transactionQueue, chunkIndex);
      setTransactionQueue(result.updatedQueue);
      
      if (result.success) {
        showMessage(`Transaction ${chunkIndex + 1} completed successfully!`);
        
        // Check if all chunks are now completed
        const allCompleted = result.updatedQueue.chunks.every(c => c.status === 'completed');
        if (allCompleted) {
          setShouldUseQueue(false);
          if (onSaveSuccess) {
            onSaveSuccess();
          }
        }
      } else {
        showMessage(`Transaction ${chunkIndex + 1} failed: ${result.error}`, true);
      }
    } catch (error) {
      showMessage(`Retry error: ${error}`, true);
    } finally {
      setIsExecutingQueue(false);
    }
  };

  // Auto-handle save requests when data changes
  useEffect(() => {
    console.log('🔄 [BlockchainControls] useEffect triggered with state:', {
      pendingSaveRequest: !!pendingSaveRequest,
      writeContract: !!writeContract,
      account: !!account,
      tokenId: tokenId,
      isOwner: isOwner,
      isSaving: isSaving,
      shouldUseQueue: shouldUseQueue,
      saveRequestData: pendingSaveRequest
    });
    
    if (pendingSaveRequest && writeContract && account && tokenId && isOwner && !isSaving && !shouldUseQueue) {
      console.log('✅ [BlockchainControls] All conditions met, calling handleSaveRequest');
      handleSaveRequest(pendingSaveRequest);
    } else {
      console.log('❌ [BlockchainControls] Conditions not met for auto-save:', {
        hasPendingRequest: !!pendingSaveRequest,
        hasWriteContract: !!writeContract,
        hasAccount: !!account,
        hasTokenId: !!tokenId,
        isOwner: isOwner,
        notSaving: !isSaving,
        notUsingQueue: !shouldUseQueue
      });
    }
  }, [pendingSaveRequest, writeContract, account, tokenId, isOwner, isSaving, shouldUseQueue]);

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

      {/* Transaction Queue */}
      {shouldUseQueue && transactionQueue && (
        <TransactionQueue
          queue={transactionQueue}
          onRetryChunk={handleRetryChunk}
          onExecuteAll={handleExecuteAllTransactions}
          isExecuting={isExecutingQueue}
        />
      )}

      {/* Save Status - Only show for small/direct transactions */}
      {pendingSaveRequest && !shouldUseQueue && (
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
          
          {/* Transaction Size Analysis */}
          {(() => {
            const requirements = checkTransactionRequirements(pendingSaveRequest.artData);
            return (
              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '8px', 
                borderRadius: '4px', 
                marginBottom: '12px',
                fontSize: '12px'
              }}>
                <div><strong>Objects:</strong> {Array.isArray(pendingSaveRequest.artData) ? pendingSaveRequest.artData.length : 0}</div>
                <div><strong>Estimated Gas:</strong> {requirements.estimatedGas.toLocaleString()}</div>
                <div><strong>Transaction Type:</strong> {requirements.useQueue ? 'Multi-transaction (Chunked)' : 'Single Transaction'}</div>
              </div>
            );
          })()}
          
          <div style={{ fontSize: '14px', marginBottom: '8px' }}>
            <strong>Type:</strong> {pendingSaveRequest.saveType.toUpperCase()}
          </div>
          <div style={{ fontSize: '14px', marginBottom: '12px' }}>
            <strong>Elements:</strong> {Array.isArray(pendingSaveRequest.artData) ? pendingSaveRequest.artData.length : 0}
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
          <li>{shouldUseQueue ? 'Large artworks will be split into multiple transactions' : 'Art will be automatically saved to the blockchain'}</li>
          <li>{shouldUseQueue ? 'Execute transactions in order using the queue above' : 'The canvas will reload to show the updated NFT'}</li>
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
          <div><strong>Pending Request:</strong> {pendingSaveRequest ? `${pendingSaveRequest.saveType} (${Array.isArray(pendingSaveRequest.artData) ? pendingSaveRequest.artData.length : 0} elements)` : 'None'}</div>
          <div><strong>Transaction Queue:</strong> {transactionQueue ? `${transactionQueue.chunks.length} chunks` : 'None'}</div>
          <div><strong>Queue Active:</strong> {shouldUseQueue ? 'Yes' : 'No'}</div>
        </div>
      </details>
    </div>
  );
};

export default BlockchainControls;
