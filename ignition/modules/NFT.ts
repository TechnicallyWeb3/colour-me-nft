import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import * as fs from "fs";
import * as path from "path";

const NFTModule = buildModule("NFTModule", (m) => {
    const name = m.getParameter("name", "Colour Me NFT");
    const symbol = m.getParameter("symbol", "CMNFT");
    const baseURL = m.getParameter("baseURL", "https://colourmenft.xyz/");
    const maxSupply = m.getParameter("maxSupply", 10000);
    const owner = m.getParameter("owner", m.getAccount(0));
    const royalty = m.getParameter("royalty", 500);

    const cmr = m.contract("ColourMeRenderer");
    const nft = m.contract("ColourMeNFT", [name, symbol, baseURL, maxSupply, cmr, owner, royalty]);

    const svgStart = '0x' + fs.readFileSync(path.join(__dirname, "../../assets/colour-me.min.start.svg")).toString('hex');
    const svgEnd = '0x' + fs.readFileSync(path.join(__dirname, "../../assets/colour-me.min.end.svg")).toString('hex');

    // Initialize the contract with any required setup
    m.call(nft, "setSVG", [svgStart, svgEnd]);

    return { nft, cmr };
});

export default NFTModule;