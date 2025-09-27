import React, { useState, useEffect } from 'react';
import './Home.css';
import Navbar from './Navbar';
import ColourMeApp from './ColourMeApp';
import About from './About';
import TokenExplorer from './TokenExplorer';
import Shill2Earn from './Shill2Earn';
import {
  connectToProvider,
  getTokenSVG,
  getContractData,
  type ContractData,
  connectToWallet,
  setArt,
  appendArt,
  type ConnectionResult,
  type ContractObject
} from '../utils/blockchain';
import type { ColourMeNFT } from '../typechain-types/contracts/ColourMeNFT.sol/ColourMeNFT';
import Mint from './Mint';
import Overview from './Overview';

const Home: React.FC = () => {
  const [activeToken, setActiveToken] = useState(0);

  // Blockchain state
  const [readOnlyContract, setReadOnlyContract] = useState<ColourMeNFT | null>(null);
  const [writeContract, setWriteContract] = useState<ColourMeNFT | null>(null);
  // const [tokenCount, setTokenCount] = useState(0);
  const [account, setAccount] = useState<string>('');
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [tokenPreviews, setTokenPreviews] = useState<Map<number, string>>(new Map());
  const [isLoadingContract, setIsLoadingContract] = useState(false);
  
  // Save functionality state
  const [saveRequestData, setSaveRequestData] = useState<{
    artData: ContractObject[];
    saveType: 'set' | 'append';
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('');
  
  // Shill2Earn popup state
  const [isShill2EarnOpen, setIsShill2EarnOpen] = useState(false);

  // Initialize active token from URL hash on first load
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const id = parseInt(hash, 10);
    if (!isNaN(id) && id > 0) {
      setActiveToken(id);
    }
  }, []);


  // Function to refresh contract data from blockchain
  const refreshContractData = async () => {
    if (!readOnlyContract) return;
    
    try {
      const { data, result } = await getContractData(readOnlyContract);
      if (result.success && data) {
        setContractData(data);
        console.log('Refreshed contract data:', data);
      } else {
        console.error('Failed to refresh contract data:', result.error);
      }
    } catch (error) {
      console.error('Error refreshing contract data:', error);
    }
  };

  // Initialize blockchain connection and load contract data - only once
  useEffect(() => {
    const initializeBlockchain = async () => {
      console.log('🔍 [Home.tsx] - initializeBlockchain');
      setIsLoadingContract(true);
      try {
        const { contract, result } = await connectToProvider();
        if (result.success && contract) {
          setReadOnlyContract(contract);
          console.log('Connected to blockchain contract');

          // Load contract data
          const { data, result: contractResult } = await getContractData(contract);
          if (contractResult.success && data) {
            setContractData(data);
            console.log('Loaded contract data:', data);
          } else {
            console.error('Failed to load contract data:', contractResult.error);
            // Load fallback data even if contract fails
            const { data: fallbackData } = await getContractData(null);
            setContractData(fallbackData);
          }
        } else {
          console.warn('Failed to connect to blockchain:', result.error);
          // Load fallback data when no contract connection
          const { data: fallbackData } = await getContractData(null);
          setContractData(fallbackData);
        }
      } catch (error) {
        console.error('Error initializing blockchain:', error);
        // Load fallback data on error
        const { data: fallbackData } = await getContractData(null);
        setContractData(fallbackData);
      } finally {
        setIsLoadingContract(false);
      }
    };

    // Only initialize if we don't have contract data and aren't already loading
    if (contractData === null && !isLoadingContract) {
      initializeBlockchain();
    }
  }, [contractData, isLoadingContract]); // Add dependencies to prevent unnecessary calls

  // Initialize write contract when account is available - only when account changes
  useEffect(() => {
    const initializeWriteContract = async () => {
      console.log('🔍 [Home.tsx] - initializeWriteContract');
      if (account) {
        try {
          const { contract, result } = await connectToWallet();
          if (result.success) {
            console.log('✅ [Home.tsx] Write contract connected successfully');
            setWriteContract(contract);
          } else {
            console.error('❌ [Home.tsx] Failed to connect write contract:', result.error);
          }
        } catch (error) {
          console.error('❌ [Home.tsx] Error initializing write contract:', error);
        }
      } else {
        console.log('⚠️ [Home.tsx] No account, clearing write contract');
        setWriteContract(null);
      }
    };

    // Only initialize if we don't have a write contract or account changed
    if (writeContract === null || (account && !writeContract)) {
      initializeWriteContract();
    }
  }, [account, writeContract]); // Add writeContract to dependencies

  // Force SVG reload when active token changes (like in App.tsx)
  // useEffect(() => {
  //   console.log('🔍 [Home.tsx] useEffect - forceSVGReload');
  //   setSvgKey(prev => prev + 1);
  // }, [activeToken]);

  // Load token previews for thumbnails (optimized batch loading with localStorage cache)
  const loadTokenPreviewsBatch = async (startToken: number, count: number) => {
    if (!readOnlyContract || !contractData) return;

    console.log(`🔄 Loading token batch: ${startToken} to ${startToken + count - 1}`);

    // First, try to load from localStorage cache
    const cacheKey = `token_previews_${contractData.contractAddress}`;
    const cachedData = localStorage.getItem(cacheKey);
    let cache = cachedData ? JSON.parse(cachedData) : {};
    
    // Check cache expiration (24 hours)
    const cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const now = Date.now();
    const isCacheValid = cache.timestamp && (now - cache.timestamp) < cacheExpiry;

    // Load cached previews for this batch
    if (isCacheValid && cache.previews) {
      for (let i = startToken; i < startToken + count; i++) {
        const tokenIdStr = i.toString();
        if (cache.previews[tokenIdStr] && !tokenPreviews.has(i)) {
          const svgContent = cache.previews[tokenIdStr];
          const blob = new Blob([svgContent as string], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          
          setTokenPreviews(prev => {
            const newPreviews = new Map(prev);
            newPreviews.set(i, url);
            return newPreviews;
          });
        }
      }
    }

    // Load missing tokens from network
    for (let i = startToken; i < startToken + count; i++) {
      const tokenIdStr = i.toString();
      
      // Skip if already loaded or in cache
      if (tokenPreviews.has(i) || (isCacheValid && cache.previews && cache.previews[tokenIdStr])) {
        continue;
      }

      try {
        const { svg: svgContent, result } = await getTokenSVG(readOnlyContract, i);
        if (result.success) {
          // Convert SVG string to data URL for img tag
          const blob = new Blob([svgContent], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);

          setTokenPreviews(prev => {
            const newPreviews = new Map(prev);
            newPreviews.set(i, url);
            return newPreviews;
          });

          // Update cache
          if (!cache.previews) cache.previews = {};
          cache.previews[tokenIdStr] = svgContent;
          cache.timestamp = now;
        }
      } catch (error) {
        console.error(`Error loading preview for token ${i}:`, error);
      }

      // Small delay to prevent overwhelming the network
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Save updated cache to localStorage
    try {
      localStorage.setItem(cacheKey, JSON.stringify(cache));
    } catch (error) {
      console.warn('Failed to save cache to localStorage:', error);
    }
  };

  // Legacy function for initial loading (can be removed once infinite scroll is working)
  useEffect(() => {
    console.log('🔍 [Home.tsx] useEffect - loadTokenPreviews (legacy)');
    let isMounted = true;

    const loadTokenPreviews = async () => {
      if (!readOnlyContract || !contractData || contractData.tokenCount === 0) return;

      // Load previews for tokens that don't already have them
      const tokens = Array.from({ length: contractData.tokenCount }, (_, i) => i + 1);
      const tokensToLoad = tokens.filter(tokenId => !tokenPreviews.has(tokenId));

      if (tokensToLoad.length === 0) return;

      console.log(`Loading previews for ${tokensToLoad.length} tokens...`);

      // First, try to load from localStorage cache
      const cacheKey = `token_previews_${contractData.contractAddress}`;
      const cachedData = localStorage.getItem(cacheKey);
      let cache = cachedData ? JSON.parse(cachedData) : {};
      
      // Check cache expiration (24 hours)
      const cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      const now = Date.now();
      const isCacheValid = cache.timestamp && (now - cache.timestamp) < cacheExpiry;

      if (isCacheValid && cache.previews) {
        console.log(`📦 Loading ${Object.keys(cache.previews).length} cached previews from localStorage`);
        
        // Load cached previews
        Object.entries(cache.previews).forEach(([tokenId, svgContent]) => {
          const tokenIdNum = parseInt(tokenId);
          if (!tokenPreviews.has(tokenIdNum) && isMounted) {
            const blob = new Blob([svgContent as string], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            
            setTokenPreviews(prev => {
              const newPreviews = new Map(prev);
              newPreviews.set(tokenIdNum, url);
              return newPreviews;
            });
          }
        });
      }

      // Load any missing tokens from network
      const missingTokens = tokensToLoad.filter(tokenId => {
        const tokenIdStr = tokenId.toString();
        return !cache.previews || !cache.previews[tokenIdStr];
      });

      if (missingTokens.length === 0) {
        console.log('✅ All previews loaded from cache');
        return;
      }

      console.log(`🌐 Loading ${missingTokens.length} missing previews from network...`);

      // Load missing tokens with a small delay between requests
      for (const tokenId of missingTokens) {
        if (!isMounted) break;

        try {
          const { svg: svgContent, result } = await getTokenSVG(readOnlyContract, tokenId);
          if (result.success && isMounted) {
            // Convert SVG string to data URL for img tag
            const blob = new Blob([svgContent], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);

            setTokenPreviews(prev => {
              const newPreviews = new Map(prev);
              newPreviews.set(tokenId, url);
              return newPreviews;
            });

            // Update cache
            if (!cache.previews) cache.previews = {};
            cache.previews[tokenId.toString()] = svgContent;
            cache.timestamp = now;
            
            // Save to localStorage (throttled to avoid excessive writes)
            if (missingTokens.indexOf(tokenId) % 5 === 0) { // Save every 5 tokens
              try {
                localStorage.setItem(cacheKey, JSON.stringify(cache));
              } catch (error) {
                console.warn('Failed to save to localStorage:', error);
              }
            }
          }
        } catch (error) {
          console.error(`Error loading preview for token ${tokenId}:`, error);
        }

        // Small delay to prevent overwhelming the network
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Final save to localStorage
      try {
        localStorage.setItem(cacheKey, JSON.stringify(cache));
        console.log('💾 Saved previews to localStorage cache');
      } catch (error) {
        console.warn('Failed to save final cache to localStorage:', error);
      }
    };

    loadTokenPreviews();

    return () => {
      isMounted = false;
    };
  }, [readOnlyContract, contractData?.tokenCount]); // Only depend on tokenCount, not entire contractData or tokenPreviews

  // Cleanup preview URLs on unmount
  useEffect(() => {
    console.log('🔍 [Home.tsx] useEffect - cleanupTokenPreviews');
    return () => {
      tokenPreviews.forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
  }, [tokenPreviews]);

  // Function to clear localStorage cache (useful for debugging or force refresh)
  const clearPreviewCache = () => {
    if (contractData?.contractAddress) {
      const cacheKey = `token_previews_${contractData.contractAddress}`;
      localStorage.removeItem(cacheKey);
      console.log('🗑️ Cleared preview cache');
      // Clear current previews to force reload
      setTokenPreviews(new Map());
    }
  };

  // Expose cache clearing function to window for debugging
  useEffect(() => {
    (window as any).clearPreviewCache = clearPreviewCache;
    return () => {
      delete (window as any).clearPreviewCache;
    };
  }, [contractData?.contractAddress]);

  // Function to update token count when mint events are received
  const handleTokenMinted = (tokenId: bigint, to: string, qty: bigint) => {
    console.log('🔍 [Home.tsx] handleTokenMinted function called');
    console.log('🎨 [Home.tsx] Token minted callback received:', { 
      tokenId: tokenId.toString(), 
      to, 
      qty: qty.toString() 
    });
    
    console.log('🔍 [Home.tsx] Current contractData before update:', contractData);
    
    // Update contract data by incrementing token count
    setContractData(prevData => {
      console.log('🔍 [Home.tsx] setContractData called with prevData:', prevData);
      
      if (!prevData) {
        console.warn('⚠️ No contract data available for mint event update');
        return prevData;
      }
      
      const quantityMinted = Number(qty);
      const newTokenCount = prevData.tokenCount + quantityMinted;
      console.log(`📈 Token count incremented: ${prevData.tokenCount} + ${quantityMinted} = ${newTokenCount}`);
      
      const updatedData = {
        ...prevData,
        tokenCount: newTokenCount
      };
      
      console.log('🔍 [Home.tsx] Updated contractData:', updatedData);
      
      // Also refresh contract data from blockchain as a fallback
      setTimeout(async () => {
        try {
          const { data, result } = await getContractData(readOnlyContract);
          if (result.success && data) {
            console.log('🔄 Fallback: Refreshed contract data from blockchain:', data);
            setContractData(data);
          }
        } catch (error) {
          console.warn('⚠️ Fallback contract data refresh failed:', error);
        }
      }, 2000); // Wait 2 seconds then refresh from blockchain
      
      return updatedData;
    });
    
    console.log('✅ [Home.tsx] handleTokenMinted function completed');
  };

  // Handle save request from SVG
  const handleSaveRequest = (data: { artData: any[] | string, saveType: 'set' | 'append' }) => {
    console.log('🎨 [Home.tsx] SAVE_REQUEST received:', { type: 'SAVE_REQUEST', data });
    console.log('🔍 [Home.tsx] handleSaveRequest called with:', data);
    
    // Parse artData if it's a JSON string
    let parsedArtData: ContractObject[] = [];
    
    if (typeof data.artData === 'string') {
      try {
        parsedArtData = JSON.parse(data.artData);
        console.log('✅ [Home.tsx] Parsed JSON artData:', parsedArtData.length, 'objects');
      } catch (error) {
        console.error('❌ [Home.tsx] Failed to parse artData JSON:', error);
        parsedArtData = [];
      }
    } else if (Array.isArray(data.artData)) {
      parsedArtData = data.artData;
      console.log('✅ [Home.tsx] Using array artData:', parsedArtData.length, 'objects');
    } else {
      console.warn('⚠️ [Home.tsx] artData is neither string nor array:', data.artData);
      parsedArtData = [];
    }
    
    const saveRequest = {
      artData: parsedArtData,
      saveType: data.saveType
    };
    
    console.log('📝 [Home.tsx] Setting saveRequestData:', saveRequest);
    setSaveRequestData(saveRequest);
  };

  // Handle successful save
  const handleSaveSuccess = () => {
    console.log('✅ [Home.tsx] Save successful, reloading SVG and thumbnail');
    setSaveRequestData(null); // Clear pending request
    setSaveStatus('Art saved successfully!');
    setTimeout(() => setSaveStatus(''), 3000);
    console.log('✅ [Home.tsx] Save status:', saveStatus);
    
    // Reload thumbnail for the current token
    if (activeToken > 0 && readOnlyContract) {
      reloadTokenThumbnail(activeToken);
    }
  };

  // Reload thumbnail for a specific token
  const reloadTokenThumbnail = async (tokenId: number) => {
    if (!readOnlyContract) return;
    
    try {
      console.log(`🖼️ [Home.tsx] Reloading thumbnail for token #${tokenId}`);
      const { svg: svgContent, result } = await getTokenSVG(readOnlyContract, tokenId);
      if (result.success) {
        // Clean up old URL if it exists
        const oldUrl = tokenPreviews.get(tokenId);
        if (oldUrl) {
          URL.revokeObjectURL(oldUrl);
        }
        
        // Create new preview URL
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        setTokenPreviews(prev => {
          const newPreviews = new Map(prev);
          newPreviews.set(tokenId, url);
          return newPreviews;
        });
        
        console.log(`✅ [Home.tsx] Thumbnail reloaded for token #${tokenId}`);
      } else {
        console.error(`❌ [Home.tsx] Failed to reload thumbnail for token #${tokenId}:`, result.error);
      }
    } catch (error) {
      console.error(`❌ [Home.tsx] Error reloading thumbnail for token #${tokenId}:`, error);
    }
  };

  // Auto-handle save requests when data changes
  useEffect(() => {
    console.log('🔄 [Home.tsx] useEffect triggered with state:', {
      saveRequestData: !!saveRequestData,
      writeContract: !!writeContract,
      account: !!account,
      activeToken: activeToken,
      isSaving: isSaving
    });
    
    if (saveRequestData && writeContract && account && activeToken > 0 && !isSaving) {
      console.log('✅ [Home.tsx] All conditions met, calling handleSaveRequest');
      handleSaveRequest(saveRequestData);
    } else {
      console.log('❌ [Home.tsx] Conditions not met for auto-save:', {
        hasSaveRequest: !!saveRequestData,
        hasWriteContract: !!writeContract,
        hasAccount: !!account,
        hasValidToken: activeToken > 0,
        notSaving: !isSaving
      });
    }
  }, [saveRequestData, writeContract, account, activeToken, isSaving]);

  // Handle save execution
  const executeSave = async (data: { artData: ContractObject[], saveType: 'set' | 'append' }) => {
    if (!writeContract || !account || !activeToken || activeToken === 0) {
      console.error('❌ [Home.tsx] Prerequisites not met for save:', {
        writeContract: !!writeContract,
        account: !!account,
        activeToken: activeToken
      });
      setSaveStatus('Cannot save: Missing requirements');
      return;
    }

    setIsSaving(true);
    setSaveStatus(`${data.saveType === 'set' ? 'Setting' : 'Appending'} art...`);

    try {
      console.log(`🔗 [Home.tsx] Starting ${data.saveType} transaction...`);
      
      let result: ConnectionResult;
      
      if (data.saveType === 'set') {
        console.log('📝 [Home.tsx] Calling setArt with:', { tokenId: activeToken, artDataLength: data.artData.length });
        result = await setArt(writeContract, activeToken, data.artData);
        console.log('📝 [Home.tsx] setArt result:', result);
      } else {
        console.log('➕ [Home.tsx] Calling appendArt with:', { tokenId: activeToken, artDataLength: data.artData.length });
        result = await appendArt(writeContract, activeToken, data.artData);
        console.log('➕ [Home.tsx] appendArt result:', result);
      }

      if (result.success) {
        console.log('✅ [Home.tsx] Transaction successful!', result.data);
        setSaveStatus(`Art ${data.saveType === 'set' ? 'set' : 'appended'} successfully!`);
        handleSaveSuccess();
      } else {
        console.error('❌ [Home.tsx] Transaction failed:', result.error);
        setSaveStatus(result.error || `Failed to ${data.saveType} art`);
      }
    } catch (error) {
      console.error('❌ [Home.tsx] Exception during save:', error);
      setSaveStatus(`Error saving to blockchain: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Execute save when saveRequestData changes
  useEffect(() => {
    console.log('🔍 [Home.tsx] useEffect - executeSave');
    if (saveRequestData && writeContract && account && activeToken > 0 && !isSaving) {
      executeSave(saveRequestData);
    }
  }, [saveRequestData, writeContract, account, activeToken, isSaving]);

  // Listen for messages from SVG (like in App.tsx)
  useEffect(() => {
    console.log('🔍 [Home.tsx] useEffect - handleMessage');
    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data;
      
      if (type === 'SAVE_REQUEST') {
        console.log('🎨 [Home.tsx] SAVE_REQUEST received from SVG:', { type, data });
        handleSaveRequest(data);
      } else if (type === 'OBJECT_ADDED') {
        console.log('📝 [Home.tsx] OBJECT_ADDED received:', data);
        // Update current objects when new object is added
        const { artData } = data;
        if (artData && artData.diff) {
          try {
            const diffObjects = typeof artData.diff === 'string' 
              ? JSON.parse(artData.diff) 
              : artData.diff;
            
            if (Array.isArray(diffObjects) && diffObjects.length > 0) {
              console.log('📝 [Home.tsx] Processing diff objects:', diffObjects.length);
              // For append operations, add to current objects
              if (artData.saveType === 'append') {
                // Handle append logic if needed
                console.log('➕ [Home.tsx] Append operation detected');
              } else {
                // For set operations, replace current objects
                console.log('🔄 [Home.tsx] Set operation detected');
              }
            }
          } catch (error) {
            console.error('❌ [Home.tsx] Failed to parse OBJECT_ADDED data:', error);
          }
        }
      } else if (type === 'CLEAR_REQUEST') {
        console.log('🗑️ [Home.tsx] CLEAR_REQUEST received');
        // Reset objects when canvas is cleared
      } else if (type === 'LOAD_DATA') {
        console.log('📂 [Home.tsx] LOAD_DATA received:', data);
        // Update objects when data is loaded
        const { artData } = data;
        if (Array.isArray(artData)) {
          console.log('📂 [Home.tsx] Loading art data:', artData.length, 'objects');
        }
      }
    };

    console.log('👂 [Home.tsx] Setting up message listener');
    window.addEventListener('message', handleMessage);
    return () => {
      console.log('🔇 [Home.tsx] Removing message listener');
      window.removeEventListener('message', handleMessage);
    };
  }, []); // Empty dependency array like in App.tsx


  const appTitle = () => {
    return `ColourMeNFT - ${activeToken}.svg`;
  };

  return (
    <div className="home-container">
      <Navbar setIsShill2EarnOpen={setIsShill2EarnOpen} />

      <section id="title" className="page-header">
        <h1>Colour Me NFT</h1>
        <p>Create, colour, and mint your digital artwork on {contractData?.chain?.name || 'Mainnet'}</p>
      </section>

      <About
        mintPrice={contractData?.mintPrice || 'FREE'}
        chainName={contractData?.chain?.name || 'Mainnet'}
        setIsShill2EarnOpen={setIsShill2EarnOpen}
      />

      <Mint
        contractData={contractData}
        activeToken={activeToken}
        readOnlyContract={readOnlyContract}
        setActiveToken={setActiveToken}
        refreshContractData={refreshContractData}
        setAccount={setAccount}
        onTokenMinted={handleTokenMinted}
      />
      {console.log('🔍 [Home.tsx] Passing handleTokenMinted to Mint:', { 
        hasCallback: !!handleTokenMinted,
        callbackType: typeof handleTokenMinted 
      })}

      {/* Main App Window */}
      <ColourMeApp
        appTitle={appTitle()}
        activeToken={activeToken}
        account={account}
        handleSaveRequest={handleSaveRequest}
      />

      {/* Token Explorer */}
      <TokenExplorer
        activeToken={activeToken}
        onTokenSelect={setActiveToken}
        tokenCount={contractData?.tokenCount || 0}
        tokenPreviews={tokenPreviews}
        contract={readOnlyContract}
        onLoadMoreTokens={loadTokenPreviewsBatch}
      />
      
      <Overview contractData={contractData} />

      {/* Footer */}
      <footer className="footer">
        <p>
          <strong>💰 Mint Price: {contractData?.mintPrice} </strong> • <strong>👑 5% Royalties</strong> to support TechnicallyWeb3 projects
        </p>
        <p className="footer-subtitle">
          Built with ❤️ for the Web3 community • Powered by {contractData?.chain?.name || 'Mainnet'}
        </p>
        <p className="footer-promo">
          <a href="https://stan.store/technicallyweb3/p/lifetime-web-hosting" target="_blank" rel="noopener noreferrer">
            Host your website on the blockchain and stop paying monthly fees!
          </a>
        </p>
      </footer>

      {/* Shill2Earn Popup */}
      <Shill2Earn 
        isOpen={isShill2EarnOpen} 
        onClose={() => setIsShill2EarnOpen(false)}
        contractData={contractData}
      />
    </div>
  );
};

export default Home;