import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import * as fs from "fs";
import * as path from "path";

const NFTModule = buildModule("NFTModule", (m) => {
    const name = m.getParameter("name", "PaintCanvas");
    const symbol = m.getParameter("symbol", "PAINTCAN");
    const baseURL = m.getParameter("baseURL", "https://paintcan.xyz/");
    const maxSupply = m.getParameter("maxSupply", 10000);
    const owner = m.getParameter("owner", m.getAccount(0));

    const cmr = m.contract("ColourMeRenderer");
    const nft = m.contract("ColourMeNFT", [name, symbol, baseURL, maxSupply, cmr, owner]);

    const svgStart = '0x' + fs.readFileSync(path.join(__dirname, "../../assets/colour-me.min.start.svg")).toString('hex');
    const svgEnd = '0x' + fs.readFileSync(path.join(__dirname, "../../assets/colour-me.min.end.svg")).toString('hex');

    // Initialize the contract with any required setup
    m.call(nft, "setSVG", [svgStart, svgEnd]);

    return { nft, cmr };
});

export default NFTModule;