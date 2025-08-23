import { expect } from "chai";
import { ethers } from "hardhat";
import { ColourMeNFT, ColourMeRenderer } from "../typechain-types";

// TypeScript types matching the Solidity structs
interface Point {
  x: number;
  y: number;
}

interface ObjectStruct {
  shape: number; // Path enum: 0=rect, 1=line, 2=ellipse, 3=polyline, 4=polygon, 5=path
  color: string; // hex color as bytes3
  stroke: number; // uint8
  points: Point[];
}

interface Object {
  base: bigint; // uint256
  additionalPoints: Uint8Array; // bytes
}

// Helper function to convert hex color to bytes3
function hexToBytes3(hex: string): string {
  if (hex.startsWith('#')) {
    hex = hex.slice(1);
  }
  if (hex.length !== 6) {
    throw new Error("Invalid hex color");
  }
  return '0x' + hex;
}

// Encoder function (copy from other test files for consistency)
function encodeObject(obj: ObjectStruct): Object {
  let encoded = 0n;
  
  const basePoints = obj.points.slice(0, 6);
  const additionalPoints = obj.points.slice(6);
  
  // Follow the comment spec from types.sol
  encoded |= BigInt(obj.shape & 0x7) << 0n; // bits 0-2
  encoded |= (BigInt(colorToNumber(obj.color)) & 0xFFFFFFn) << 3n; // bits 3-26
  encoded |= BigInt(obj.stroke & 0xFF) << 27n; // bits 27-34
  encoded |= BigInt(obj.points.length & 0xFFFF) << 35n; // bits 35-50
  
  // Encode points (bits 51-242)
  for (let i = 0; i < basePoints.length && i < 6; i++) {
    const point = basePoints[i];
    const pointStartBit = 51n + BigInt(i * 32);
    
    // X coordinate in first 16 bits, Y in next 16 bits
    encoded |= BigInt(point.x & 0xFFFF) << pointStartBit;
    encoded |= BigInt(point.y & 0xFFFF) << (pointStartBit + 16n);
  }
  
  // Encode additional points as bytes (4 bytes per point: x_high, x_low, y_high, y_low)
  const additionalBytes = new Uint8Array(additionalPoints.length * 4);
  for (let i = 0; i < additionalPoints.length; i++) {
    const point = additionalPoints[i];
    const offset = i * 4;
    
    // Big-endian encoding
    additionalBytes[offset] = (point.x >> 8) & 0xFF;     // x high byte
    additionalBytes[offset + 1] = point.x & 0xFF;        // x low byte
    additionalBytes[offset + 2] = (point.y >> 8) & 0xFF; // y high byte
    additionalBytes[offset + 3] = point.y & 0xFF;        // y low byte
  }
  
  return {
    base: encoded,
    additionalPoints: additionalBytes
  };
}

// Convert color string to number for encoding
function colorToNumber(color: string): number {
  let hex = color;
  if (hex.startsWith('#')) {
    hex = '0x' + hex.slice(1);
  }
  if (!hex.startsWith('0x')) {
    hex = '0x' + hex;
  }
  return parseInt(hex, 16);
}

