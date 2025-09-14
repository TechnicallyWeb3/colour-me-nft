import { task } from "hardhat/config";

task("reset-svg", "Reset SVG data in the ColourMeNFT contract")
  .addParam("contract", "The contract address")
  .addOptionalParam("start", "Path to SVG start file (default: assets/colour-me.min.start.svg)")
  .addOptionalParam("end", "Path to SVG end file (default: assets/colour-me.min.end.svg)")
  .setAction(async (taskArgs, hre) => {
    const { contract, start, end } = taskArgs;
    
    // Default file paths
    const startFile = start || "assets/colour-me.min.start.svg";
    const endFile = end || "assets/colour-me.min.end.svg";
    
    console.log(`Resetting SVG data for contract: ${contract}`);
    console.log(`Using start file: ${startFile}`);
    console.log(`Using end file: ${endFile}`);

    const { default: resetSvgData } = await import("../scripts/reset-svg");
    
    try {
      await resetSvgData(contract, startFile, endFile, hre);
      console.log("SVG data updated successfully!");
    } catch (error) {
      console.error("Error resetting SVG data:", error);
      process.exit(1);
    }
  });
