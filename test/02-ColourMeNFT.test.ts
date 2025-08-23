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

// Helper function to convert int16 to uint16 (two's complement)
function int16ToUint16(value: number): number {
  // Ensure the value is within int16 range
  if (value < -32768 || value > 32767) {
    throw new Error(`Value ${value} is out of int16 range (-32768 to 32767)`);
  }
  
  // Convert to uint16 representation (two's complement for negative values)
  return value < 0 ? 65536 + value : value;
}

// Encoder function
function encodeObject(obj: ObjectStruct): Object {
  let encoded = 0n;
  
  const basePoints = obj.points.slice(0, 6);
  const additionalPoints = obj.points.slice(6);
  
  // Follow the comment spec from types.sol
  encoded |= BigInt(obj.shape & 0x7) << 0n; // bits 0-2
  encoded |= (BigInt(obj.color) & 0xFFFFFFn) << 3n; // bits 3-26
  encoded |= BigInt(obj.stroke & 0xFF) << 27n; // bits 27-34
  encoded |= BigInt(obj.points.length & 0xFFFF) << 35n; // bits 35-50
  
  // Encode points (bits 51-242)
  for (let i = 0; i < basePoints.length && i < 6; i++) {
    const point = basePoints[i];
    const pointStartBit = 51n + BigInt(i * 32);
    
    // Convert int16 coordinates to uint16 for encoding
    const x_uint16 = int16ToUint16(point.x);
    const y_uint16 = int16ToUint16(point.y);
    
    encoded |= BigInt(x_uint16 & 0xFFFF) << pointStartBit;
    encoded |= BigInt(y_uint16 & 0xFFFF) << (pointStartBit + 16n);
  }
  
  // Encode additional points as bytes
  const additionalBytes = new Uint8Array(additionalPoints.length * 4);
  for (let i = 0; i < additionalPoints.length; i++) {
    const point = additionalPoints[i];
    const offset = i * 4;
    
    // Convert int16 coordinates to uint16 for encoding
    const x_uint16 = int16ToUint16(point.x);
    const y_uint16 = int16ToUint16(point.y);
    
    additionalBytes[offset] = (x_uint16 >> 8) & 0xFF;
    additionalBytes[offset + 1] = x_uint16 & 0xFF;
    additionalBytes[offset + 2] = (y_uint16 >> 8) & 0xFF;
    additionalBytes[offset + 3] = y_uint16 & 0xFF;
  }
  
  return {
    base: encoded,
    additionalPoints: additionalBytes
  };
}

