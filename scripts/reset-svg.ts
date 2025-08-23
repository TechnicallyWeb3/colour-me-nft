import { ethers } from "hardhat";
import { readFileSync } from "fs";
import { join } from "path";
import { HardhatRuntimeEnvironment } from "hardhat/types";

export default async function resetSvgData(
  contractAddress: string,
  startSvgFile: string = "assets/colour-me.min.start.svg",
  endSvgFile: string = "assets/colour-me.min.end.svg",
  hre?: HardhatRuntimeEnvironment
) {
  const hardhat = hre || require("hardhat");
  const { ethers: hreEthers } = hardhat;
  
  console.log(`Resetting SVG data for contract: ${contractAddress}`);
  console.log(`Using start file: ${startSvgFile}`);
  console.log(`Using end file: ${endSvgFile}`);
  
  try {
    // Read SVG files
    const svgStart = readFileSync(join(process.cwd(), startSvgFile), 'utf8');
    const svgEnd = readFileSync(join(process.cwd(), endSvgFile), 'utf8');
    
    console.log(`Start SVG size: ${svgStart.length} characters`);
    console.log(`End SVG size: ${svgEnd.length} characters`);
    
    // Get signer
    const [signer] = await hreEthers.getSigners();
    console.log(`Using signer: ${signer.address}`);
    
    // Get contract instance
    const ColourMeNFT = await hreEthers.getContractFactory("ColourMeNFT");
    const contractInstance = ColourMeNFT.attach(contractAddress);
    
    // Check if caller is owner
    const owner = await contractInstance.owner();
    if (owner !== signer.address) {
      throw new Error(`Caller ${signer.address} is not the contract owner ${owner}`);
    }

    const tokenCount = await contractInstance.tokenCount();
    if (tokenCount > 0) {
      const svgExample = await contractInstance.tokenSVG(1);
      if (!svgExample.startsWith(svgStart) || !svgExample.endsWith(svgEnd)) {
    
        console.log("Calling setSVG function...");
        
        // Convert SVG strings to bytes
        const svgStartBytes = hreEthers.toUtf8Bytes(svgStart);
        const svgEndBytes = hreEthers.toUtf8Bytes(svgEnd);
        
        // Call setSVG function
        const tx = await contractInstance.setSVG(svgStartBytes, svgEndBytes);
        console.log(`Transaction hash: ${tx.hash}`);
        
        // Wait for confirmation
        const receipt = await tx.wait();
        console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
        
        // Verify the update
        const newSvgStart = await contractInstance.svgStart();
        const newSvgEnd = await contractInstance.svgEnd();
        
        console.log("SVG data updated successfully!");
        console.log(`New start SVG size: ${(newSvgStart.length - 2) / 2} bytes`);
        console.log(`New end SVG size: ${(newSvgEnd.length - 2) / 2} bytes`);
        // -2 because of the "0x" prefix and / 2 because of the bytes
        
        return { svgStart: newSvgStart, svgEnd: newSvgEnd };
      } else {
        console.log("Skipping reset, SVG data already set correctly");
      }
    } else {
      console.log("Skipping reset, no tokens minted yet");
    }
    
  } catch (error) {
    console.error("Error resetting SVG data:", error);
    throw error;
  }
}

// Main function for standalone execution
async function main() {
  // Configuration
  const CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  
  if (!CONTRACT_ADDRESS) {
    throw new Error("CONTRACT_ADDRESS environment variable is required");
  }
  
  try {
    await resetSvgData(CONTRACT_ADDRESS);
  } catch (error) {
    console.error("Error in main:", error);
    process.exit(1);
  }
}

// Handle script execution only when run directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
