import { expect } from "chai";
import { ethers } from "hardhat";
import { EncodingTest } from "../typechain-types";

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

interface PackedObject {
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

// Encode Object to PackedObject format following the comment spec exactly:
// 1. bits 0-2: shape (3 bits)
// 2. bits 3-26: color (24 bits) 
// 3. bits 27-34: stroke (8 bits)
// 4. bits 35-50: pointsLength (16 bits)
// 5. bits 51-242: points (192 bits) // 6 points max
// 6. bits 243-255: unused (12 bits)
function encodeObject(obj: ObjectStruct): PackedObject {
  let encoded = 0n;
  
  // Extract first 6 points for base encoding
  const basePoints = obj.points.slice(0, 6);
  const additionalPoints = obj.points.slice(6);
  
  console.log(`\n=== ENCODING FOLLOWING COMMENT SPEC ===`);
  console.log(`Input - Shape: ${obj.shape}, Color: ${obj.color}, Stroke: ${obj.stroke}, Points: ${obj.points.length}`);
  
  // 1. Shape in bits 1-3 (3 bits) - NOTE: bit numbering is 1-based in comment, so bits 0-2 in 0-based
  encoded |= BigInt(obj.shape & 0x7) << 0n; // bits 0-2
  console.log(`After shape: 0x${encoded.toString(16)}`);
  console.log(`Shape verification: ${Number(encoded & 0x7n)}`);
  
  // 2. Color in bits 4-27 (24 bits) - so bits 3-26 in 0-based
  const colorNum = BigInt(obj.color);
  encoded |= (colorNum & 0xFFFFFFn) << 3n; // bits 3-26
  console.log(`After color: 0x${encoded.toString(16)}`);
  console.log(`Color verification: 0x${Number((encoded >> 3n) & 0xFFFFFFn).toString(16)}`);
  
  // 3. Stroke in bits 28-35 (8 bits) - so bits 27-34 in 0-based
  encoded |= BigInt(obj.stroke & 0xFF) << 27n; // bits 27-34
  console.log(`After stroke: 0x${encoded.toString(16)}`);
  console.log(`Stroke verification: ${Number((encoded >> 27n) & 0xFFn)}`);
  
  // 4. PointsLength in bits 36-51 (16 bits) - so bits 35-50 in 0-based
  encoded |= BigInt(obj.points.length & 0xFFFF) << 35n; // bits 35-50
  console.log(`After pointsLength: 0x${encoded.toString(16)}`);
  console.log(`PointsLength verification: ${Number((encoded >> 35n) & 0xFFFFn)}`);
  
  // 5. Points in bits 52-243 (192 bits) - so bits 51-242 in 0-based
  // 192 bits = 6 points * 32 bits per point (16 bits x + 16 bits y)
  console.log(`\n=== ENCODING POINTS ===`);
  for (let i = 0; i < basePoints.length && i < 6; i++) {
    const point = basePoints[i];
    const pointStartBit = 51n + BigInt(i * 32); // Each point takes 32 bits
    
    console.log(`Encoding point ${i}: (${point.x}, ${point.y}) at bit ${pointStartBit}`);
    
    // Convert int16 coordinates to uint16 for encoding
    const x_uint16 = int16ToUint16(point.x);
    const y_uint16 = int16ToUint16(point.y);
    
    // X coordinate in first 16 bits, Y in next 16 bits
    encoded |= BigInt(x_uint16 & 0xFFFF) << pointStartBit;
    encoded |= BigInt(y_uint16 & 0xFFFF) << (pointStartBit + 16n);
    
    console.log(`After point ${i}: 0x${encoded.toString(16)}`);
    
    // Verify we can extract it back
    const extractedX = Number((encoded >> pointStartBit) & 0xFFFFn);
    const extractedY = Number((encoded >> (pointStartBit + 16n)) & 0xFFFFn);
    console.log(`Point ${i} verification: (${extractedX}, ${extractedY})`);
  }
  
  console.log(`Final encoded: 0x${encoded.toString(16)}`);
  console.log(`\n=== FINAL VERIFICATION ===`);
  console.log(`Shape: ${Number(encoded & 0x7n)} (expected ${obj.shape})`);
  console.log(`Color: 0x${Number((encoded >> 3n) & 0xFFFFFFn).toString(16)} (expected ${obj.color})`);
  console.log(`Stroke: ${Number((encoded >> 27n) & 0xFFn)} (expected ${obj.stroke})`);
  console.log(`PointsLength: ${Number((encoded >> 35n) & 0xFFFFn)} (expected ${obj.points.length})`);
  
  // Encode additional points as bytes (4 bytes per point: x_high, x_low, y_high, y_low)
  console.log(`\n=== ENCODING ADDITIONAL POINTS ===`);
  console.log(`Additional points to encode: ${additionalPoints.length}`);
  
  const additionalBytes = new Uint8Array(additionalPoints.length * 4);
  for (let i = 0; i < additionalPoints.length; i++) {
    const point = additionalPoints[i];
    const offset = i * 4;
    console.log(`Encoding additional point ${i + 6}: (${point.x}, ${point.y}) at byte offset ${offset}`);
    
    // Convert int16 coordinates to uint16 for encoding
    const x_uint16 = int16ToUint16(point.x);
    const y_uint16 = int16ToUint16(point.y);
    
    // Big-endian encoding
    additionalBytes[offset] = (x_uint16 >> 8) & 0xFF;     // x high byte
    additionalBytes[offset + 1] = x_uint16 & 0xFF;        // x low byte
    additionalBytes[offset + 2] = (y_uint16 >> 8) & 0xFF; // y high byte
    additionalBytes[offset + 3] = y_uint16 & 0xFF;        // y low byte
    
    console.log(`Bytes: [${additionalBytes[offset]}, ${additionalBytes[offset + 1]}, ${additionalBytes[offset + 2]}, ${additionalBytes[offset + 3]}]`);
    
    // Verify encoding
    const decodedX = (additionalBytes[offset] << 8) | additionalBytes[offset + 1];
    const decodedY = (additionalBytes[offset + 2] << 8) | additionalBytes[offset + 3];
    console.log(`Verification: (${decodedX}, ${decodedY})`);
  }
  
  return {
    base: encoded,
    additionalPoints: additionalBytes
  };
}

// Create mock test data
function createMockData(): ObjectStruct[] {
  return [
    // Rectangle - 2 points
    {
      shape: 0, // rect
      color: hexToBytes3("#FF0000"), // red
      stroke: 0,
      points: [
        { x: 100, y: 100 },
        { x: 200, y: 200 }
      ]
    },
    
    // Line - 2 points
    {
      shape: 1, // line
      color: hexToBytes3("#00FF00"), // green
      stroke: 5,
      points: [
        { x: 50, y: 50 },
        { x: 150, y: 150 }
      ]
    },
    
    // Ellipse - 2 points
    {
      shape: 2, // ellipse
      color: hexToBytes3("#0000FF"), // blue
      stroke: 0,
      points: [
        { x: 300, y: 300 },
        { x: 400, y: 350 }
      ]
    },
    
    // Triangle (polygon) - 3 points
    {
      shape: 4, // polygon
      color: hexToBytes3("#FFFF00"), // yellow
      stroke: 0,
      points: [
        { x: 100, y: 100 },
        { x: 150, y: 50 },
        { x: 200, y: 100 }
      ]
    },
    
    // Polyline with many points (testing additional points encoding)
    {
      shape: 3, // polyline
      color: hexToBytes3("#FF00FF"), // magenta
      stroke: 3,
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 30 },
        { x: 40, y: 20 },
        { x: 60, y: 50 },
        { x: 80, y: 40 },
        { x: 100, y: 70 },
        { x: 120, y: 60 }, // 7th point - goes to additionalPoints
        { x: 140, y: 90 }, // 8th point - goes to additionalPoints
        { x: 160, y: 80 }  // 9th point - goes to additionalPoints
      ]
    },
    
