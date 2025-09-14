import { expect } from "chai";
import { ethers } from "hardhat";
import { ColourMeRenderer } from "../typechain-types";

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

interface Trait {
  color0: string;
  color1: string;
  color2: string;
  color3: string;
  color4: string;
  shape0: number;
  shape1: number;
  polygon: number;
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

// Encoder function from previous test
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

describe("ColourMeRenderer", function () {
  let renderer: ColourMeRenderer;
  
  beforeEach(async function () {
    const RendererFactory = await ethers.getContractFactory("ColourMeRenderer");
    renderer = await RendererFactory.deploy() as unknown as ColourMeRenderer;
  });
  
  describe("Rendering Objects", function () {
    it("Should render a simple rectangle from packed data", async function () {
      const rectObject: ObjectStruct = {
        shape: 0, // rect
        color: hexToBytes3("#FF0000"), // red
        stroke: 0,
        points: [
          { x: 100, y: 100 },
          { x: 200, y: 150 }
        ]
      };
      
      const packed = encodeObject(rectObject);
      const packedObjects = [{ base: packed.base, additionalPoints: packed.additionalPoints }];
      
      const svg = await renderer.renderObjects(packedObjects);
      const svgString = ethers.toUtf8String(svg);
      
      console.log("Rectangle SVG:", svgString);
      
      // Check that the SVG contains expected rectangle attributes
      expect(svgString).to.include('<rect');
      expect(svgString).to.include('fill="#ff0000"');
      expect(svgString).to.include('x="100"');
      expect(svgString).to.include('y="100"');
      expect(svgString).to.include('width="200"');
      expect(svgString).to.include('height="150"');
    });
    
    it("Should render a line with stroke from packed data", async function () {
      const lineObject: ObjectStruct = {
        shape: 1, // line
        color: hexToBytes3("#00FF00"), // green
        stroke: 5,
        points: [
          { x: 50, y: 50 },
          { x: 150, y: 150 }
        ]
      };
      
      const packed = encodeObject(lineObject);
      const packedObjects = [{ base: packed.base, additionalPoints: packed.additionalPoints }];
      
      const svg = await renderer.renderObjects(packedObjects);
      const svgString = ethers.toUtf8String(svg);
      
      console.log("Line SVG:", svgString);
      
      expect(svgString).to.include('<line');
      expect(svgString).to.include('stroke="#00ff00"');
      expect(svgString).to.include('stroke-width="5"');
      expect(svgString).to.include('x1="50"');
      expect(svgString).to.include('y1="50"');
      expect(svgString).to.include('x2="150"');
      expect(svgString).to.include('y2="150"');
    });
    
    it("Should render an ellipse from packed data", async function () {
      const ellipseObject: ObjectStruct = {
        shape: 2, // ellipse
        color: hexToBytes3("#0000FF"), // blue
        stroke: 0,
        points: [
          { x: 300, y: 200 },
          { x: 50, y: 75 }
        ]
      };
      
      const packed = encodeObject(ellipseObject);
      const packedObjects = [{ base: packed.base, additionalPoints: packed.additionalPoints }];
      
      const svg = await renderer.renderObjects(packedObjects);
      const svgString = ethers.toUtf8String(svg);
      
      console.log("Ellipse SVG:", svgString);
      
      expect(svgString).to.include('<ellipse');
      expect(svgString).to.include('fill="#0000ff"');
      expect(svgString).to.include('cx="300"');
      expect(svgString).to.include('cy="200"');
      expect(svgString).to.include('rx="50"');
      expect(svgString).to.include('ry="75"');
    });
    
    it("Should render a polygon from packed data", async function () {
      const triangleObject: ObjectStruct = {
        shape: 4, // polygon
        color: hexToBytes3("#FFFF00"), // yellow
        stroke: 0,
        points: [
          { x: 100, y: 100 },
          { x: 150, y: 50 },
          { x: 200, y: 100 }
        ]
      };
      
      const packed = encodeObject(triangleObject);
      const packedObjects = [{ base: packed.base, additionalPoints: packed.additionalPoints }];
      
      const svg = await renderer.renderObjects(packedObjects);
      const svgString = ethers.toUtf8String(svg);
      
      console.log("Triangle SVG:", svgString);
      
      expect(svgString).to.include('<polygon');
      expect(svgString).to.include('fill="#ffff00"');
      expect(svgString).to.include('points="100,100 150,50 200,100 "');
    });
    
    it("Should render a polyline with additional points from packed data", async function () {
      const polylineObject: ObjectStruct = {
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
        ]
      };
      
      const packed = encodeObject(polylineObject);
      const packedObjects = [{ base: packed.base, additionalPoints: packed.additionalPoints }];
      
      const svg = await renderer.renderObjects(packedObjects);
      const svgString = ethers.toUtf8String(svg);
      
      console.log("Polyline SVG:", svgString);
      
      expect(svgString).to.include('<polyline');
      expect(svgString).to.include('stroke="#ff00ff"');
      expect(svgString).to.include('stroke-width="3"');
      expect(svgString).to.include('points="10,10 20,30 40,20 60,50 80,40 100,70 120,60 140,90 "');
    });
    
    it("Should render multiple objects from packed data", async function () {
      const objects: ObjectStruct[] = [
        {
          shape: 0, // rect
          color: hexToBytes3("#FF0000"),
          stroke: 0,
          points: [{ x: 10, y: 10 }, { x: 50, y: 50 }]
        },
        {
          shape: 1, // line
          color: hexToBytes3("#00FF00"),
          stroke: 2,
          points: [{ x: 60, y: 60 }, { x: 100, y: 100 }]
        }
      ];
      
      const packedObjects = objects.map(obj => {
        const packed = encodeObject(obj);
        return { base: packed.base, additionalPoints: packed.additionalPoints };
      });
      
      const svg = await renderer.renderObjects(packedObjects);
      const svgString = ethers.toUtf8String(svg);
      
      console.log("Multiple objects SVG:", svgString);
      
      // Should contain both rect and line
      expect(svgString).to.include('<rect');
      expect(svgString).to.include('<line');
      expect(svgString).to.include('fill="#ff0000"');
      expect(svgString).to.include('stroke="#00ff00"');
    });
  });
  
  describe("Trait rendering", function () {
    it("Should render trait colors and shapes", async function () {
      const trait: Trait = {
        color0: hexToBytes3("#FF0000"),
        color1: hexToBytes3("#00FF00"),
        color2: hexToBytes3("#0000FF"),
        color3: hexToBytes3("#FFFF00"),
        color4: hexToBytes3("#FF00FF"),
        shape0: 0, // rect
        shape1: 1, // line
        polygon: 3  // triangle
      };
      
      const svg = await renderer.renderTrait(trait);
      const svgString = ethers.toUtf8String(svg);
      
      console.log("Trait SVG:", svgString);
      
      // Should contain color circles
      expect(svgString).to.include('fill="#ff0000"');
      expect(svgString).to.include('fill="#00ff00"');
      expect(svgString).to.include('fill="#0000ff"');
      expect(svgString).to.include('fill="#ffff00"');
      expect(svgString).to.include('fill="#ff00ff"');
      
      // Should contain shape tools
      expect(svgString).to.include('data-shape="rect"');
      expect(svgString).to.include('data-shape="line"');
      expect(svgString).to.include('data-shape="polygon-3"');
    });
  });
  
  describe("Edge cases", function () {
    it("Should handle empty packed objects array", async function () {
      const svg = await renderer.renderObjects([]);
      expect(svg).to.equal("0x");
    });
    
    it("Should handle maximum coordinate values", async function () {
      const maxObject: ObjectStruct = {
        shape: 0, // rect
        color: hexToBytes3("#FFFFFF"),
        stroke: 255,
        points: [
          { x: 32767, y: 32767 },
          { x: 0, y: 0 }
        ]
      };
      
      const packed = encodeObject(maxObject);
      const packedObjects = [{ base: packed.base, additionalPoints: packed.additionalPoints }];
      
      const svg = await renderer.renderObjects(packedObjects);
      const svgString = ethers.toUtf8String(svg);
      
      expect(svgString).to.include('x="32767"');
      expect(svgString).to.include('y="32767"');
    });
    
    it("Should handle negative coordinate values", async function () {
      const negativeObject: ObjectStruct = {
        shape: 1, // line
        color: hexToBytes3("#FF0000"),
        stroke: 2,
        points: [
          { x: -100, y: -50 },
          { x: 100, y: 50 }
        ]
      };
      
      const packed = encodeObject(negativeObject);
      const packedObjects = [{ base: packed.base, additionalPoints: packed.additionalPoints }];
      
      const svg = await renderer.renderObjects(packedObjects);
      const svgString = ethers.toUtf8String(svg);
      
      console.log("Negative coordinates SVG:", svgString);
      
      expect(svgString).to.include('<line');
      expect(svgString).to.include('x1="-100"');
      expect(svgString).to.include('y1="-50"');
      expect(svgString).to.include('x2="100"');
      expect(svgString).to.include('y2="50"');
    });
    
    it("Should handle minimum coordinate values", async function () {
      const minObject: ObjectStruct = {
        shape: 0, // rect
        color: hexToBytes3("#000000"),
        stroke: 1,
        points: [
          { x: -32768, y: -32768 },
          { x: 100, y: 100 }
        ]
      };
      
      const packed = encodeObject(minObject);
      const packedObjects = [{ base: packed.base, additionalPoints: packed.additionalPoints }];
      
      const svg = await renderer.renderObjects(packedObjects);
      const svgString = ethers.toUtf8String(svg);
      
      expect(svgString).to.include('x="-32768"');
      expect(svgString).to.include('y="-32768"');
    });
  });
});
