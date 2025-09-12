import React from 'react';
import type { TransactionChunk, TransactionQueue as TxQueue } from '../utils/blockchain';

interface TransactionQueueProps {
  queue: TxQueue;
  onRetryChunk: (chunkIndex: number) => void;
  onExecuteAll: () => void;
  isExecuting: boolean;
}

const TransactionQueue: React.FC<TransactionQueueProps> = ({
  queue,
  onRetryChunk,
  onExecuteAll,
  isExecuting
}) => {
  const getStatusIcon = (status: TransactionChunk['status']) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'processing': return '🔄';
      case 'completed': return '✅';
      case 'failed': return '❌';
      default: return '❓';
    }
  };

  const getStatusColor = (status: TransactionChunk['status']) => {
    switch (status) {
      case 'pending': return '#f0ad4e';
      case 'processing': return '#5bc0de';
      case 'completed': return '#5cb85c';
      case 'failed': return '#d9534f';
      default: return '#999';
    }
  };

  const canExecuteChunk = (chunk: TransactionChunk, index: number): boolean => {
    // First chunk can always be executed if not processing
    if (index === 0) return !isExecuting && chunk.status !== 'processing';
    
    // Other chunks can only be executed if previous chunk is completed
    const previousChunk = queue.chunks[index - 1];
    return !isExecuting && 
           chunk.status !== 'processing' && 
           previousChunk.status === 'completed';
  };

  const completedCount = queue.chunks.filter(c => c.status === 'completed').length;
  const failedCount = queue.chunks.filter(c => c.status === 'failed').length;
  const totalCount = queue.chunks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const canExecuteAll = !isExecuting && queue.chunks.some(c => c.status === 'pending' || c.status === 'failed');

  if (queue.chunks.length === 0) {
    return null;
  }

  return (
    <div style={{
      backgroundColor: 'white',
      padding: '15px',
      borderRadius: '8px',
      border: '1px solid #ddd',
      marginBottom: '15px'
    }}>
      <h4 style={{ 
        margin: '0 0 15px 0', 
        color: '#333',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        🚀 Transaction Queue
        <span style={{
          fontSize: '12px',
          backgroundColor: '#f5f5f5',
          padding: '2px 6px',
          borderRadius: '10px',
          fontWeight: 'normal'
        }}>
          Token #{queue.tokenId}
        </span>
      </h4>

      {/* Progress Summary */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '12px',
        borderRadius: '6px',
        marginBottom: '15px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
            Progress: {completedCount}/{totalCount} completed
          </span>
          <span style={{ fontSize: '12px', color: '#666' }}>
            {progress.toFixed(0)}%
          </span>
        </div>
        
        {/* Progress Bar */}
        <div style={{
          width: '100%',
          height: '8px',
          backgroundColor: '#e9ecef',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            backgroundColor: failedCount > 0 ? '#dc3545' : '#28a745',
            transition: 'width 0.3s ease'
          }} />
        </div>
        
        {failedCount > 0 && (
          <div style={{
            fontSize: '12px',
            color: '#dc3545',
            marginTop: '4px'
          }}>
            ⚠️ {failedCount} transaction{failedCount > 1 ? 's' : ''} failed
          </div>
        )}
      </div>

      {/* Execute All Button */}
      <div style={{
        marginBottom: '15px',
        display: 'flex',
        gap: '8px'
      }}>
        <button
          onClick={onExecuteAll}
          disabled={!canExecuteAll}
          style={{
            padding: '10px 16px',
            backgroundColor: !canExecuteAll ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: !canExecuteAll ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            flex: 1
          }}
        >
          {isExecuting ? '⏳ Executing...' : 
           completedCount === totalCount ? '✅ All Complete' :
           '🚀 Execute All Transactions'}
        </button>
      </div>

      {/* Transaction List */}
      <div style={{
        maxHeight: '300px',
        overflowY: 'auto',
        border: '1px solid #e9ecef',
        borderRadius: '6px'
      }}>
        {queue.chunks.map((chunk, index) => (
          <div
            key={chunk.id}
            style={{
              padding: '12px',
              borderBottom: index < queue.chunks.length - 1 ? '1px solid #e9ecef' : 'none',
              backgroundColor: chunk.status === 'processing' ? '#f8f9fa' : 'white'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '16px' }}>
                  {getStatusIcon(chunk.status)}
                </span>
                <span style={{
                  fontWeight: 'bold',
                  color: getStatusColor(chunk.status)
                }}>
                  Transaction {index + 1}
                </span>
                <span style={{
                  fontSize: '12px',
                  backgroundColor: chunk.type === 'set' ? '#ffeaa7' : '#dda0dd',
                  padding: '2px 6px',
                  borderRadius: '8px',
                  color: '#333'
                }}>
                  {chunk.type.toUpperCase()}
                </span>
              </div>
              
              <div style={{
                fontSize: '12px',
                color: '#666'
              }}>
                {chunk.objects.length} object{chunk.objects.length > 1 ? 's' : ''}
              </div>
            </div>

            <div style={{
              fontSize: '12px',
              color: '#666',
              marginBottom: '8px'
            }}>
              <strong>Status:</strong> {chunk.status.charAt(0).toUpperCase() + chunk.status.slice(1)}
            </div>

            {chunk.error && (
              <div style={{
                fontSize: '12px',
                color: '#dc3545',
                backgroundColor: '#f8d7da',
                padding: '6px 8px',
                borderRadius: '4px',
                marginBottom: '8px'
              }}>
                <strong>Error:</strong> {chunk.error}
              </div>
            )}

            {chunk.txHash && (
              <div style={{
                fontSize: '11px',
                color: '#666',
                fontFamily: 'monospace',
                marginBottom: '8px'
              }}>
                <strong>TX:</strong> {chunk.txHash.slice(0, 10)}...{chunk.txHash.slice(-8)}
              </div>
            )}

            {/* Individual Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '6px'
            }}>
              {(chunk.status === 'pending' || chunk.status === 'failed') && (
                <button
                  onClick={() => onRetryChunk(index)}
                  disabled={!canExecuteChunk(chunk, index)}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: !canExecuteChunk(chunk, index) ? '#ccc' : 
                                   chunk.status === 'failed' ? '#dc3545' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: !canExecuteChunk(chunk, index) ? 'not-allowed' : 'pointer',
                    fontSize: '11px'
                  }}
                >
                  {chunk.status === 'failed' ? '🔄 Retry' : '▶️ Execute'}
                </button>
              )}
              
              {!canExecuteChunk(chunk, index) && index > 0 && (
                <span style={{
                  fontSize: '10px',
                  color: '#666',
                  fontStyle: 'italic',
                  alignSelf: 'center'
                }}>
                  Waiting for previous transaction
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div style={{
        backgroundColor: '#e3f2fd',
        padding: '10px',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#1565c0',
        marginTop: '15px'
      }}>
        <strong>💡 Info:</strong> Transactions must be executed in order. 
        Use "Execute All" to run them automatically, or execute individually for more control.
      </div>
    </div>
  );
};

export default TransactionQueue;
