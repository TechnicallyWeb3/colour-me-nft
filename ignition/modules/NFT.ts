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
    
    // New constructor parameters
    const mintPrice = m.getParameter("mintPrice", 250000000000000); // 0.00025 ETH by default
    const mintLimit = m.getParameter("mintLimit", 10); // 10 tokens per transaction
    // Set mint start to current time minus 1 hour to ensure minting is active
    const now = Math.floor(Date.now() / 1000);
    const mintStart = m.getParameter("mintStart", now + 3600); // Started 1 hour ago by default
    const mintDuration = m.getParameter("mintDuration", 7 * 24 * 60 * 60); // 1 week in seconds

    const cmr = m.contract("ColourMeRenderer");
    const nft = m.contract("ColourMeNFT", [name, symbol, baseURL, maxSupply, cmr, owner, royalty, mintPrice, mintLimit, mintStart, mintDuration]);

    const svgStart = '0x' + fs.readFileSync(path.join(__dirname, "../../assets/colour-me.min.start.svg")).toString('hex');
    const svgEnd = '0x' + fs.readFileSync(path.join(__dirname, "../../assets/colour-me.min.end.svg")).toString('hex');

    // Initialize the contract with any required setup
    m.call(nft, "setSVG", [svgStart, svgEnd]);

    return { nft, cmr };
});

export default NFTModule;