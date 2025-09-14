import { ethers } from "hardhat";
import { writeFileSync } from "fs";
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

// Helper function to convert int16 to uint16 (two's complement)
function int16ToUint16(value: number): number {
  // Ensure the value is within int16 range
  if (value < -32768 || value > 32767) {
    throw new Error(`Value ${value} is out of int16 range (-32768 to 32767)`);
  }
  
  // Convert to uint16 representation (two's complement for negative values)
  return value < 0 ? 65536 + value : value;
}

// Encoder function (same as in tests for consistency)
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
    
    // Convert int16 coordinates to uint16 for encoding
    const x_uint16 = int16ToUint16(point.x);
    const y_uint16 = int16ToUint16(point.y);
    
    // X coordinate in first 16 bits, Y in next 16 bits
    encoded |= BigInt(x_uint16 & 0xFFFF) << pointStartBit;
    encoded |= BigInt(y_uint16 & 0xFFFF) << (pointStartBit + 16n);
  }
  
  // Encode additional points as bytes (4 bytes per point: x_high, x_low, y_high, y_low)
  const additionalBytes = new Uint8Array(additionalPoints.length * 4);
  for (let i = 0; i < additionalPoints.length; i++) {
    const point = additionalPoints[i];
    const offset = i * 4;
    
    // Convert int16 coordinates to uint16 for encoding
    const x_uint16 = int16ToUint16(point.x);
    const y_uint16 = int16ToUint16(point.y);
    
    // Big-endian encoding
    additionalBytes[offset] = (x_uint16 >> 8) & 0xFF;     // x high byte
    additionalBytes[offset + 1] = x_uint16 & 0xFF;        // x low byte
    additionalBytes[offset + 2] = (y_uint16 >> 8) & 0xFF; // y high byte
    additionalBytes[offset + 3] = y_uint16 & 0xFF;        // y low byte
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

// Convert bytes3 to hex string
function bytes3ToHex(bytes3: string): string {
  if (bytes3.startsWith('0x')) {
    return '#' + bytes3.slice(2).padStart(6, '0');
  }
  return '#' + bytes3.padStart(6, '0');
}

// Generate random points for a shape (including negative coordinates to test int16)
function generateRandomPoints(shape: number, count?: number): Point[] {
  const points: Point[] = [];
  
  switch (shape) {
    case 0: // rect
    case 1: // line  
    case 2: // ellipse
      // These shapes need exactly 2 points
      // Include some negative coordinates to test int16 functionality
      points.push(
        { 
          x: Math.floor(Math.random() * 1600) - 300, // -300 to 1300
          y: Math.floor(Math.random() * 1200) - 200  // -200 to 1000
        },
        { 
          x: Math.floor(Math.random() * 400) + 50, 
          y: Math.floor(Math.random() * 400) + 50 
        }
      );
      break;
      
    case 3: // polyline
    case 5: // path
      // These can have multiple points (2-20 for variety)
      const numPoints = count || (Math.floor(Math.random() * 19) + 2);
      for (let i = 0; i < numPoints; i++) {
        points.push({
          x: Math.floor(Math.random() * 1600) - 300, // -300 to 1300
          y: Math.floor(Math.random() * 1200) - 200  // -200 to 1000
        });
      }
      break;
      
    case 4: // polygon
      // Must have 3, 5, or 6 points (based on trait.polygon)
      const polygonSides = count || [3, 5, 6][Math.floor(Math.random() * 3)];
      const centerX = Math.floor(Math.random() * 1000) + 100; // 100 to 1100
      const centerY = Math.floor(Math.random() * 800) + 200;  // 200 to 1000
      const radius = Math.floor(Math.random() * 100) + 50;
      
      for (let i = 0; i < polygonSides; i++) {
        const angle = (2 * Math.PI * i) / polygonSides;
        points.push({
          x: Math.floor(centerX + radius * Math.cos(angle)),
          y: Math.floor(centerY + radius * Math.sin(angle))
        });
      }
      break;
  }
  
  return points;
}

// Create art objects using token's allowed traits
function generateTokenArt(traits: any): ObjectStruct[] {
  const objects: ObjectStruct[] = [];
  
  // Available colors (including always-allowed black and white)
  const allowedColors = [
    '#000000', // black (always allowed)
    '#ffffff', // white (always allowed)
    bytes3ToHex(traits.color0),
    bytes3ToHex(traits.color1),
    bytes3ToHex(traits.color2),
    bytes3ToHex(traits.color3),
    bytes3ToHex(traits.color4)
  ];
  
  // Available shapes
  const allowedShapes = [
    Number(traits.shape0),
    Number(traits.shape1),
    4, // polygon (always allowed)
    5  // path (always allowed)
  ];
  
  // Generate 15-25 objects for a nice test image
  const numObjects = Math.floor(Math.random() * 11) + 15;
  
  for (let i = 0; i < numObjects; i++) {
    const shape = allowedShapes[Math.floor(Math.random() * allowedShapes.length)];
    const color = allowedColors[Math.floor(Math.random() * allowedColors.length)];
    const stroke = shape === 1 || shape === 3 || shape === 5 ? Math.floor(Math.random() * 8) + 1 : Math.floor(Math.random() * 4); // Ensure stroke > 0 for lines/polylines/paths
    
    // For polygons, use the trait's polygon sides
    let points: Point[];
    if (shape === 4) {
      points = generateRandomPoints(shape, Number(traits.polygon));
    } else {
      points = generateRandomPoints(shape);
    }
    
    objects.push({
      shape,
      color,
      stroke,
      points
    });
  }
  
  return objects;
}

async function main() {
  console.log("🚀 Starting test art generation using Hardhat VM...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Using deployer account:", deployer.address);
  
  // Deploy contracts fresh in the Hardhat VM
  console.log("📋 Deploying contracts to Hardhat VM...");
  
  // Deploy ColourMeRenderer first
  console.log("Deploying ColourMeRenderer...");
  const RendererFactory = await ethers.getContractFactory("ColourMeRenderer");
  const renderer = await RendererFactory.deploy() as ColourMeRenderer;
  await renderer.waitForDeployment();
  console.log("✅ ColourMeRenderer deployed at:", await renderer.getAddress());
  
  // Deploy ColourMeNFT
  console.log("Deploying ColourMeNFT...");
  const NFTFactory = await ethers.getContractFactory("ColourMeNFT");
  // Set mint start to a time in the past, and current time should be between start and end
  const now = Math.floor(Date.now() / 1000);
  const mintStart = now - 3600; // Started 1 hour ago
  const mintDuration = 365 * 24 * 60 * 60; // 1 year duration
  
  const nft = await NFTFactory.deploy(
    "Colour Me NFT",           // name
    "CLRNFT",                  // symbol
    "https://example.com/",    // baseURL
    10000,                     // maxSupply
    await renderer.getAddress(), // renderer address
    deployer.address,          // owner
    500,                       // royalty (5%)
    0,                         // mintPrice (free)
    10,                        // mintLimit (10 per transaction)
    mintStart,                 // mintStart (started 1 hour ago)  
    mintDuration               // mintDuration (1 year)
  ) as ColourMeNFT;
  await nft.waitForDeployment();
  console.log("✅ ColourMeNFT deployed at:", await nft.getAddress());
  
  console.log("✅ Contracts deployed successfully:");
  console.log("  Renderer:", await renderer.getAddress());
  console.log("  NFT:", await nft.getAddress());
  
  // Set SVG wrapper using actual minified SVG components
  try {
    const currentSvgStart = await nft.svgStart();
    if (ethers.toUtf8String(currentSvgStart).length === 0) {
      console.log("📝 Setting SVG wrapper from minified components...");
      
      const fs = require('fs');
      let svgStart = '';
      let svgEnd = '';
      
      // Try to read the actual minified SVG components
      try {
        if (fs.existsSync('./assets/colour-me.min.start.svg')) {
          svgStart = fs.readFileSync('./assets/colour-me.min.start.svg', 'utf8');
          console.log("✅ Loaded SVG start from colour-me.min.start.svg");
        } else if (fs.existsSync('./assets/colour-me.start.svg')) {
          svgStart = fs.readFileSync('./assets/colour-me.start.svg', 'utf8');
          console.log("✅ Loaded SVG start from colour-me.start.svg");
        } else {
          throw new Error("SVG start file not found");
        }
        
        if (fs.existsSync('./assets/colour-me.min.end.svg')) {
          svgEnd = fs.readFileSync('./assets/colour-me.min.end.svg', 'utf8');
          console.log("✅ Loaded SVG end from colour-me.min.end.svg");
        } else if (fs.existsSync('./assets/colour-me.end.svg')) {
          svgEnd = fs.readFileSync('./assets/colour-me.end.svg', 'utf8');
          console.log("✅ Loaded SVG end from colour-me.end.svg");
        } else {
          throw new Error("SVG end file not found");
        }
      } catch (fileError: any) {
        console.log("⚠️ Could not read SVG files, using fallback:", fileError.message);
        svgStart = '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000">';
        svgEnd = '</svg>';
      }
      
      const setSvgTx = await nft.setSVG(
        ethers.toUtf8Bytes(svgStart),
        ethers.toUtf8Bytes(svgEnd)
      );
      await setSvgTx.wait();
      console.log("✅ SVG wrapper set using actual components");
      console.log(`  Start size: ${svgStart.length} chars`);
      console.log(`  End size: ${svgEnd.length} chars`);
    } else {
      console.log("✅ SVG wrapper already set");
    }
  } catch (error) {
    console.log("⚠️ Could not set SVG wrapper:", error);
  }
  
  // Mint a token
  console.log("🪙 Minting test token...");
  let tokenId: number;
  
  try {
    const tokenCount = await nft.tokenCount();
    const mintTx = await nft.mint(deployer.address, 1); // quantity = 1
    await mintTx.wait();
    tokenId = Number(tokenCount) + 1;
    console.log("✅ Minted token ID:", tokenId);
  } catch (error) {
    console.log("⚠️ Mint failed, using existing token...");
    const tokenCount = await nft.tokenCount();
    if (tokenCount > 0n) {
      tokenId = Number(tokenCount);
      console.log("✅ Using existing token ID:", tokenId);
    } else {
      throw new Error("No tokens available and mint failed");
    }
  }
  
  // Get token traits
  console.log("🎨 Getting token traits...");
  const traits = await nft.traits(tokenId);
  console.log("✅ Token traits:");
  console.log("  Colors:", [
    bytes3ToHex(traits.color0),
    bytes3ToHex(traits.color1), 
    bytes3ToHex(traits.color2),
    bytes3ToHex(traits.color3),
    bytes3ToHex(traits.color4)
  ]);
  console.log("  Shapes:", [Number(traits.shape0), Number(traits.shape1)]);
  console.log("  Polygon sides:", Number(traits.polygon));
  
  // Generate art using token's traits
  console.log("🎭 Generating art objects...");
  const artObjects = generateTokenArt(traits);
  console.log(`✅ Generated ${artObjects.length} art objects`);
  
  // Encode objects for contract
  const packedObjects = artObjects.map(obj => {
    const packed = encodeObject(obj);
    return { base: packed.base, additionalPoints: packed.additionalPoints };
  });
  
  // Set art on token
  console.log("💾 Setting art on token...");
  try {
    const setArtTx = await nft.setArt(tokenId, packedObjects);
    await setArtTx.wait();
    console.log("✅ Art set successfully");
  } catch (error) {
    console.log("⚠️ Failed to set art:", error);
    throw error;
  }
  
  // Generate SVG
  console.log("🖼️ Generating SVG...");
  const svg = await nft.tokenSVG(tokenId);
  // const svgString = ethers.toUtf8String(svg);
  
  // Save to assets folder
  const outputPath = "./assets/colour-me.test.svg";
  writeFileSync(outputPath, svg);
  console.log("✅ SVG saved to:", outputPath);
  console.log("📊 SVG size:", svg.length, "characters");
  
  // Summary
  console.log("\n🎉 Test art generation complete!");
  console.log("📈 Summary:");
  console.log(`  Token ID: ${tokenId}`);
  console.log(`  Objects: ${artObjects.length}`);
  console.log(`  Total points: ${artObjects.reduce((sum, obj) => sum + obj.points.length, 0)}`);
  console.log(`  SVG size: ${svg.length} characters`);
  console.log(`  Output: ${outputPath}`);
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exitCode = 1;
});
