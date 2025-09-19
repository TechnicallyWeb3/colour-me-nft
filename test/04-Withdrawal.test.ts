import { expect } from "chai";
import { ethers } from "hardhat";
import { ColourMeNFT, ColourMeRenderer } from "../typechain-types";

describe("ColourMeNFT Withdrawal Tests", function () {
  let nft: ColourMeNFT;
  let renderer: ColourMeRenderer;
  let owner: any;
  let user1: any;
  let user2: any;
  let user3: any;
  
  const MINT_PRICE = ethers.parseEther("0.1"); // 0.1 ETH per token
  const MAX_SUPPLY = 100;
  const MINT_LIMIT = 10;
  
  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();
    
    // Deploy renderer first
    const RendererFactory = await ethers.getContractFactory("ColourMeRenderer");
    renderer = await RendererFactory.deploy() as unknown as ColourMeRenderer;
    await renderer.waitForDeployment();
    
    // Deploy NFT contract with minting cost and 100 max supply
    const NFTFactory = await ethers.getContractFactory("ColourMeNFT");
    const now = Math.floor(Date.now() / 1000);
    const mintStart = now - 3600; // Started 1 hour ago
    const mintDuration = 365 * 24 * 60 * 60; // 1 year duration
    
    nft = await NFTFactory.deploy(
      "ColourMe Withdrawal Test",
      "CMWT",
      "https://example.com/",
      MAX_SUPPLY, // 100 max supply
      await renderer.getAddress(),
      owner.address,
      250, // 2.5% royalty
      MINT_PRICE, // 0.1 ETH mint price
      MINT_LIMIT, // 10 per transaction
      mintStart, // mintStart (started 1 hour ago)
      mintDuration // mintDuration (1 year)
    ) as unknown as ColourMeNFT;
    await nft.waitForDeployment();
    
    // Set SVG data
    const svgStart = ethers.toUtf8Bytes('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">');
    const svgEnd = ethers.toUtf8Bytes('</svg>');
    await nft.setSVG(svgStart, svgEnd);
  });
  
  describe("Initial Setup", function () {
    it("Should have correct initial configuration", async function () {
      const [name, symbol, baseURL, tokenCount, maxSupply, mintPrice, mintLimit, mintStart, mintDuration] = await nft.getProjectInfo();
      
      expect(name).to.equal("ColourMe Withdrawal Test");
      expect(symbol).to.equal("CMWT");
      expect(maxSupply).to.equal(MAX_SUPPLY);
      expect(mintPrice).to.equal(MINT_PRICE);
      expect(mintLimit).to.equal(MINT_LIMIT);
      expect(tokenCount).to.equal(0);
    });
    
    it("Should have zero balance initially", async function () {
      expect(await ethers.provider.getBalance(await nft.getAddress())).to.equal(0);
    });
  });
  
  describe("Minting with Payment", function () {
    it("Should mint 10 tokens and collect payment", async function () {
      const mintQuantity = 10;
      const totalCost = MINT_PRICE * BigInt(mintQuantity);
      
      // Check initial balances
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      const contractBalanceBefore = await ethers.provider.getBalance(await nft.getAddress());
      
      // Mint 10 tokens
      await nft.mint(user1.address, mintQuantity, { value: totalCost });
      
      // Check balances after minting
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      const contractBalanceAfter = await ethers.provider.getBalance(await nft.getAddress());
      
      // Verify token count
      expect(await nft.tokenCount()).to.equal(mintQuantity);
      
      // Verify contract received payment
      expect(contractBalanceAfter).to.equal(contractBalanceBefore + totalCost);
      
      // Verify tokens were minted to user1
      for (let i = 1; i <= mintQuantity; i++) {
        expect(await nft.ownerOf(i)).to.equal(user1.address);
      }
    });
    
    it("Should reject minting with insufficient payment", async function () {
      const mintQuantity = 5;
      const insufficientPayment = MINT_PRICE * BigInt(mintQuantity) - ethers.parseEther("0.01"); // 0.01 ETH short
      
      await expect(
        nft.mint(user1.address, mintQuantity, { value: insufficientPayment })
      ).to.be.revertedWithCustomError(nft, "InsufficientPayment");
    });
  });
  
  describe("Withdrawal Access Control", function () {
    beforeEach(async function () {
      // Mint 10 tokens to fund the contract
      const mintQuantity = 10;
      const totalCost = MINT_PRICE * BigInt(mintQuantity);
      await nft.mint(user1.address, mintQuantity, { value: totalCost });
    });
    
    it("Should reject withdrawal from non-owner accounts", async function () {
      const contractBalance = await ethers.provider.getBalance(await nft.getAddress());
      expect(contractBalance).to.be.greaterThan(0);
      
      // Attempt withdrawal from user1 (not owner)
      await expect(
        nft.connect(user1).withdraw()
      ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
      
      // Attempt withdrawal from user2 (not owner)
      await expect(
        nft.connect(user2).withdraw()
      ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
      
      // Attempt withdrawal from user3 (not owner)
      await expect(
        nft.connect(user3).withdraw()
      ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
    });
    
    it("Should allow withdrawal from owner account", async function () {
      const contractBalanceBefore = await ethers.provider.getBalance(await nft.getAddress());
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      
      expect(contractBalanceBefore).to.be.greaterThan(0);
      
      // Owner withdraws funds
      const tx = await nft.withdraw();
      const receipt = await tx.wait();
      
      // Calculate gas cost
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;
      
      const contractBalanceAfter = await ethers.provider.getBalance(await nft.getAddress());
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      
      // Contract should be empty
      expect(contractBalanceAfter).to.equal(0);
      
      // Owner should have received the funds minus gas
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + contractBalanceBefore - gasCost);
    });
  });
  
  describe("Complete Minting and Withdrawal Cycle", function () {
    it("Should mint all 100 tokens in batches and allow multiple withdrawals", async function () {
      const batches = Math.ceil(MAX_SUPPLY / MINT_LIMIT); // 10 batches of 10 tokens each
      let totalMinted = 0;
      let totalWithdrawn = ethers.parseEther("0");
      
      // Track owner balance for withdrawal verification
      let ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      
      for (let batch = 0; batch < batches; batch++) {
        const remainingTokens = MAX_SUPPLY - totalMinted;
        const mintQuantity = Math.min(MINT_LIMIT, remainingTokens);
        const totalCost = MINT_PRICE * BigInt(mintQuantity);
        
        // Mint batch
        await nft.mint(user1.address, mintQuantity, { value: totalCost });
        totalMinted += mintQuantity;
        
        // Verify token count
        expect(await nft.tokenCount()).to.equal(totalMinted);
        
        // Every 2 batches (20 tokens), withdraw funds
        if ((batch + 1) % 2 === 0) {
          const contractBalance = await ethers.provider.getBalance(await nft.getAddress());
          expect(contractBalance).to.be.greaterThan(0);
          
          // Owner withdraws
          await nft.withdraw();
          
          // Verify contract is empty after withdrawal
          expect(await ethers.provider.getBalance(await nft.getAddress())).to.equal(0);
          
          totalWithdrawn += contractBalance;
          ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
        }
      }
      
      // Verify all tokens were minted
      expect(await nft.tokenCount()).to.equal(MAX_SUPPLY);
      
      // Final withdrawal of remaining funds
      const finalContractBalance = await ethers.provider.getBalance(await nft.getAddress());
      if (finalContractBalance > 0) {
        await nft.withdraw();
        totalWithdrawn += finalContractBalance;
      }
      
      // Verify contract is empty
      expect(await ethers.provider.getBalance(await nft.getAddress())).to.equal(0);
      
      // Verify total withdrawn amount matches expected
      const expectedTotal = MINT_PRICE * BigInt(MAX_SUPPLY);
      expect(totalWithdrawn).to.equal(expectedTotal);
    });
    
    it("Should handle edge case of exact batch sizes", async function () {
      // Test that we can mint exactly 10 batches of 10 tokens each
      const expectedBatches = 10;
      const tokensPerBatch = 10;
      
      for (let batch = 0; batch < expectedBatches; batch++) {
        const totalCost = MINT_PRICE * BigInt(tokensPerBatch);
        
        // Mint batch
        await nft.mint(user1.address, tokensPerBatch, { value: totalCost });
        
        // Verify we're on track
        const expectedTokenCount = (batch + 1) * tokensPerBatch;
        expect(await nft.tokenCount()).to.equal(expectedTokenCount);
      }
      
      // Verify we've reached max supply
      expect(await nft.tokenCount()).to.equal(MAX_SUPPLY);
      
      // Verify we can't mint more
      await expect(
        nft.mint(user1.address, 1, { value: MINT_PRICE })
      ).to.be.revertedWithCustomError(nft, "MintingClosed");
    });
  });
  
  describe("Withdrawal Edge Cases", function () {
    it("Should handle withdrawal when contract has zero balance", async function () {
      // Contract starts with zero balance
      expect(await ethers.provider.getBalance(await nft.getAddress())).to.equal(0);
      
      // Withdrawal should succeed but transfer nothing
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      
      const tx = await nft.withdraw();
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;
      
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      
      // Owner should only lose gas cost
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore - gasCost);
      
      // Contract should still be empty
      expect(await ethers.provider.getBalance(await nft.getAddress())).to.equal(0);
    });
    
    it("Should handle multiple rapid withdrawals", async function () {
      // Mint some tokens to fund contract
      const mintQuantity = 5;
      const totalCost = MINT_PRICE * BigInt(mintQuantity);
      await nft.mint(user1.address, mintQuantity, { value: totalCost });
      
      const contractBalance = await ethers.provider.getBalance(await nft.getAddress());
      expect(contractBalance).to.be.greaterThan(0);
      
      // First withdrawal
      await nft.withdraw();
      expect(await ethers.provider.getBalance(await nft.getAddress())).to.equal(0);
      
      // Second withdrawal should succeed but transfer nothing
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      const tx = await nft.withdraw();
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;
      
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore - gasCost);
    });
  });
});
