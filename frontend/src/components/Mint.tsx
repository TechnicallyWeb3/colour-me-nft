import React from 'react';
import './Mint.css';
import Window from './Window';
import TokenAddressBar from './TokenAddressBar';
import WebsiteContent from './WebsiteContent';
import type { ColourMeNFT } from '../typechain-types';
import type { ContractData } from '../utils/blockchain';

interface MintProps {
    contractData: ContractData | null;
    activeToken: number;
    readOnlyContract: ColourMeNFT | null;
    setActiveToken: (tokenId: number) => void;
    refreshContractData: () => void;
    setAccount: (account: string) => void;
    onTokenMinted?: (tokenId: bigint, to: string, qty: bigint) => void;
  }

const Mint: React.FC<MintProps> = ({ contractData, activeToken, readOnlyContract, setActiveToken, refreshContractData, setAccount, onTokenMinted }) => {
  console.log('🔍 [Mint] Props received:', { 
    hasOnTokenMinted: !!onTokenMinted,
    onTokenMintedType: typeof onTokenMinted
  });
    return (
      <Window id="mint" title="Mint - colourmenft.xyz" icon="🌐" buttonset={{ minimize: "", expand: "", close: "" }}>
        <TokenAddressBar contractAddress={contractData?.contractAddress || ''} tokenId={activeToken} />
        <WebsiteContent 
          contractData={contractData}
          contract={readOnlyContract}
          onMintSuccess={(tokenId) => {setActiveToken(tokenId)}}
          onContractDataUpdate={refreshContractData}
          onAccountChange={setAccount}
          onTokenMinted={onTokenMinted}
        />
      </Window>
    );
};

export default Mint;