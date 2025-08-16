import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-build";

// Import tasks
import "./tasks/reset-svg";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
};

export default config;
