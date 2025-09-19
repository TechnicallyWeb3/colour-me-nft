import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import * as fs from "fs";
import * as path from "path";
import { parseEther } from "ethers";

const NFTModule = buildModule("NFTModule", (m) => {
    const name = m.getParameter("name", "Colour Me NFT");
    const symbol = m.getParameter("symbol", "COLOUR");
    const baseURL = m.getParameter("baseURL", "https://colourmenft.xyz/");
    const maxSupply = m.getParameter("maxSupply", 10000);
    const owner = m.getParameter("owner", m.getAccount(0));
    const royalty = m.getParameter("royalty", 500);
    
    // New constructor parameters
    const mintPrice = m.getParameter("mintPrice", parseEther("4")); // 4 POL by default
    const mintLimit = m.getParameter("mintLimit", 10); // 10 tokens per transaction
    // Set mint start to current time minus 1 hour to ensure minting is active
    const defaultDate = Math.floor(new Date('2025-10-01T12:00:00-04:00').getTime() / 1000); // October 1st 2025 12:00:00 Eastern
    const mintStart = m.getParameter("mintStart", defaultDate + 3600); // Started 1 hour later by default
    const mintDuration = m.getParameter("mintDuration", 14 * 24 * 60 * 60); // 2 weeks in seconds

    const cmr = m.contract("ColourMeRenderer");
    const nft = m.contract("ColourMeNFT", [name, symbol, baseURL, maxSupply, cmr, owner, royalty, mintPrice, mintLimit, mintStart, mintDuration]);

    const svgStart = '0x' + fs.readFileSync(path.join(__dirname, "../../assets/colour-me.min.start.svg")).toString('hex');
    const svgEnd = '0x' + fs.readFileSync(path.join(__dirname, "../../assets/colour-me.min.end.svg")).toString('hex');

    // Initialize the contract with any required setup
    m.call(nft, "setSVG", [svgStart, svgEnd]);

    return { nft, cmr };
});

export default NFTModule;