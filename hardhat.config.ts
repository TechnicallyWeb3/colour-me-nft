import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-build";
import * as dotenv from "dotenv";

dotenv.config();

// Import tasks
import "./tasks/reset-svg";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    sepolia: {
      url: "https://ethereum-sepolia-rpc.publicnode.com",
      accounts: {
        mnemonic: process.env.OWNER_MNEMONIC,
      },
    },
    polygon: {
      url: "https://polygon-rpc.publicnode.com",
      accounts: {
        mnemonic: process.env.OWNER_MNEMONIC,
      },
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      polygon: process.env.POLYGONSCAN_API_KEY || "",
    },
  },
};

export default config;
