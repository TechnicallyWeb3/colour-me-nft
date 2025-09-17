import Window from './Window';
import SVGDisplay from './SVGDisplay';

interface ColourMeAppProps {
  appTitle: string;
  activeToken: number;
  account: string;
  handleSaveRequest: (data: { artData: any[], saveType: 'set' | 'append' }) => void;
}

const ColourMeApp: React.FC<ColourMeAppProps> = ({ appTitle, activeToken, account, handleSaveRequest }) => {
  // const [saveStatus, setSaveStatus] = useState<string>('');

  return (
    <Window id="app" title={appTitle} icon="🎨" buttonset={{ minimize: "", expand: "", close: "" }}>
      <div className="app-content-area">
        <SVGDisplay
          tokenId={activeToken || undefined}
          account={account}
          onSaveRequest={handleSaveRequest}
          width={1000}
          height={1000}
        />
        {/* Save Status Display */}
        {/* {saveStatus && (
          <div className="save-status">
            {saveStatus}
          </div>
        )} */}
      </div>
    </Window>
  )
};

export default ColourMeApp;