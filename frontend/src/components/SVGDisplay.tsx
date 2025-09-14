import React, { useState, useEffect, useRef } from 'react';
import { 
  connectToProvider,
  getProjectInfo,
  getOwnerOf,
  getTokenSVG
} from '../utils/blockchain';
import type { ColourMeNFT } from '../typechain-types/contracts/ColourMeNFT.sol/ColourMeNFT';
import colourMeFullSvg from '../assets/colour-me.full.svg';

interface SVGDisplayProps {
  tokenId?: number;
  account?: string;
  onSaveRequest?: (data: { artData: any[], saveType: 'set' | 'append' }) => void;
  width?: number;
  height?: number;
  className?: string;
}

const SVGDisplay: React.FC<SVGDisplayProps> = ({ 
  tokenId, 
  account, 
  onSaveRequest,
  width = 1000, 
  height = 1000, 
  className = '' 
}) => {
  const [readOnlyContract, setReadOnlyContract] = useState<ColourMeNFT | null>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [tokenOwner, setTokenOwner] = useState<string>('');
  const [error, setError] = useState<string>('');
  const objectRef = useRef<HTMLObjectElement>(null);

  // Extract token ID from URL hash if not provided as prop
  const getTokenIdFromHash = (): number | null => {
    const hash = window.location.hash.slice(1); // Remove #
    const num = parseInt(hash, 10);
    return !isNaN(num) && num > 0 ? num : null;
  };

  const effectiveTokenId = tokenId || getTokenIdFromHash();

  // Initialize provider and load content
  useEffect(() => {
    const initializeAndLoad = async () => {
      setIsLoading(true);
      setError('');

      // Connect to provider
      const { contract, result } = await connectToProvider();
      if (!result.success) {
        setError('Failed to connect to blockchain');
        loadLocalSVG();
        return;
      }

      setReadOnlyContract(contract);

      // If no token ID, load local SVG and clear hash
      if (!effectiveTokenId) {
        loadLocalSVG();
        clearUrlHash();
        return;
      }

      // Check if token is valid and owned
      const [projectInfoResult, ownerResult] = await Promise.all([
        getProjectInfo(contract!),
        getOwnerOf(contract!, effectiveTokenId)
      ]);

      if (!projectInfoResult.result.success) {
        setError('Failed to get project info');
        loadLocalSVG();
        return;
      }

      const tokenCount = projectInfoResult.projectInfo?.tokenCount || 0;

      // Check if token ID is within valid range
      if (effectiveTokenId > tokenCount) {
        console.log(`📄 Token #${effectiveTokenId} does not exist yet (${tokenCount} total tokens)`);
        loadLocalSVG();
        clearUrlHash();
        return;
      }

      // Check if token is owned (not address(0))
      if (!ownerResult.result.success || ownerResult.owner === '0x0000000000000000000000000000000000000000') {
        console.log(`👤 Token #${effectiveTokenId} is not owned`);
        loadLocalSVG();
        clearUrlHash();
        return;
      }

      // Token exists and is owned - load from contract
      setTokenOwner(ownerResult.owner);
      setIsValidToken(true);
      await loadTokenSVG(contract!, effectiveTokenId);
    };

    initializeAndLoad();
  }, [effectiveTokenId]);

  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      // Trigger re-initialization when hash changes
      window.location.reload();
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const loadLocalSVG = () => {
    setSvgContent(colourMeFullSvg);
    setIsValidToken(false);
    setTokenOwner('');
    setIsLoading(false);
  };

  const clearUrlHash = () => {
    if (window.location.hash) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  };

  const loadTokenSVG = async (contract: ColourMeNFT, tokenId: number) => {
    try {
      const { svg, result } = await getTokenSVG(contract, tokenId);
      
      if (result.success) {
        // Convert bytes to blob URL for the object tag
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        setSvgContent(url);
      } else {
        setError(`Failed to load token SVG: ${result.error}`);
        loadLocalSVG();
      }
    } catch (error) {
      setError(`Error loading token SVG: ${error}`);
      loadLocalSVG();
    } finally {
      setIsLoading(false);
    }
  };

  const reloadTokenSVG = async () => {
    if (readOnlyContract && isValidToken && effectiveTokenId) {
      setIsLoading(true);
      await loadTokenSVG(readOnlyContract, effectiveTokenId);
    }
  };

  // Set data-token attribute on the SVG when it loads
  useEffect(() => {
    if (objectRef.current && svgContent) {
      const tokenForStorage = effectiveTokenId || 0; // Use 0 for create mode, actual token ID for token mode
      
      const handleLoad = () => {
        try {
          const svgDoc = objectRef.current?.contentDocument;
          if (svgDoc) {
            const drawingArea = svgDoc.getElementById('drawing-area');
            if (drawingArea) {
              drawingArea.setAttribute('data-token', tokenForStorage.toString());
              console.log(`🎯 SVG configured for token: ${tokenForStorage}`);
            }
          }
        } catch (error) {
          console.warn('Could not set data-token attribute:', error);
        }
      };

      // If already loaded, set immediately
      if (objectRef.current.contentDocument) {
        handleLoad();
      } else {
        // Otherwise wait for load
        objectRef.current.addEventListener('load', handleLoad);
        return () => {
          if (objectRef.current) {
            objectRef.current.removeEventListener('load', handleLoad);
          }
        };
      }
    }
  }, [svgContent, effectiveTokenId]);

  // Listen for SVG messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data;
      
      if (type === 'SAVE_REQUEST' && onSaveRequest) {
        const { artData, saveType } = data;
        
        // Only allow save if user owns the token (or if it's create mode with token 0)
        const canSave = (effectiveTokenId === null || effectiveTokenId === 0) || // Create mode
                       (isValidToken && 
                        account && 
                        tokenOwner.toLowerCase() === account.toLowerCase()); // Token mode
        
        if (canSave) {
          onSaveRequest({ artData, saveType });
        } else {
          console.log(`🚫 Save blocked: User does not own token #${effectiveTokenId || 0}`);
          // Send response back to SVG
          if (event.source && event.source !== window) {
            (event.source as Window).postMessage({
              type: 'SAVE_RESPONSE',
              success: false,
              message: 'You do not own this token'
            }, '*');
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSaveRequest, isValidToken, account, tokenOwner, effectiveTokenId]);

  // Expose reload function to parent via ref
  useEffect(() => {
    if (objectRef.current) {
      (objectRef.current as any).reloadSVG = reloadTokenSVG;
    }
  }, [readOnlyContract, isValidToken, effectiveTokenId]);

  return (
    <>
      {/* Loading indicator */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 20,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
          <div>Loading SVG...</div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          right: '10px',
          zIndex: 10,
          backgroundColor: 'rgba(244, 67, 54, 0.9)',
          color: 'white',
          padding: '10px 15px',
          borderRadius: '8px',
          fontSize: '14px'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* SVG Display */}
      {svgContent && (
        <object
          ref={objectRef}
          data={svgContent}
          type="image/svg+xml"
          width={width}
          height={height}
          className={className}
          style={{
            border: '2px solid #ddd',
            backgroundColor: 'white'
          }}
        >
          <p>Your browser does not support SVG</p>
        </object>
      )}
    </>
  );
};

export default SVGDisplay;
