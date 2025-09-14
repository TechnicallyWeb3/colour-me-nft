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
    base: {
      url: "https://base-rpc.publicnode.com",
      accounts: {
        mnemonic: process.env.OWNER_MNEMONIC,
      },
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      base: process.env.BASESCAN_API_KEY || "",
    },
  },
};

export default config;
