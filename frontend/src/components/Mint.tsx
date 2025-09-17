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
}

const Mint: React.FC<MintProps> = ({ contractData, activeToken, readOnlyContract, setActiveToken, refreshContractData, setAccount }) => {
    return (
      <Window id="mint" title="Mint - colourmenft.xyz" icon="🌐" buttonset={{ minimize: "", expand: "", close: "" }}>
        <TokenAddressBar contractAddress={contractData?.contractAddress || ''} tokenId={activeToken} />
        <WebsiteContent 
          contractData={contractData}
          contract={readOnlyContract}
          onMintSuccess={(tokenId) => {
            setActiveToken(tokenId);
          }}
          onContractDataUpdate={refreshContractData}
          onAccountChange={setAccount}
        />
      </Window>
    );
};

export default Mint;