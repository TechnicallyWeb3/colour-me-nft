import { expect } from "chai";
import { ethers } from "hardhat";

describe("PaintRenderer", function () {
  let paintRenderer: any;

  beforeEach(async function () {
    const PaintRendererFactory = await ethers.getContractFactory("PaintRenderer");
    paintRenderer = await PaintRendererFactory.deploy();
  });

  describe("_renderTrait", function () {
    it("should render trait SVG correctly", async function () {
      const trait = {
        color0: "0xff0000", // red
        color1: "0x00ff00", // green
        color2: "0x0000ff", // blue
        color3: "0xffff00", // yellow
        color4: "0xff00ff", // magenta
        shape0: 0, // rect
        shape1: 1, // line
        polygon: 3
      };

      const result = await paintRenderer.renderTrait(trait);
      const svgString = ethers.toUtf8String(result);

      // Check that all colors are present
      expect(svgString).to.include("#ff0000");
      expect(svgString).to.include("#00ff00");
      expect(svgString).to.include("#0000ff");
      expect(svgString).to.include("#ffff00");
      expect(svgString).to.include("#ff00ff");

      // Check that shapes and polygon are present
      expect(svgString).to.include('href="#shape-0"');
      expect(svgString).to.include('href="#shape-1"');
      expect(svgString).to.include('href="#polygon-3"');

      // Check SVG structure
      expect(svgString).to.include('<circle');
      expect(svgString).to.include('<use');
      expect(svgString).to.include('class="color-btn"');
      expect(svgString).to.include('class="shape-btn"');
    });
  });

  describe("_renderPath", function () {
    it("should render rect correctly", async function () {
      const object = {
        shape: 0, // rect
        color: "0xff0000",
        stroke: 0,
        points: [
          { x: 10, y: 20 },
          { x: 100, y: 50 }
        ]
      };

      const result = await paintRenderer.renderPath(object);
      const svgString = ethers.toUtf8String(result);

      // console.log(svgString);

      expect(svgString).to.include('<rect');
      expect(svgString).to.include('fill="#ff0000"');
      expect(svgString).to.include('x="10"');
      expect(svgString).to.include('y="20"');
      expect(svgString).to.include('width="100"');
      expect(svgString).to.include('height="50"');
      expect(svgString).to.include('/>');
    });

    it("should render ellipse correctly", async function () {
      const object = {
        shape: 2, // ellipse
        color: "0x00ff00",
        stroke: 0,
        points: [
          { x: 50, y: 50 },
          { x: 30, y: 20 }
        ]
      };

      const result = await paintRenderer.renderPath(object);
      const svgString = ethers.toUtf8String(result);

      expect(svgString).to.include('<ellipse');
      expect(svgString).to.include('fill="#00ff00"');
      expect(svgString).to.include('cx="50"');
      expect(svgString).to.include('cy="50"');
      expect(svgString).to.include('rx="30"');
      expect(svgString).to.include('ry="20"');
      expect(svgString).to.include('/>');
    });

    it("should render line correctly", async function () {
      const object = {
        shape: 1, // line
        color: "0x0000ff",
        stroke: 8,
        points: [
          { x: 10, y: 10 },
          { x: 90, y: 90 }
        ]
      };

      const result = await paintRenderer.renderPath(object);
      const svgString = ethers.toUtf8String(result);

      expect(svgString).to.include('<line');
      expect(svgString).to.include('stroke="#0000ff"');
      expect(svgString).to.include('stroke-width="8"');
      expect(svgString).to.include('x1="10"');
      expect(svgString).to.include('y1="10"');
      expect(svgString).to.include('x2="90"');
      expect(svgString).to.include('y2="90"');
      expect(svgString).to.include('/>');
    });

    it("should render polyline correctly", async function () {
      const object = {
        shape: 3, // polyline
        color: "0xffff00",
        stroke: 15,
        points: [
          { x: 10, y: 10 },
          { x: 50, y: 50 },
          { x: 90, y: 10 }
        ]
      };

      const result = await paintRenderer.renderPath(object);
      const svgString = ethers.toUtf8String(result);

      expect(svgString).to.include('<polyline');
      expect(svgString).to.include('stroke="#ffff00"');
      expect(svgString).to.include('stroke-width="15"');
      expect(svgString).to.include('points="');
      expect(svgString).to.include('10,10 50,50 90,10');
      expect(svgString).to.include('/>');
    });

    it("should render polygon correctly", async function () {
      const object = {
        shape: 4, // polygon
        color: "0xff00ff",
        stroke: 0,
        points: [
          { x: 10, y: 10 },
          { x: 50, y: 10 },
          { x: 30, y: 50 }
        ]
      };

      const result = await paintRenderer.renderPath(object);
      const svgString = ethers.toUtf8String(result);

      expect(svgString).to.include('<polygon');
      expect(svgString).to.include('fill="#ff00ff"');
      expect(svgString).to.include('points="');
      expect(svgString).to.include('10,10 50,10 30,50');
      expect(svgString).to.include('/>');
    });

    it("should render path correctly", async function () {
      const object = {
        shape: 5, // path
        color: "0x00ffff",
        stroke: 25,
        points: [
          { x: 10, y: 10 },
          { x: 50, y: 50 },
          { x: 90, y: 10 },
          { x: 130, y: 50 }
        ]
      };

      const result = await paintRenderer.renderPath(object);
      const svgString = ethers.toUtf8String(result);

      // console.log(svgString);

      expect(svgString).to.include('<path');
      expect(svgString).to.include('stroke="#00ffff"');
      expect(svgString).to.include('stroke-width="25"');
      expect(svgString).to.include('stroke-linecap="round"');
      expect(svgString).to.include('stroke-linejoin="round"');
      expect(svgString).to.include('d="M 10 10');
      expect(svgString).to.include('L 50 50');
      expect(svgString).to.include('L 90 10');
      expect(svgString).to.include('L 130 50');
      expect(svgString).to.include('/>');
    });
  });

  describe("_renderObjects", function () {
    it("should render empty objects array", async function () {
      const objects: any[] = [];

      const result = await paintRenderer.renderObjects(objects);
      const svgString = ethers.toUtf8String(result);

      expect(svgString).to.equal('<g id="drawing-area" clip-path="url(#canvas-clip)"></g>');
    });

    it("should render single object", async function () {
      const objects = [{
        shape: 0, // rect
        color: "0xff0000",
        stroke: 0,
        points: [
          { x: 10, y: 20 },
          { x: 100, y: 50 }
        ]
      }];

      const result = await paintRenderer.renderObjects(objects);
      const svgString = ethers.toUtf8String(result);

      expect(svgString).to.include('<rect');
      expect(svgString).to.include('fill="#ff0000"');
    });

    it("should render multiple objects", async function () {
      const objects = [
        {
          shape: 0, // rect
          color: "0xff0000",
          stroke: 0,
          points: [
            { x: 10, y: 20 },
            { x: 100, y: 50 }
          ]
        },
        {
          shape: 1, // line
          color: "0x00ff00",
          stroke: 8,
          points: [
            { x: 10, y: 10 },
            { x: 90, y: 90 }
          ]
        },
        {
          shape: 2, // ellipse
          color: "0x0000ff",
          stroke: 0,
          points: [
            { x: 50, y: 50 },
            { x: 30, y: 20 }
          ]
        }
      ];

      const result = await paintRenderer.renderObjects(objects);
      const svgString = ethers.toUtf8String(result);

      expect(svgString).to.include('<g id="drawing-area" clip-path="url(#canvas-clip)">');
      expect(svgString).to.include('<rect');
      expect(svgString).to.include('<line');
      expect(svgString).to.include('<ellipse');
      expect(svgString).to.include('fill="#ff0000"');
      expect(svgString).to.include('stroke="#00ff00"');
      expect(svgString).to.include('fill="#0000ff"');
      expect(svgString).to.include('</g>');
    });

    it("should handle complex polygon with many points", async function () {
      const objects = [{
        shape: 4, // polygon
        color: "0x123456",
        stroke: 0,
        points: [
          { x: 10, y: 10 },
          { x: 50, y: 10 },
          { x: 90, y: 30 },
          { x: 70, y: 70 },
          { x: 30, y: 70 },
          { x: 10, y: 50 }
        ]
      }];

      const result = await paintRenderer.renderObjects(objects);
      const svgString = ethers.toUtf8String(result);

      expect(svgString).to.include('<g id="drawing-area" clip-path="url(#canvas-clip)">');
      expect(svgString).to.include('<polygon');
      expect(svgString).to.include('fill="#123456"');
      expect(svgString).to.include('points="');
      expect(svgString).to.include('10,10 50,10 90,30 70,70 30,70 10,50');
      expect(svgString).to.include('/>');
      expect(svgString).to.include('</g>');
    });

    it("should handle complex path with many segments", async function () {
      const objects = [{
        shape: 5, // path
        color: "0xabcdef",
        stroke: 40,
        points: [
          { x: 10, y: 10 },
          { x: 30, y: 30 },
          { x: 50, y: 10 },
          { x: 70, y: 30 },
          { x: 90, y: 10 },
          { x: 110, y: 30 }
        ]
      }];

      const result = await paintRenderer.renderObjects(objects);
      const svgString = ethers.toUtf8String(result);

      // console.log(svgString);

      expect(svgString).to.include('<g id="drawing-area" clip-path="url(#canvas-clip)">');
      expect(svgString).to.include('<path');
      expect(svgString).to.include('stroke="#abcdef"');
      expect(svgString).to.include('stroke-width="40"');
      expect(svgString).to.include('d="M 10 10');
      expect(svgString).to.include('L 30 30');
      expect(svgString).to.include('L 50 10');
      expect(svgString).to.include('L 70 30');
      expect(svgString).to.include('L 90 10');
      expect(svgString).to.include('L 110 30');
      expect(svgString).to.include('/>');
      expect(svgString).to.include('</g>');
    });

    it.skip("should test gas limits by adding paths incrementally", async function () {
      console.log("\n=== Gas Limit Test: Adding Paths Incrementally ===");
      
      let maxObjects = 0;
      let maxPaths = 0;
      let lastSuccessfulGas = 0;
      
      // Test with simple paths (fewer points = less gas)
      for (let objectCount = 1; objectCount <= 100; objectCount++) {
        const objects = [];
        
        for (let i = 0; i < objectCount; i++) {
          objects.push({
            shape: 5, // path
            color: `0x${(i % 0xffffff).toString(16).padStart(6, '0')}`,
            stroke: 8,
            points: [
              { x: 10 + i * 5, y: 10 + i * 5 },
              { x: 50 + i * 5, y: 50 + i * 5 },
              { x: 90 + i * 5, y: 10 + i * 5 }
            ]
          });
        }
        
        try {
          const tx = await paintRenderer.renderObjects(objects);
          const receipt = await tx.wait();
          const gasUsed = receipt.gasUsed;
          
          console.log(`✓ ${objectCount} objects (${objectCount * 2} path segments): ${gasUsed.toString()} gas`);
          
          maxObjects = objectCount;
          maxPaths = objectCount * 2; // Each object has 2 path segments
          lastSuccessfulGas = gasUsed;
          
          // If gas usage is getting high, break early
          if (gasUsed > 2000000) {
            console.log(`⚠️  High gas usage detected, stopping at ${objectCount} objects`);
            break;
          }
          
        } catch (error: any) {
          console.log(`✗ Failed at ${objectCount} objects: ${error.message}`);
          break;
        }
      }
      
      console.log(`\n📊 Results:`);
      console.log(`   Max objects: ${maxObjects}`);
      console.log(`   Max path segments: ${maxPaths}`);
      console.log(`   Last successful gas: ${lastSuccessfulGas}`);
      console.log(`   Gas per object: ${Math.round(lastSuccessfulGas / maxObjects)}`);
      console.log(`   Gas per path segment: ${Math.round(lastSuccessfulGas / maxPaths)}`);
      
      // Test with complex paths (more points = more gas)
      console.log("\n=== Testing Complex Paths ===");
      let maxComplexObjects = 0;
      
      for (let objectCount = 1; objectCount <= 50; objectCount++) {
        const objects = [];
        
        for (let i = 0; i < objectCount; i++) {
          objects.push({
            shape: 5, // path
            color: `0x${(i % 0xffffff).toString(16).padStart(6, '0')}`,
            stroke: 8,
            points: [
              { x: 10 + i * 5, y: 10 + i * 5 },
              { x: 30 + i * 5, y: 30 + i * 5 },
              { x: 50 + i * 5, y: 10 + i * 5 },
              { x: 70 + i * 5, y: 30 + i * 5 },
              { x: 90 + i * 5, y: 10 + i * 5 },
              { x: 110 + i * 5, y: 30 + i * 5 }
            ]
          });
        }
        
        try {
          const tx = await paintRenderer.renderObjects(objects);
          const receipt = await tx.wait();
          const gasUsed = receipt.gasUsed;
          
          console.log(`✓ ${objectCount} complex objects (${objectCount * 5} path segments): ${gasUsed.toString()} gas`);
          
          maxComplexObjects = objectCount;
          
          if (gasUsed > 2000000) {
            console.log(`⚠️  High gas usage detected, stopping at ${objectCount} complex objects`);
            break;
          }
          
        } catch (error: any) {
          console.log(`✗ Failed at ${objectCount} complex objects: ${error.message}`);
          break;
        }
      }
      
      console.log(`\n📊 Complex Path Results:`);
      console.log(`   Max complex objects: ${maxComplexObjects}`);
      console.log(`   Max complex path segments: ${maxComplexObjects * 5}`);
      
      // Verify we can handle at least some objects
      expect(maxObjects).to.be.greaterThan(0);
      expect(maxComplexObjects).to.be.greaterThan(0);
    });
  });

  describe("toRGBString", function () {
    it.skip("should convert RGB bytes to hex string", async function () {
      // Test with pure function call
      const rgb = "0xff0000"; // red
      const result = await paintRenderer.toRGBString(rgb);
      const hexString = ethers.toUtf8String(result);
      
      expect(hexString).to.equal("ff0000");
    });

    it.skip("should handle different colors", async function () {
      const testCases = [
        { input: "0x00ff00", expected: "00ff00" }, // green
        { input: "0x0000ff", expected: "0000ff" }, // blue
        { input: "0xffffff", expected: "ffffff" }, // white
        { input: "0x000000", expected: "000000" }, // black
        { input: "0x123456", expected: "123456" }, // custom
      ];

      for (const testCase of testCases) {
        const result = await paintRenderer.toRGBString(testCase.input);
        const hexString = ethers.toUtf8String(result);
        expect(hexString).to.equal(testCase.expected);
      }
    });
  });
}); 