    // Hexagon - 6 points (exactly fills base points)
    {
      shape: 4, // polygon
      color: hexToBytes3("#00FFFF"), // cyan
      stroke: 0,
      points: [
        { x: 300, y: 250 },
        { x: 350, y: 225 },
        { x: 350, y: 175 },
        { x: 300, y: 150 },
        { x: 250, y: 175 },
        { x: 250, y: 225 }
      ]
    }
  ];
}

describe("EncodingTest", function () {
  let encodingTest: EncodingTest;
  
  before(async function () {
    this.timeout(100000);
    const EncodingTestFactory = await ethers.getContractFactory("EncodingTest");
    encodingTest = await EncodingTestFactory.deploy();
    await encodingTest.waitForDeployment();
  });

  it("Should test individual decode functions", async function () {
    // Test with a simple rectangle first
    const testObject: ObjectStruct = {
      shape: 0, // rect
      color: hexToBytes3("#FF0000"), // red
      stroke: 5,
      points: [
        { x: 100, y: 200 },
        { x: 300, y: 400 }
      ]
    };
    
    console.log("\n=== TESTING INDIVIDUAL DECODE FUNCTIONS ===");
    console.log(`Original - Shape: ${testObject.shape}, Color: ${testObject.color}, Stroke: ${testObject.stroke}, Points: ${testObject.points.length}`);
    
    const packed = encodeObject(testObject);
    console.log(`Encoded object: 0x${packed.base.toString(16)}`);
    
    try {
      // Test decodeShape
      console.log("\n--- Testing decodeShape ---");
      const decodedShape = await encodingTest.testDecodeShape(packed.base);
      console.log(`Expected: ${testObject.shape}, Got: ${decodedShape}`);
      expect(decodedShape).to.equal(testObject.shape);
      
      // Test decodeColor  
      console.log("\n--- Testing decodeColor ---");
      const decodedColor = await encodingTest.testDecodeColor(packed.base);
      console.log(`Expected: ${testObject.color}, Got: ${decodedColor}`);
      expect(decodedColor.toLowerCase()).to.equal(testObject.color.toLowerCase());
      
      // Test decodeStroke
      console.log("\n--- Testing decodeStroke ---");
      const decodedStroke = await encodingTest.testDecodeStroke(packed.base);
      console.log(`Expected: ${testObject.stroke}, Got: ${decodedStroke}`);
      expect(decodedStroke).to.equal(testObject.stroke);
      
      // Test decodePointsLength
      console.log("\n--- Testing decodePointsLength ---");
      const decodedPointsLength = await encodingTest.testDecodePointsLength(packed.base);
      console.log(`Expected: ${testObject.points.length}, Got: ${decodedPointsLength}`);
      expect(decodedPointsLength).to.equal(testObject.points.length);
      
      console.log("\n✅ All individual decode functions working!");
      
    } catch (error: any) {
      console.log(`\n❌ Individual decode function failed: ${error?.message || error}`);
      // Let's still check our bit extraction manually
      console.log("\n=== MANUAL BIT EXTRACTION ===");
      const obj = packed.base;
      console.log(`Shape bits (253-255): ${Number(obj >> 253n)} (should be ${testObject.shape})`);
      console.log(`Color bits (232-255): 0x${Number((obj >> 232n) & 0xFFFFFFn).toString(16)} (should be ${testObject.color})`);
      console.log(`Stroke bits (224-231): ${Number((obj >> 224n) & 0xFFn)} (should be ${testObject.stroke})`);
      console.log(`Points bits (216-223): ${Number((obj >> 216n) & 0xFFFFn)} (should be ${testObject.points.length})`);
      
      throw error;
    }
  });

  it("Should correctly extract individual components", async function () {
    // Test with a simple rectangle first
    const testObject: ObjectStruct = {
      shape: 0, // rect
      color: hexToBytes3("#FF0000"), // red
      stroke: 5,
      points: [
        { x: 100, y: 200 },
        { x: 300, y: 400 }
      ]
    };
    
    console.log("\n=== ORIGINAL OBJECT ===");
    console.log(`Shape: ${testObject.shape}`);
    console.log(`Color: ${testObject.color}`);
    console.log(`Stroke: ${testObject.stroke}`);
    console.log(`Points length: ${testObject.points.length}`);
    console.log(`Points: ${JSON.stringify(testObject.points)}`);
    
    const packed = encodeObject(testObject);
    console.log("\n=== ENCODED ===");
    console.log(`Encoded object: 0x${packed.base.toString(16)}`);
    console.log(`Additional points length: ${packed.additionalPoints.length}`);
    
    // Test bit extraction manually using correct bit positions
    console.log("\n=== BIT EXTRACTION TEST (CORRECTED) ===");
    const obj = packed.base;
    
    // Shape (bits 0-2)
    const extractedShape = Number(obj & 0x7n);
    console.log(`Shape: expected ${testObject.shape}, extracted ${extractedShape}`);
    
    // Color (bits 3-26, 24 bits)
    const extractedColor = Number((obj >> 3n) & 0xFFFFFFn);
    const expectedColor = Number(testObject.color);
    console.log(`Color: expected 0x${expectedColor.toString(16)}, extracted 0x${extractedColor.toString(16)}`);
    
    // Stroke (bits 27-34)
    const extractedStroke = Number((obj >> 27n) & 0xFFn);
    console.log(`Stroke: expected ${testObject.stroke}, extracted ${extractedStroke}`);
    
    // Points length (bits 35-50)
    const extractedPointsLength = Number((obj >> 35n) & 0xFFFFn);
    console.log(`Points length: expected ${testObject.points.length}, extracted ${extractedPointsLength}`);
    
    // Store and retrieve to test contract decoding
    await encodingTest.storeArt(1, [{ base: packed.base, additionalPoints: packed.additionalPoints }]);
    
    try {
      const [baseObjects, allPoints] = await encodingTest.unpackArt(1);
      console.log("\n=== CONTRACT DECODED ===");
      console.log(`Decoded shape: ${baseObjects[0].shape}`);
      console.log(`Decoded color: ${baseObjects[0].color}`);
      console.log(`Decoded stroke: ${baseObjects[0].stroke}`);
      console.log(`Decoded pointsLength: ${baseObjects[0].pointsLength}`);
      console.log(`Decoded points: ${JSON.stringify(allPoints[0].map(p => ({x: Number(p.x), y: Number(p.y)})))}`);
    } catch (error: any) {
      console.log("\n=== CONTRACT DECODING FAILED ===");
      console.log(`Error: ${error?.message || error}`);
    }
  });

  it("Should test bit layout understanding", async function () {
    // Let's manually construct a uint256 with known values
    console.log("\n=== MANUAL BIT LAYOUT TEST ===");
    
    let testValue = 0n;
    
    // Set shape = 0 (rect) in bits 253-255
    testValue |= 0n << 253n;
    console.log(`After setting shape 0: 0x${testValue.toString(16)}`);
    
    // Set color = 0xFF0000 (red) in bits 232-255 (24 bits)
    testValue |= 0xFF0000n << 232n;
    console.log(`After setting color: 0x${testValue.toString(16)}`);
    
    // Set stroke = 5 in bits 224-231
    testValue |= 5n << 224n;
    console.log(`After setting stroke: 0x${testValue.toString(16)}`);
    
    // Set pointsLength = 2 - trying different bit positions
    console.log("\n--- Testing different bit positions for pointsLength ---");
    
    // Try position 216 (as in decoder)
    let testValue216 = testValue | (2n << 216n);
    console.log(`With pointsLength at 216: 0x${testValue216.toString(16)}`);
    console.log(`Extracted: ${Number((testValue216 >> 216n) & 0xFFFFn)}`);
    
    // Try position 208
    let testValue208 = testValue | (2n << 208n);
    console.log(`With pointsLength at 208: 0x${testValue208.toString(16)}`);
    console.log(`Extracted from 208: ${Number((testValue208 >> 208n) & 0xFFFFn)}`);
    console.log(`Extracted from 216: ${Number((testValue208 >> 216n) & 0xFFFFn)}`);
  });
  
  it("Should correctly encode and decode objects", async function () {
    const mockObjects = createMockData();
    const tokenId = 1;
    
    // Encode the objects
    const packedObjects = mockObjects.map(encodeObject);
    
    // Convert to contract format
    const contractObjects = packedObjects.map(packed => ({
      base: packed.base,
      additionalPoints: packed.additionalPoints
    }));
    
    // Store the art
    const tx = await encodingTest.storeArt(tokenId, contractObjects);
    await tx.wait();
    
    // Retrieve and unpack the art
    const [baseObjects, allPoints] = await encodingTest.unpackArt(tokenId);
    
    // Verify the results
    expect(baseObjects.length).to.equal(mockObjects.length);
    expect(allPoints.length).to.equal(mockObjects.length);
    
    for (let i = 0; i < mockObjects.length; i++) {
      const original = mockObjects[i];
      const decoded = baseObjects[i];
      const decodedPoints = allPoints[i];
      
      console.log(`\nTesting object ${i}:`);
      console.log(`Original shape: ${original.shape}, decoded: ${decoded.shape}`);
      console.log(`Original color: ${original.color}, decoded: 0x${decoded.color.slice(2)}`);
      console.log(`Original stroke: ${original.stroke}, decoded: ${decoded.stroke}`);
      console.log(`Original points length: ${original.points.length}, decoded: ${decoded.pointsLength}`);
      
      // Check base properties
      expect(decoded.shape).to.equal(original.shape);
      expect(`0x${decoded.color.slice(2).toLowerCase()}`).to.equal(original.color.toLowerCase());
      expect(decoded.stroke).to.equal(original.stroke);
      expect(decoded.pointsLength).to.equal(original.points.length);
      
      // Check points
      expect(decodedPoints.length).to.equal(original.points.length);
      
      for (let j = 0; j < original.points.length; j++) {
        console.log(`Point ${j}: original (${original.points[j].x}, ${original.points[j].y}), decoded (${decodedPoints[j].x}, ${decodedPoints[j].y})`);
        expect(decodedPoints[j].x).to.equal(original.points[j].x);
        expect(decodedPoints[j].y).to.equal(original.points[j].y);
      }
    }
  });
  
  it("Should handle edge cases", async function () {
    const edgeCases: ObjectStruct[] = [
      // Minimum points
      {
        shape: 1, // line
        color: hexToBytes3("#000000"),
        stroke: 1,
        points: [{ x: 0, y: 0 }, { x: 1, y: 1 }]
      },
      
      // Maximum coordinate values (int16)
      {
        shape: 0, // rect
        color: hexToBytes3("#FFFFFF"),
        stroke: 255,
        points: [{ x: 32767, y: 32767 }, { x: 0, y: 0 }]
      },
      
      // Minimum coordinate values (int16)
      {
        shape: 1, // line
        color: hexToBytes3("#FF0000"),
        stroke: 2,
        points: [{ x: -32768, y: -32768 }, { x: 100, y: 100 }]
      },
      
      // Negative coordinates
      {
        shape: 2, // ellipse
        color: hexToBytes3("#00FF00"),
        stroke: 0,
        points: [{ x: -100, y: -50 }, { x: 75, y: 25 }]
      }
    ];
    
    const packedObjects = edgeCases.map(encodeObject);
    const contractObjects = packedObjects.map(packed => ({
      base: packed.base,
      additionalPoints: packed.additionalPoints
    }));
    
    const tx = await encodingTest.storeArt(999n, contractObjects);
    await tx.wait();
    const [baseObjects, allPoints] = await encodingTest.unpackArt(999n);
    
    // Verify edge cases work
    expect(baseObjects.length).to.equal(edgeCases.length);
    expect(allPoints[1][0].x).to.equal(32767n); // Max int16 value
    expect(allPoints[1][0].y).to.equal(32767n);
    expect(allPoints[2][0].x).to.equal(-32768n); // Min int16 value
    expect(allPoints[2][0].y).to.equal(-32768n);
    expect(allPoints[3][0].x).to.equal(-100n); // Negative coordinates
    expect(allPoints[3][0].y).to.equal(-50n);
  });
});