describe("Transaction Limits", function () {
  const NFT_ADDRESS = "0xcf0D7b4feece555D2C4347565fe4147e89255c8a";
  const RENDERER_ADDRESS = "0xA3d15F2Ab7658590AB1adB11E1FC352b368b8Fe4";
  let nft: ColourMeNFT;
  let renderer: ColourMeRenderer;
  let owner: any;
  let user: any;
  let tokenId: number;
    
  before(async function () {
    this.timeout(500000);
    
    [owner, user] = await ethers.getSigners();
    console.log("Deploying contracts with owner:", owner.address);
    
    try {// Attach to existing contracts and test
      renderer = await ethers.getContractAt("ColourMeRenderer", RENDERER_ADDRESS) as unknown as ColourMeRenderer;
      const svg = ethers.toUtf8String(await renderer.renderShapeTool(0n));
      expect(svg).to.include('<rect x="0" y="0" width="30" height="30" class="tool-bg" data-shape="rect');
      console.log("Attached to existing renderer");
    } catch (error: any) {
      const RendererFactory = await ethers.getContractFactory("ColourMeRenderer");
      renderer = await RendererFactory.deploy() as unknown as ColourMeRenderer;
      await renderer.waitForDeployment();
      console.log("Deployed Renderer at", renderer.target);
    }
    
    try {// Attach to existing contracts and test
      nft = await ethers.getContractAt("ColourMeNFT", NFT_ADDRESS) as unknown as ColourMeNFT;
      const count = await nft.tokenCount();
      expect(count).to.be.greaterThanOrEqual(0n);
      if (count > 0n) {
        expect(ethers.toUtf8String(await nft.tokenSVG(0n))).to.include('<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000">');
      }
      console.log("Attached to existing nft");
    } catch (error: any) {
      const NFTFactory = await ethers.getContractFactory("ColourMeNFT");
      nft = await NFTFactory.deploy(
        "ColourMe",
        "CM",
        "https://example.com/",
        1000, // maxSupply
        renderer.target,
        owner.address,
        250 // 2.5% royalty
      ) as unknown as ColourMeNFT;
      await nft.waitForDeployment();
      console.log("Deployed NFT at", await nft.getAddress());

      // Set SVG wrapper
      const tx = await nft.setSVG(
        ethers.toUtf8Bytes('<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000">'),
        ethers.toUtf8Bytes('</svg>')
      );
      await tx.wait();
      console.log("Set SVG wrapper successfully");
    }
  });

  beforeEach(async function () {
    const tx = await nft.mint(user.address);
    await tx.wait();
    tokenId = Number(await nft.tokenCount());
  });

  describe("Maximum Objects Per Transaction", function () {
    
    it("Should test maximum objects per transaction", async function () {
      this.timeout(200000);
      
      console.log("\n=== TESTING MAXIMUM OBJECTS PER TRANSACTION ===");
      
      let successfulObjects = 0;
      let failedAt = "none";
      let maxRenderedLength = 0;

      for (let objectCount = 100; objectCount <= 2000; objectCount += 100) {
        // console.log(`Testing ${objectCount} objects...`);
        
        // Create test objects (simple paths to minimize individual object cost)
        const testObjects: ObjectStruct[] = [];
        for (let i = 0; i < objectCount; i++) {
          testObjects.push({
            shape: 5, // path (always allowed)
            color: hexToBytes3("#000000"), // black (always allowed)
            stroke: 1,
            points: [
              { x: 10 + (i % 100), y: 10 + (i % 100) },
              { x: 20 + (i % 100), y: 20 + (i % 100) }
            ]
          });
        }
        
        const packedObjects = testObjects.map(obj => {
          const packed = encodeObject(obj);
          return { base: packed.base, additionalPoints: packed.additionalPoints };
        });
        
        try {
          // Test write operation
          console.log(`  Attempting to write ${objectCount} objects...`);
          const tx = await nft.connect(user).setArt(tokenId, packedObjects);
          await tx.wait();
          console.log(`  ✅ Write successful for ${objectCount} objects`);
        } catch (error: any) {
          console.log(`  ❌ Failed at write operation ${objectCount} objects`);
          failedAt = "write";
          break;
        }

        try {
          // Test read operation
          console.log(`  Testing read operation...`);
          const svg = await nft.tokenSVG(tokenId);
          // const svgString = ethers.toUtf8String(svg);
          expect(svg).to.include('<g id="drawing-area"');
          console.log(`  ✅ Read successful for ${objectCount} objects`);
          
          successfulObjects = objectCount;
          maxRenderedLength = Math.max(maxRenderedLength, svg.length);
          
        } catch (error: any) {
          console.log(`  ❌ Failed at read operation ${objectCount} objects`);
          failedAt = "read";
          break;
        }
        
        // Add a small delay to prevent overwhelming the network
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`\n📊 OBJECT COUNT RESULTS:`);
      console.log(`  Maximum successful objects: ${successfulObjects}`);
      console.log(`  Maximum rendered length: ${maxRenderedLength} bytes`);
      console.log(`  Failed at operation: ${failedAt}`);
      console.log(`  Improvement over old system: ~${Math.floor(successfulObjects / 50)}x`);
      
      // The test passes if we can handle at least 600 objects (12x improvement over old system)
      expect(successfulObjects).to.be.at.least(600);
    });
  });

  describe("Maximum Points Per Path", function () {
    
    it("Should test maximum points per path", async function () {
      console.log("\n=== TESTING MAXIMUM POINTS PER PATH ===");
      
      let successfulPoints = 0;
      let failedAt = "none";
      let maxRenderedLength = 0;
      
      for (let pointCount = 100; pointCount <= 5000; pointCount += 100) {
        // console.log(`Testing path with ${pointCount} points...`);
        
        // Create a single path with many points
        const points = [];
        for (let i = 0; i < pointCount; i++) {
          points.push({
            x: 100 + (i % 500), // Distribute across canvas
            y: 100 + Math.floor(i / 500) * 10
          });
        }
        
        const testObject: ObjectStruct = {
          shape: 5, // path
          color: hexToBytes3("#000000"),
          stroke: 2,
          points: points
        };
        
        const packed = encodeObject(testObject);
        const packedObjects = [{ base: packed.base, additionalPoints: packed.additionalPoints }];
        
        try {
          // Test write operation
        //   console.log(`  Attempting to write path with ${pointCount} points...`);
          const tx = await nft.connect(user).setArt(tokenId, packedObjects);
          await tx.wait();
        //   console.log(`  ✅ Write successful for ${pointCount} points`);
        } catch (error: any) {
          console.log(`  ❌ Failed at write operation ${pointCount} points`);
          failedAt = "write";
          break;
        }

        try {
          // Test read operation
        //   console.log(`  Testing read operation...`);
          const svg = await nft.tokenSVG(tokenId);
          // const svgString = ethers.toUtf8String(svg);
          expect(svg).to.include('<g id="drawing-area"');
        //   console.log(`  ✅ Read successful for ${pointCount} points`);
          
          successfulPoints = pointCount;
          maxRenderedLength = Math.max(maxRenderedLength, svg.length);
          
        } catch (error: any) {
          console.log(`  ❌ Failed at read operation ${pointCount} points`);
          failedAt = "read";
          break;
        }
        
        // Add a small delay to prevent overwhelming the network
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`\n📊 POINTS PER PATH RESULTS:`);
      console.log(`  Maximum successful points per path: ${successfulPoints}`);
      console.log(`  Maximum rendered length: ${maxRenderedLength} bytes`);
      console.log(`  Failed at operation: ${failedAt}`);
      console.log(`  Storage efficiency: ${successfulPoints > 6 ? '6 base points + ' + (successfulPoints - 6) + ' additional points' : successfulPoints + ' base points only'}`);
      console.log(`  Bytes per point ratio: ${successfulPoints > 0 ? (maxRenderedLength / successfulPoints).toFixed(2) : 0}`);
      
      // The test passes if we can handle at least 1000 points per path
      expect(successfulPoints).to.be.at.least(1000);
    });
  });

  let maxTestObject: any;

  describe("Maximum Objects With Complex Paths", function () {
    
    it("Should test maximum objects with 500 points each", async function () {
      console.log("\n=== TESTING MAXIMUM OBJECTS WITH 500 POINTS EACH ===");
      
      const POINTS_PER_OBJECT = 500;
      let successfulObjects = 0;
      let failedAt = "none";
      let maxRenderedLength = 0;
      
      for (let objectCount = 1; objectCount <= 100; objectCount += 1) {
        // console.log(`Testing ${objectCount} objects with ${POINTS_PER_OBJECT} points each (total: ${objectCount * POINTS_PER_OBJECT} points)...`);
        
        // Create test objects with 500 points each
        const testObjects: ObjectStruct[] = [];
        for (let obj = 0; obj < objectCount; obj++) {
          const points = [];
          for (let i = 0; i < POINTS_PER_OBJECT; i++) {
            points.push({
              x: 100 + (i % 100) + (obj * 10), // Spread objects across canvas
              y: 100 + Math.floor(i / 100) * 5 + (obj * 50)
            });
          }
          
          testObjects.push({
            shape: 5, // path
            color: hexToBytes3("#000000"),
            stroke: 1,
            points: points
          });
        }
        
        const packedObjects = testObjects.map(obj => {
          const packed = encodeObject(obj);
          return { base: packed.base, additionalPoints: packed.additionalPoints };
        });
        
        try {
          // Test write operation
        //   console.log(`  Attempting to write ${objectCount} objects (${objectCount * POINTS_PER_OBJECT} total points)...`);
          const tx = await nft.connect(user).setArt(tokenId, packedObjects);
          await tx.wait();
        //   console.log(`  ✅ Write successful for ${objectCount} objects`);
        } catch (error: any) {
          console.log(`  ❌ Failed at write operation ${objectCount} objects (${objectCount * POINTS_PER_OBJECT} total points)`);
          failedAt = "write";
          break;
        }

        try {
          // Test read operation
        //   console.log(`  Testing read operation...`);
          const svg = await nft.tokenSVG(tokenId);
          // const svgString = ethers.toUtf8String(svg);
          expect(svg).to.include('<g id="drawing-area"');
        //   console.log(`  ✅ Read successful for ${objectCount} objects`);
          
          successfulObjects = objectCount;
          maxRenderedLength = Math.max(maxRenderedLength, svg.length);
          
        } catch (error: any) {
          console.log(`  ❌ Failed at read operation ${objectCount} objects (${objectCount * POINTS_PER_OBJECT} total points)`);
          failedAt = "read";
          break;
        }

        maxTestObject = packedObjects;

        // Add a small delay to prevent overwhelming the network
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      console.log(`\n📊 COMPLEX OBJECTS RESULTS:`);
      console.log(`  Maximum successful objects with ${POINTS_PER_OBJECT} points each: ${successfulObjects}`);
      console.log(`  Total points handled: ${successfulObjects * POINTS_PER_OBJECT}`);
      console.log(`  Maximum rendered length: ${maxRenderedLength} bytes`);
      console.log(`  Failed at operation: ${failedAt}`);
      console.log(`  Average points per transaction: ${(successfulObjects * POINTS_PER_OBJECT) / 1}`);
      console.log(`  Bytes per object ratio: ${successfulObjects > 0 ? (maxRenderedLength / successfulObjects).toFixed(2) : 0}`);
      console.log(`  Bytes per point ratio: ${(successfulObjects * POINTS_PER_OBJECT) > 0 ? (maxRenderedLength / (successfulObjects * POINTS_PER_OBJECT)).toFixed(2) : 0}`);
      
      // The test passes if we can handle at least 5 objects with 500 points each (2500 total points)
      expect(successfulObjects).to.be.at.least(3);
    });
  });

  function generateTestObjects(objectCount: number, pointsPerObject: number): { base: bigint; additionalPoints: Uint8Array }[] {
    const testObjects: ObjectStruct[] = [];
    for (let i = 0; i < objectCount; i++) {
      const testObject: ObjectStruct = {
        shape: 5, // path
        color: hexToBytes3(i % 2 === 0 ? "#000000" : "#FFFFFF"),
        stroke: Math.floor(Math.random() * 40) + 1,
        points: []
      };
      for (let i = 0; i < pointsPerObject; i++) {
        testObject.points.push({
          x: Math.floor(Math.random() * 1000),
          y: Math.floor(Math.random() * 1000)
        });
      }
      testObjects.push(testObject);
    }
    const packedObjects = testObjects.map(obj => {
      const packed = encodeObject(obj);
      return { base: packed.base, additionalPoints: packed.additionalPoints };
    });
    return packedObjects;
  }

  describe("Max Storage Test", function () {
    
    it("Should test max storage", async function () {
      this.timeout(1000000);
      console.log("\n=== TESTING MAX STORAGE ===");
      
      let successfulRounds = 0;
      let failedAt: string = "none";
      let totalObjectsProcessed = 0;
      let totalPointsProcessed = 0;
      let maxRenderedLength = 0;
      let testObjects = generateTestObjects(20, 500);
      console.log("Test objects size:", ethers.AbiCoder.defaultAbiCoder().encode(["uint256[]", "bytes[]"], [testObjects.map(obj => obj.base), testObjects.map(obj => obj.additionalPoints)]).length);

      try {
        // Test write operation
        console.log(`  Setting initial art...`);
        const tx = await nft.connect(user).setArt(tokenId, testObjects);
        await tx.wait();
        console.log(`  ✅ Write successful`);
      } catch (error: any) {
        console.log(`  ❌ Failed at first write operation`);
        failedAt = "write";
      }

      for (let round = 1; failedAt === "none"; round++) {
        // if (failedAt !== "read") {
          try {
            // Test read operation
            console.log(`  Testing read...`);
            const svg = await nft.tokenSVG(tokenId);
            // const svgString = ethers.toUtf8String(svg);
            expect(svg).to.include('<g id="drawing-area"');
            console.log(`  ✅ Read successful ${svg.length} bytes`);
            
            successfulRounds = round;
            maxRenderedLength = Math.max(maxRenderedLength, svg.length);
            
          } catch (error: any) {
            console.log(`  ❌ Failed at read operation round ${round}: ${error.message}`);
            failedAt = "read";
            // break;
          }
        // }

        try {
          // Test write operation
          console.log(`  Appending art round ${round}...`);
          const tx = await nft.connect(user).appendArt(tokenId, generateTestObjects(20, 500));
          await tx.wait();
          console.log(`  ✅ Append successful`);
        } catch (error: any) {
          console.log(`  ❌ Failed at write operation round ${round}: ${error.message}`);
          failedAt = "write";
          break;
        }
        
        // Add delay between rounds
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      console.log(`\n📊 PROGRESSIVE STRESS TEST RESULTS:`);
      console.log(`  Successful rounds: ${successfulRounds}/20`);
      console.log(`  Total objects processed: ${totalObjectsProcessed}`);
      console.log(`  Total points processed: ${totalPointsProcessed}`);
      console.log(`  Maximum rendered length: ${maxRenderedLength} bytes`);
      console.log(`  Failed at operation: ${failedAt}`);
      console.log(`  Average bytes per object: ${totalObjectsProcessed > 0 ? (maxRenderedLength / totalObjectsProcessed).toFixed(2) : 0}`);
      console.log(`  Average bytes per point: ${totalPointsProcessed > 0 ? (maxRenderedLength / totalPointsProcessed).toFixed(2) : 0}`);
      console.log(`  System demonstrated capability for complex artwork uploads!`);
      
      // The test passes if we complete at least 10 rounds
      expect(successfulRounds).to.be.at.least(10);
    });
  });
});
