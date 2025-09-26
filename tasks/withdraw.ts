import { task } from "hardhat/config";
import { ethers } from "hardhat";

task("withdraw", "Withdraw funds from a ColourMeNFT contract")
  .addParam("contract", "The ColourMeNFT contract address")
  .setAction(async (taskArgs, hre) => {
    const { contract } = taskArgs;
    
    console.log(`Withdrawing funds from contract: ${contract}`);
    
    try {
      // Get the contract instance
      const ColourMeNFT = await hre.ethers.getContractFactory("ColourMeNFT");
      const nftContract = ColourMeNFT.attach(contract);
      
      // Get the contract balance before withdrawal
      const contractBalance = await hre.ethers.provider.getBalance(contract);
      console.log(`Contract balance before withdrawal: ${hre.ethers.formatEther(contractBalance)} ETH`);
      
      // Get the owner address
      const owner = await nftContract.owner();
      console.log(`Contract owner: ${owner}`);
      
      // Get the current signer (should be the owner for withdrawal)
      const [signer] = await hre.ethers.getSigners();
      console.log(`Current signer: ${await signer.getAddress()}`);
      
      // Check if the signer is the owner
      if (await signer.getAddress() !== owner) {
        console.error(`Error: Current signer (${await signer.getAddress()}) is not the contract owner (${owner})`);
        console.error("Only the contract owner can withdraw funds.");
        process.exit(1);
      }
      
      // Check if there are funds to withdraw
      if (contractBalance === 0n) {
        console.log("No funds to withdraw. Contract balance is 0 ETH.");
        return;
      }
      
      // Get owner balance before withdrawal
      const ownerBalanceBefore = await hre.ethers.provider.getBalance(owner);
      console.log(`Owner balance before withdrawal: ${hre.ethers.formatEther(ownerBalanceBefore)} ETH`);
      
      // Perform the withdrawal
      console.log("Executing withdrawal transaction...");
      const tx = await nftContract.withdraw();
      console.log(`Transaction hash: ${tx.hash}`);
      
      // Wait for the transaction to be mined
      console.log("Waiting for transaction to be mined...");
      const receipt = await tx.wait();
      console.log(`Transaction mined in block: ${receipt?.blockNumber}`);
      
      // Check balances after withdrawal
      const contractBalanceAfter = await hre.ethers.provider.getBalance(contract);
      const ownerBalanceAfter = await hre.ethers.provider.getBalance(owner);
      
      console.log(`Contract balance after withdrawal: ${hre.ethers.formatEther(contractBalanceAfter)} ETH`);
      console.log(`Owner balance after withdrawal: ${hre.ethers.formatEther(ownerBalanceAfter)} ETH`);
      
      const withdrawnAmount = ownerBalanceAfter - ownerBalanceBefore;
      console.log(`Total withdrawn amount: ${hre.ethers.formatEther(withdrawnAmount)} ETH`);
      
      console.log("Withdrawal completed successfully!");
      
    } catch (error) {
      console.error("Error during withdrawal:", error);
      
      // Provide helpful error messages for common issues
      if (error instanceof Error) {
        if (error.message.includes("Ownable: caller is not the owner")) {
          console.error("Error: You are not the owner of this contract. Only the contract owner can withdraw funds.");
        } else if (error.message.includes("insufficient funds")) {
          console.error("Error: Insufficient funds for gas fees.");
        } else if (error.message.includes("network")) {
          console.error("Error: Network connection issue. Please check your network configuration.");
        }
      }
      
      process.exit(1);
    }
  });