describe("ColourMeNFT", function () {
  let nft: ColourMeNFT;
  let renderer: ColourMeRenderer;
  let owner: any;
  let user: any;
  
  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
    
    // Deploy renderer first
    const RendererFactory = await ethers.getContractFactory("ColourMeRenderer");
    renderer = await RendererFactory.deploy() as unknown as ColourMeRenderer;
    await renderer.waitForDeployment();
    
    // Deploy NFT contract
    const NFTFactory = await ethers.getContractFactory("ColourMeNFT");
    nft = await NFTFactory.deploy(
      "ColourMe Packed Test",
      "CMPT",
      "https://example.com/",
      1000, // maxSupply
      await renderer.getAddress(),
      owner.address,
      250 // 2.5% royalty
    ) as unknown as ColourMeNFT;
    await nft.waitForDeployment();
    
    // Set SVG data
    const svgStart = ethers.toUtf8Bytes('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">');
    const svgEnd = ethers.toUtf8Bytes('</svg>');
    await nft.setSVG(svgStart, svgEnd);
  });
  
  describe("Basic NFT functionality", function () {
    it("Should mint a token with random traits", async function () {
      await nft.mint(user.address);
      
      expect(await nft.ownerOf(1)).to.equal(user.address);
      expect(await nft.tokenCount()).to.equal(1);
      
      // Check that traits were generated
      const traits = await nft.traits(1);
      expect(traits.color0).to.not.equal("0x000000");
      expect(traits.shape0).to.be.lessThanOrEqual(3); // shapes 0-3 (rect, line, ellipse, polyline)
    });
  });
  
  describe(" object validation", function () {
    beforeEach(async function () {
      await nft.mint(user.address);
    });
    
    it("Should validate basic packed object structure", async function () {
      const validObject: ObjectStruct = {
        shape: 5, // path (always allowed)
        color: hexToBytes3("#000000"), // black (always allowed)
        stroke: 2,
        points: [
          { x: 100, y: 100 },
          { x: 200, y: 200 }
        ]
      };
      
      const packed = encodeObject(validObject);
      
      // This should not revert when calling setArt
      await nft.connect(user).setArt(1, [{ base: packed.base, additionalPoints: packed.additionalPoints }]);
      
      // Check that it was successfully stored
      const art = await nft.art(1, 0);
      expect(art.length).to.not.equal(0);
    });
    
    it("Should reject invalid shape values", async function () {
      // Create object with invalid shape (> 5)
      let encoded = 0n;
      encoded |= BigInt(7) << 0n; // Invalid shape = 7
      encoded |= BigInt(0x000000) << 3n; // color
      encoded |= BigInt(2) << 27n; // stroke
      encoded |= BigInt(2) << 35n; // pointsLength
      
      await expect(
        nft.connect(user).setArt(1, [{ base: encoded, additionalPoints: new Uint8Array(0) }])
      ).to.be.revertedWithCustomError(nft, "InvalidShape");
    });
    
    it("Should reject path/polyline with zero stroke", async function () {
      const invalidObject: ObjectStruct = {
        shape: 5, // path
        color: hexToBytes3("#000000"),
        stroke: 0, // Invalid: path needs stroke > 0
        points: [
          { x: 100, y: 100 },
          { x: 200, y: 200 }
        ]
      };
      
      const packed = encodeObject(invalidObject);
      
      await expect(
        nft.connect(user).setArt(1, [{ base: packed.base, additionalPoints: packed.additionalPoints }])
      ).to.be.revertedWithCustomError(nft, "InvalidStroke");
    });
    
    it("Should reject objects with too few points", async function () {
      const invalidObject: ObjectStruct = {
        shape: 5, // path
        color: hexToBytes3("#000000"),
        stroke: 2,
        points: [
          { x: 100, y: 100 }
          // Missing second point
        ]
      };
      
      const packed = encodeObject(invalidObject);
      
      await expect(
        nft.connect(user).setArt(1, [{ base: packed.base, additionalPoints: packed.additionalPoints }])
      ).to.be.revertedWithCustomError(nft, "InvalidPoints");
    });
  });
  
  describe("Token-specific validation", function () {
    let tokenId: bigint;
    let traits: any;
    
    beforeEach(async function () {
      await nft.mint(user.address);
      tokenId = 1n;
      traits = await nft.traits(tokenId);
    });
    
    it("Should allow shapes from token traits", async function () {
      const allowedObject: ObjectStruct = {
        shape: Number(traits.shape0), // Use trait shape
        color: traits.color0, // Use trait color
        stroke: 1, // 0 might be invalid for some shapes
        points: [
          { x: 100, y: 100 },
          { x: 200, y: 200 }
        ]
      };
      
      const packed = encodeObject(allowedObject);
      
      // This should not revert
      await nft.connect(user).setArt(tokenId, [{ base: packed.base, additionalPoints: packed.additionalPoints }]);
      
      // Check that art was rendered and stored
      const art = await nft.art(tokenId, 0);
      expect(art.length).to.not.equal(0);
      
      // Check that tokenSVG includes the rendered art
      const svg = await nft.tokenSVG(tokenId);
      // const svgString = ethers.toUtf8String(svg);
      expect(svg).to.include('<g id="drawing-area"');
    });
    
    it("Should allow colors from token traits", async function () {
      const allowedObject: ObjectStruct = {
        shape: 5, // path (always allowed)
        color: traits.color1, // Use trait color
        stroke: 2,
        points: [
          { x: 100, y: 100 },
          { x: 200, y: 200 }
        ]
      };
      
      const packed = encodeObject(allowedObject);
      
      await nft.connect(user).setArt(tokenId, [{ base: packed.base, additionalPoints: packed.additionalPoints }]);
      
      // Check that art was rendered and stored
      const art = await nft.art(tokenId, 0);
      expect(art.length).to.not.equal(0);
      
      // Check that tokenSVG includes the rendered art
      const svg = await nft.tokenSVG(tokenId);
      // const svgString = ethers.toUtf8String(svg);
      expect(svg).to.include('<g id="drawing-area"');
    });
    
    it("Should allow black and white colors", async function () {
      const blackObject: ObjectStruct = {
        shape: 5, // path
        color: hexToBytes3("#000000"), // black
        stroke: 2,
        points: [{ x: 100, y: 100 }, { x: 200, y: 200 }]
      };
      
      const whiteObject: ObjectStruct = {
        shape: 5, // path
        color: hexToBytes3("#FFFFFF"), // white
        stroke: 2,
        points: [{ x: 300, y: 300 }, { x: 400, y: 400 }]
      };
      
      const packedBlack = encodeObject(blackObject);
      const packedWhite = encodeObject(whiteObject);
      
      await nft.connect(user).setArt(tokenId, [
        { base: packedBlack.base, additionalPoints: packedBlack.additionalPoints },
        { base: packedWhite.base, additionalPoints: packedWhite.additionalPoints }
      ]);
      
      // Check that both objects were rendered and stored
      const art = await nft.art(tokenId, 0);
      expect(art.length).to.not.equal(0);
      
      // Check that tokenSVG includes rendered art
      const svg = await nft.tokenSVG(tokenId);
      // const svgString = ethers.toUtf8String(svg);
      expect(svg).to.include('<g id="drawing-area"');
    });
    
    it("Should reject unauthorized colors", async function () {
      const unauthorizedObject: ObjectStruct = {
        shape: 5, // path
        color: hexToBytes3("#123456"), // Random color not in traits
        stroke: 2,
        points: [{ x: 100, y: 100 }, { x: 200, y: 200 }]
      };
      
      const packed = encodeObject(unauthorizedObject);
      
      await expect(
        nft.connect(user).setArt(tokenId, [{ base: packed.base, additionalPoints: packed.additionalPoints }])
      ).to.be.revertedWithCustomError(nft, "InvalidColor");
    });
    
    it("Should reject unauthorized shapes", async function () {
      // Assume the token doesn't have ellipse as one of its shapes
      const unauthorizedShape = 2; // ellipse
      
      if (Number(traits.shape0) !== unauthorizedShape && Number(traits.shape1) !== unauthorizedShape) {
        const unauthorizedObject: ObjectStruct = {
          shape: unauthorizedShape,
          color: traits.color0,
          stroke: 0,
          points: [{ x: 100, y: 100 }, { x: 200, y: 200 }]
        };
        
        const packed = encodeObject(unauthorizedObject);
        
        await expect(
          nft.connect(user).setArt(tokenId, [{ base: packed.base, additionalPoints: packed.additionalPoints }])
        ).to.be.revertedWithCustomError(nft, "InvalidShape");
      }
    });
    
    it("Should allow bucket tool rect even if rect not in traits", async function () {
      // Only test if rect is not already allowed
      if (Number(traits.shape0) !== 0 && Number(traits.shape1) !== 0) {
        const bucketObject: ObjectStruct = {
          shape: 0, // rect
          color: traits.color0,
          stroke: 0,
          points: [
            { x: 10, y: 90 },   // Bucket tool dimensions
            { x: 980, y: 900 }
          ]
        };
        
        const packed = encodeObject(bucketObject);
        
        // Should not revert even though rect isn't in traits
        await nft.connect(user).setArt(tokenId, [{ base: packed.base, additionalPoints: packed.additionalPoints }]);
        
        // Check that bucket tool rect was rendered and stored
        const art = await nft.art(tokenId, 0);
        expect(art.length).to.not.equal(0);
        
        // Check that tokenSVG includes the bucket tool rect
        const svg = await nft.tokenSVG(tokenId);
        // const svgString = ethers.toUtf8String(svg);
        expect(svg).to.include('<g id="drawing-area"');
      }
    });
    
    it("Should validate polygon point count", async function () {
      const validPolygon: ObjectStruct = {
        shape: 4, // polygon
        color: traits.color0,
        stroke: 0,
        points: Array.from({ length: Number(traits.polygon) }, (_, i) => ({ 
          x: 100 + i * 50, 
          y: 100 + i * 50 
        }))
      };
      
      const packed = encodeObject(validPolygon);
      
      await nft.connect(user).setArt(tokenId, [{ base: packed.base, additionalPoints: packed.additionalPoints }]);
      
      // Now try with wrong point count
      const invalidPolygon: ObjectStruct = {
        shape: 4, // polygon
        color: traits.color0,
        stroke: 0,
        points: [{ x: 100, y: 100 }, { x: 200, y: 200 }] // Wrong count
      };
      
      const packedInvalid = encodeObject(invalidPolygon);
      
      await expect(
        nft.connect(user).setArt(tokenId, [{ base: packedInvalid.base, additionalPoints: packedInvalid.additionalPoints }])
      ).to.be.revertedWithCustomError(nft, "InvalidPoints");
    });
  });
  
  describe("Art storage and retrieval", function () {
    let tokenId: number;
    
    beforeEach(async function () {
      await nft.mint(user.address);
      tokenId = 1;
    });
    
    it("Should store and retrieve art", async function () {
      const artObjects: ObjectStruct[] = [
        {
          shape: 5, // path
          color: hexToBytes3("#000000"),
          stroke: 2,
          points: [{ x: 100, y: 100 }, { x: 200, y: 200 }]
        },
        {
          shape: 5, // path
          color: hexToBytes3("#FFFFFF"),
          stroke: 3,
          points: [{ x: 300, y: 300 }, { x: 400, y: 400 }]
        }
      ];
      
      const packedObjects = artObjects.map(obj => {
        const packed = encodeObject(obj);
        return { base: packed.base, additionalPoints: packed.additionalPoints };
      });
      
      await nft.connect(user).setArt(tokenId, packedObjects);
      
      // Verify that art was rendered and stored
      const art = await nft.art(tokenId, 0);
      expect(art.length).to.not.equal(0);
      
      // Check that tokenSVG includes both objects
      const svg = await nft.tokenSVG(tokenId);
      // const svgString = ethers.toUtf8String(svg);
      expect(svg).to.include('<g id="drawing-area"');
    });
    
    it("Should append art to existing art", async function () {
      // First, set some initial art
      const initialObject: ObjectStruct = {
        shape: 5, // path
        color: hexToBytes3("#000000"),
        stroke: 2,
        points: [{ x: 100, y: 100 }, { x: 200, y: 200 }]
      };
      
      const initialPacked = encodeObject(initialObject);
      await nft.connect(user).setArt(tokenId, [{ base: initialPacked.base, additionalPoints: initialPacked.additionalPoints }]);
      
      // Then append more art
      const appendObject: ObjectStruct = {
        shape: 5, // path
        color: hexToBytes3("#FFFFFF"),
        stroke: 3,
        points: [{ x: 300, y: 300 }, { x: 400, y: 400 }]
      };
      
      const appendPacked = encodeObject(appendObject);
      await nft.connect(user).appendArt(tokenId, [{ base: appendPacked.base, additionalPoints: appendPacked.additionalPoints }]);
      
      // Should have rendered both initial and appended art
      const art = await nft.art(tokenId, 0);
      expect(art.length).to.not.equal(0);
      
      // Check that tokenSVG includes both objects
      const svg = await nft.tokenSVG(tokenId);
      // const svgString = ethers.toUtf8String(svg);
      expect(svg).to.include('<g id="drawing-area"');
    });
    
    it("Should replace art when using setArt", async function () {
      // Set initial art
      const initialObject: ObjectStruct = {
        shape: 5, // path
        color: hexToBytes3("#000000"),
        stroke: 2,
        points: [{ x: 100, y: 100 }, { x: 200, y: 200 }]
      };
      
      const initialPacked = encodeObject(initialObject);
      await nft.connect(user).setArt(tokenId, [{ base: initialPacked.base, additionalPoints: initialPacked.additionalPoints }]);
      
      // Replace with new art
      const newObject: ObjectStruct = {
        shape: 5, // path
        color: hexToBytes3("#FFFFFF"),
        stroke: 3,
        points: [{ x: 300, y: 300 }, { x: 400, y: 400 }]
      };
      
      const newPacked = encodeObject(newObject);
      await nft.connect(user).setArt(tokenId, [{ base: newPacked.base, additionalPoints: newPacked.additionalPoints }]);
      
      // Should only have the new rendered art (replaces the old)
      const art = await nft.art(tokenId, 0);
      expect(art.length).to.not.equal(0);
      
      // Check that tokenSVG includes the new art
      const svg = await nft.tokenSVG(tokenId);
      // const svgString = ethers.toUtf8String(svg);
      expect(svg).to.include('<g id="drawing-area"');
    });
  });
  
  describe("SVG and URI generation", function () {
    let tokenId: number;
    
    beforeEach(async function () {
      await nft.mint(user.address);
      tokenId = 1;
    });
    
    it("Should generate token SVG", async function () {
      const svg = await nft.tokenSVG(tokenId);
      // const svgString = ethers.toUtf8String(svg);
      
      expect(svg).to.include('<svg');
      expect(svg).to.include('</svg>');
      expect(svg).to.include(`data-token="${tokenId}"`);
    });
    
    it("Should generate token URI", async function () {
      const uri = await nft.tokenURI(tokenId);
      
      // Should be a valid JSON
      const decoded = JSON.parse(uri);
      expect(decoded.name).to.include("ColourMe Packed Test #1");
      expect(decoded.description).to.be.a('string');
      expect(decoded.image_data).to.include('data:image/svg+xml;base64,');
      expect(decoded.attributes).to.be.an('array');
    });
    
    it("Should include art in SVG output", async function () {
      // Add some art
      const artObject: ObjectStruct = {
        shape: 5, // path
        color: hexToBytes3("#FFFFFF"),
        stroke: 1,
        points: [{ x: 100, y: 100 }, { x: 200, y: 150 }]
      };
      
      const packed = encodeObject(artObject);
      await nft.connect(user).setArt(tokenId, [{ base: packed.base, additionalPoints: packed.additionalPoints }]);
      
      const svg = await nft.tokenSVG(tokenId);
      // const svgString = ethers.toUtf8String(svg);
      
      // Should include the rendered rectangle
      expect(svg).to.include('<path');
      expect(svg).to.include('stroke="#ffffff"');
      expect(svg).to.include('stroke-width="1"');
      expect(svg).to.include('d="M100 100 L200 150"');
    });
  });
});
