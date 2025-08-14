import { expect } from "chai";
import { ethers } from "hardhat";
import { ColourMeRenderer, ColourMeNFT } from "../typechain-types";
import { ObjectStruct, TraitStruct } from "../typechain-types/contracts/ColourMeRenderer";
import * as fs from "fs";
import * as path from "path";

describe("ColourMeNFT", function () {
  let cmr: ColourMeRenderer;
  let cmn: ColourMeNFT;
  let owner: any;
  let user1: any;

  let svgStart: string;
  let svgEnd: string;

  function bytesToString(bytes: string) {
    return Buffer.from(bytes.slice(2), 'hex').toString();
  }

  function base64Decode(base64: string) {
    return Buffer.from(base64, 'base64').toString();
  }

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();
    const ColourMeRendererFactory = await ethers.getContractFactory("ColourMeRenderer");
    cmr = await ColourMeRendererFactory.deploy();

    const ColourMeNFTFactory = await ethers.getContractFactory("ColourMeNFT");

    cmn = await ColourMeNFTFactory.deploy(
        "ColourMeNFT",            // string memory name, 
        "CMNFT",                  // string memory symbol,
        "https://colourme.xyz/",  // string memory _baseURL,
        10000,                    // uint256 _maxSupply,
        cmr.target,               // address _colourMeRenderer,
        owner.address,            // address _owner,
        1000                      // uint96 _royalty (10%)
    );
  });

  it("should mint a token", async function () {
    const tx = await cmn.mint(user1.address);
    await tx.wait();
    const tokenId = await cmn.tokenCount();
    expect(tokenId).to.equal(1);
  });

  describe("when the svg is set", function () {
    beforeEach(async function () {
      svgStart = '0x' + fs.readFileSync(path.join(__dirname, "../assets/colour-me.min.start.svg")).toString('hex');
      svgEnd = '0x' + fs.readFileSync(path.join(__dirname, "../assets/colour-me.min.end.svg")).toString('hex');
      // console.log('svgStart: ', bytesToString(svgStart));
      // console.log('svgEnd: ', bytesToString(svgEnd));
      const tx = await cmn.setSVG(svgStart, svgEnd);
      await tx.wait();
  
      const svgBytes = await cmn.tokenSVG(0);
      // console.log('svgBytes: ', bytesToString(svgBytes));
      // const traits: TraitStruct = {
      //     color0: '0x000000',
      //     color1: '0x000000',
      //     color2: '0x000000',
      //     color3: '0x000000',
      //     color4: '0x000000',
      //     shape0: 0,
      //     shape1: 0,
      //     polygon: 0,
      // };
      // console.log('startSVG: ', bytesToString(svgStart));
      expect(bytesToString(svgBytes)).to.include(bytesToString(svgStart));

      // Now token 0 will return just the start and end svg, only returns valid for minted tokens
      // that's why this function is not exposed by the contract, tokenURI checks for valid tokenId
      // const renderedTraitBytes = await paintRenderer.renderTrait(traits);
      // console.log('renderedTraitBytes: ', bytesToString(renderedTraitBytes));
      // expect(bytesToString(svgBytes)).to.include(bytesToString(renderedTraitBytes));
  
      // const objects: ObjectStruct[] = []
      // const renderedObjectBytes = await paintRenderer.renderObjects(objects);
      // console.log('renderedObjectBytes: ', bytesToString(renderedObjectBytes));
      // expect(bytesToString(svgBytes)).to.include(bytesToString(renderedObjectBytes));
      // console.log('endSVG: ', bytesToString(svgEnd));
      expect(bytesToString(svgBytes)).to.include(bytesToString(svgEnd));
      
      // console.log('svgDynamic: ', bytesToString(svgBytes).slice((bytesToString(svgStart)).length, (bytesToString(svgBytes)).length - (bytesToString(svgEnd)).length));
      expect(bytesToString(svgBytes)).to.equal(
          bytesToString(svgStart) 
          + '<g id="drawing-area" clip-path="url(#canvas-clip)" data-token="0"></g>'
          // + bytesToString(renderedTraitBytes) 
          // + bytesToString(renderedObjectBytes) 
          + bytesToString(svgEnd)
      );
    });

    it("should return the correct svg", async function () {
        const tx = await cmn.mint(user1.address);
        await tx.wait();
        const tokenId = await cmn.tokenCount();
        const svg = await cmn.tokenSVG(tokenId);
        // console.log(bytesToString(svg));
    });

    it("should return the correct attributes", async function () {
        const tx = await cmn.mint(user1.address);
        await tx.wait();
        const tokenId = await cmn.tokenCount();
        // console.log(tokenId);
        const traits = await cmn.traits(tokenId) as TraitStruct;
        // console.log(traits);
        const traitsManual = {
            color0: traits.color0,
            color1: traits.color1,
            color2: traits.color2,
            color3: traits.color3,
            color4: traits.color4,
            shape0: traits.shape0,
            shape1: traits.shape1,
            polygon: traits.polygon,
        }
        const attributes = await cmr.getAttributes(traitsManual);
        // console.log(bytesToString(attributes));
        const shape = (shape: bigint) => {
            return shape === 0n ? 'Rectangle' : shape === 1n ? 'Line' : shape === 2n ? 'Ellipse' : 'Polyline';
        }
        const polygon = (polygon: bigint) => {
            return polygon === 3n ? 'Triangle' : polygon === 5n ? 'Pentagon' : 'Hexagon';
        }
        expect(bytesToString(attributes)).to.equal('['
            +'{"trait_type":"Colour1","value":"#' + traits.color0.slice(2) + '"},'
            +'{"trait_type":"Colour2","value":"#' + traits.color1.slice(2) + '"},'
            +'{"trait_type":"Colour3","value":"#' + traits.color2.slice(2) + '"},'
            +'{"trait_type":"Colour4","value":"#' + traits.color3.slice(2) + '"},'
            +'{"trait_type":"Colour5","value":"#' + traits.color4.slice(2) + '"},'
            +'{"trait_type":"Shape1","value":"' + shape(BigInt(traits.shape0)) + '"},'
            +'{"trait_type":"Shape2","value":"' + shape(BigInt(traits.shape1)) + '"},'
            +'{"trait_type":"Shape3","value":"' + polygon(BigInt(traits.polygon)) + '"}'
          +']'
        );
    });

    it("should return the tokenURI", async function () {
        await expect(cmn.tokenURI(1)).to.be.revertedWithCustomError(cmn, "ERC721NonexistentToken");
        // console.log('minting token');
        const tx = await cmn.mint(user1.address);
        await tx.wait();
        // console.log('token minted');
        const tokenURI = await cmn.tokenURI(1);
        // console.log(tokenURI);
        expect(tokenURI).to.include('"external_url":"https://colourme.xyz/#1"');
    });

    it("should save art objects", async function () {
      const tx = await cmn.mint(user1.address);
      await tx.wait();
      const tokenId = await cmn.tokenCount();
      const art = [
        {
          shape: 5n,
          color: '0x000000',
          points: [
            {
              x: 100n,
              y: 100n,
            },
            {
              x: 300n,
              y: 200n,
            }
          ],
          stroke: 8n,
        }
      ]
      const txArt = await cmn.setArt(tokenId, art);
      await txArt.wait();
      const uri = await cmn.tokenURI(tokenId);
      // console.log('uri: ', uri);
      const artObjects = JSON.parse(uri).image_data.split('data:image/svg+xml;base64,')[1];
      // console.log('artObjects: ', artObjects);
      // base64 decode the artObjects
      const svg = base64Decode(artObjects);
      // console.log('svg: ', svg);
  
      const userArt = svg.split(`<g id="drawing-area" clip-path="url(#canvas-clip)" data-token="${tokenId}">`)[1].split('</g>')[0];
      // console.log('userArt: ', userArt);
  
      expect(userArt).to.include('<path stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="#000000" stroke-width="8" d="M100 100 L300 200"/>');
      
    });
  
    it("should save large art objects", async function () {
      this.timeout(300000);
      const tx = await cmn.mint(user1.address);
      await tx.wait();
      const tokenId = await cmn.tokenCount();
      
      let totalPaths = 0;
      let totalPoints = 0;
      let maxLength = 0;
      let maxPoints = 0;
      let svg = '';
      
      for (let i = 0; i < 100; i++) {
        // Generate random number of points between 1 and 1000
        const pointCount = Math.floor(Math.random() * 1000) + 1;
        
        // Generate random path
        const paths = [];
        for (let j = 0; j < pointCount; j++) {
          if (j === 0) {
            // First point: random x/y between 1-1000
            paths.push({
              x: Math.floor(Math.random() * 1000) + 1,
              y: Math.floor(Math.random() * 1000) + 1,
            });
          } else {
            // Subsequent points: -50 to +50 from previous point, keeping within limits
            const prevPoint = paths[j - 1];
            const deltaX = Math.floor(Math.random() * 101) - 50; // -50 to +50
            const deltaY = Math.floor(Math.random() * 101) - 50; // -50 to +50
            
            const newX = Math.max(1, Math.min(1000, prevPoint.x + deltaX));
            const newY = Math.max(1, Math.min(1000, prevPoint.y + deltaY));
            
            paths.push({ x: newX, y: newY });
          }
        }
        
        const art = [
          {
            shape: 5,
            color: i % 2 === 0 ? '0x000000' : '0xffffff',
            points: paths,
            stroke: 15,
          }
        ];
        
        try {
          const txArt = await cmn.appendArt(tokenId, art);
          await txArt.wait();
          totalPaths++;
          totalPoints += pointCount;
          maxPoints = Math.max(maxPoints, pointCount);
          
          // console.log(`Path ${totalPaths}: ${pointCount} points, Total points: ${totalPoints}`);
          
        } catch (setError) {
          // console.log(`setArt transaction reverted. Object summary: ${pointCount} points, ${maxPoints} max points`);
          // console.log(setError);
          return; // Exit the loop if setArt fails
        }

        // Try to get tokenURI to check if it's still valid
        try {
          const uri = await cmn.tokenURI(tokenId);
          const imageData = JSON.parse(uri).image_data;
          maxLength = uri.length;
          if (i%10 === 0) {
            // console.log(`TokenURI Length: ${uri.length} bytes, max points: ${maxPoints}`);
          }
          svg = base64Decode(imageData.split('data:image/svg+xml;base64,')[1]);
        } catch (uriError) {
          // console.log( `TokenURI reverted after ${totalPaths} paths, ${totalPoints} total points, max points: ${maxPoints}, max length: ${maxLength} bytes`);
          fs.writeFileSync(path.join(__dirname, "../assets/colour-me.test.svg"), svg);
          return; // Exit the loop if tokenURI fails
        }
      }
    });

    let largestPath: ObjectStruct[] = [];

    it("should find the max points", async function () {
      this.timeout(300000);
      const tx = await cmn.mint(user1.address);
      await tx.wait();
      const tokenId = await cmn.tokenCount();
      let succeed = true;

      const art = [
        {
          shape: 5,
          color: '0x000000',
          points: [{
            x: Math.floor(Math.random() * 980) + 1,
            y: Math.floor(Math.random() * 900) + 1,
          }],
          stroke: 15,
        }
      ];

      function newPoint() {
        const prevPoint = art[0].points[art[0].points.length - 1];
        const deltaX = Math.floor(Math.random() * 101) - 50; // -50 to +50
        const deltaY = Math.floor(Math.random() * 101) - 50; // -50 to +50
        const newX = Math.max(1, Math.min(980, prevPoint.x + deltaX));
        const newY = Math.max(1, Math.min(900, prevPoint.y + deltaY));
        return {
          x: newX,
          y: newY,
        };
      }

      const addPoints = 100;
      let writes = 0;
      let tokenURILength = 0;

      while (succeed) {
        for (let i = 0; i < addPoints; i++) {
          art[0].points.push(newPoint());
        }
        try {
          await cmn.setArt(tokenId, art);
          writes++;
          if (writes % 10 === 0) {
            console.log(`Written points: ${art[0].points.length}`);
          }
        } catch (error) {
          console.log(`Failed to set art, max points: ${art[0].points.length}`);
          art[0].points = art[0].points.slice(0, -(addPoints * 2));
          largestPath = art;
          // console.log('largestPath: ', largestPath[0].points.length);
          succeed = false;
        }

        try {
          expect(await cmn.tokenURI(tokenId)).to.not.be.reverted;
          const tokenURI = await cmn.tokenURI(tokenId);
          tokenURILength = tokenURI.length;
        } catch (error) {
          console.log(`Failed to get tokenURI after ${writes} writes, length: ${tokenURILength} bytes`);
          succeed = false;
        }
      }
    });

    it("should find the max paths", async function () {
      this.timeout(300000);
      const tx = await cmn.mint(user1.address);
      await tx.wait();
      const tokenId = await cmn.tokenCount();

      let points = [{
        x: 100,
        y: 100,
      }];

      function newPoint() {
        const prevPoint = points[points.length - 1];
        const deltaX = Math.floor(Math.random() * 101) - 50; // -50 to +50
        const deltaY = Math.floor(Math.random() * 101) - 50; // -50 to +50
        const newX = Math.max(1, Math.min(980, prevPoint.x + deltaX));
        const newY = Math.max(1, Math.min(900, prevPoint.y + deltaY));
        return {
          x: newX,
          y: newY,
        };
      }

      for (let i = 0; i < 999; i++) {
        points.push(newPoint());
      }

      const artSet = [{
        shape: 5,
        color: '0x000000',
        points: points,
        stroke: 15,
      }];

      const txSet = await cmn.setArt(tokenId, artSet);
      await txSet.wait();
      let succeed = true;
      let writes = 1;

      // console.log('largestPath: ', largestPath[0].points.length);

      while (succeed) {
        try {
          const txAppend = await cmn.appendArt(tokenId, artSet);
          await txAppend.wait();
          writes++;
        } catch (error) {
          console.log(`Failed to append art after ${writes} writes`);
          succeed = false;
        }

        try {
          const uri = await cmn.tokenURI(tokenId);
          if (writes % 50 === 0) {
            console.log(`Written paths: ${writes}, total size: ${uri.length}`);
          }
        } catch (error) {
          console.log(`Failed to get tokenURI after ${writes} writes`);
          succeed = false;
        }
      }
    });

    describe("Art validation rules", function () {
      let tokenId: bigint;
      let traits: TraitStruct;

      beforeEach(async function () {
        const tx = await cmn.mint(user1.address);
        await tx.wait();
        tokenId = await cmn.tokenCount();
        traits = await cmn.traits(tokenId) as TraitStruct;
      });

      describe("Shape validation", function () {
        it("should accept valid shapes from traits", async function () {
          const validShapes = [traits.shape0, traits.shape1];
          
          for (const shape of validShapes) {
            const art = [{
              shape: Number(shape),
              color: '0x000000',
              points: [{ x: 100n, y: 100n }, { x: 200n, y: 200n }],
              stroke: 8n,
            }];
            
            await expect(cmn.setArt(tokenId, art)).to.not.be.reverted;
          }
        });

        it("should accept polygon and path shapes", async function () {
          const tokenId = await cmn.tokenCount();
          const traits = await cmn.traits(tokenId);
          
          // Test polygon shape (always allowed) - use the token's polygon trait
          const polygonArt = [{
            shape: 4, // polygon (Path.polygon)
            color: traits.color0,
            points: Array.from({ length: Number(traits.polygon) }, (_, i) => ({ 
              x: BigInt(100 + i * 50), 
              y: BigInt(100 + i * 25) 
            })),
            stroke: 0n,
          }];
          
          await expect(cmn.setArt(tokenId, polygonArt)).to.not.be.reverted;
          
          // Test path shape (always allowed) - but only with valid strokes
          const pathArt = [{
            shape: 5, // path (Path.path)
            color: '0x000000',
            points: [{ x: 200n, y: 200n }, { x: 300n, y: 300n }, { x: 400n, y: 200n }],
            stroke: 8n, // Must be 8, 15, 25, or 40 for path
          }];
          
          await expect(cmn.setArt(tokenId, pathArt)).to.not.be.reverted;
        });

        it("should reject invalid shapes", async function () {
          const tokenId = await cmn.tokenCount();
          const traits = await cmn.traits(tokenId);
          
          // Test shapes that are NOT in the token's traits and are not polygon/path
          // We need to find shapes that are NOT allowed for this specific token
          const allShapes = [0, 1, 2, 3]; // rect, ellipse, line, polyline
          const allowedShapes = [Number(traits.shape0), Number(traits.shape1)];
          
          // Find shapes that are NOT allowed for this token
          const invalidShapes = allShapes.filter(shape => !allowedShapes.includes(shape));
          
          for (const shape of invalidShapes) {
            const art = [{
              shape: shape,
              color: '0x000000',
              points: [{ x: 100n, y: 100n }, { x: 200n, y: 200n }],
              stroke: 8n,
            }];
            
            await expect(cmn.setArt(tokenId, art)).to.be.revertedWithCustomError(
              cmn, "InvalidShape"
            );
          }
        });
      });

      describe("Color validation", function () {
        it("should accept black and white colors", async function () {
          const tokenId = await cmn.tokenCount();
          const traits = await cmn.traits(tokenId);
          
          // Find a valid shape for this token (either from traits or polygon/path)
          const validShape = traits.shape0; // Use the first allowed shape
          
          const validColors = ['0x000000', '0xffffff'];
          
          for (const color of validColors) {
            const art = [{
              shape: Number(validShape),
              color: color,
              points: [{ x: 100n, y: 100n }, { x: 200n, y: 200n }],
              stroke: 8n,
            }];
            
            await expect(cmn.setArt(tokenId, art)).to.not.be.reverted;
          }
        });

        it("should accept colors from traits", async function () {
          const tokenId = await cmn.tokenCount();
          const traits = await cmn.traits(tokenId);
          
          // Find a valid shape for this token (either from traits or polygon/path)
          const validShape = traits.shape0; // Use the first allowed shape
          
          const validColors = [traits.color0, traits.color1, traits.color2, traits.color3, traits.color4];
          
          for (const color of validColors) {
            const art = [{
              shape: Number(validShape),
              color: color,
              points: [{ x: 100n, y: 100n }, { x: 200n, y: 200n }],
              stroke: 8n,
            }];
            
            await expect(cmn.setArt(tokenId, art)).to.not.be.reverted;
          }
        });

        it("should reject invalid colors", async function () {
          const tokenId = await cmn.tokenCount();
          const traits = await cmn.traits(tokenId);
          
          // Find a valid shape for this token (either from traits or polygon/path)
          const validShape = traits.shape0; // Use the first allowed shape
          
          const invalidColors = ['0x123456', '0xabcdef', '0xff0000', '0x00ff00', '0x0000ff'];
          
          for (const color of invalidColors) {
            const art = [{
              shape: Number(validShape),
              color: color,
              points: [{ x: 100n, y: 100n }, { x: 200n, y: 200n }],
              stroke: 8n,
            }];
            
            await expect(cmn.setArt(tokenId, art)).to.be.revertedWithCustomError(
              cmn, "InvalidColor"
            );
          }
        });
      });

      describe("Stroke validation (now accepts any stroke)", function () {
        it("should accept any stroke for line/polyline/path shapes", async function () {
          const tokenId = await cmn.tokenCount();
          const traits = await cmn.traits(tokenId);
          
          const anyStrokes = [0n, 1n, 5n, 10n, 20n, 30n, 50n, 100n];
          const lineShapes = [2, 3, 5]; // line, polyline, path
          
          // Only test shapes that are actually allowed for this token
          const allowedShapes = [Number(traits.shape0), Number(traits.shape1)];
          const testableShapes = lineShapes.filter(shape => allowedShapes.includes(shape));
          
          // If no line shapes are allowed, skip this test
          if (testableShapes.length === 0) {
            this.skip();
            return;
          }
          
          for (const shape of testableShapes) {
            for (const stroke of anyStrokes) {
              const points = shape === 2 ? 
                [{ x: 100n, y: 100n }, { x: 200n, y: 200n }] :
                [{ x: 100n, y: 100n }, { x: 150n, y: 150n }, { x: 200n, y: 200n }];
              
              const art = [{
                shape: shape,
                color: '0x000000',
                points: points,
                stroke: stroke,
              }];
              
              await expect(cmn.setArt(tokenId, art)).to.not.be.reverted;
            }
          }
        });

        it("should accept any stroke for line/polyline/path shapes (stroke validation removed)", async function () {
          const tokenId = await cmn.tokenCount();
          const traits = await cmn.traits(tokenId);
          
          const anyStrokes = [0n, 1n, 5n, 10n, 20n, 30n, 50n, 100n];
          const lineShapes = [2, 3, 5]; // line, polyline, path
          
          // Only test shapes that are actually allowed for this token
          const allowedShapes = [Number(traits.shape0), Number(traits.shape1)];
          const testableShapes = lineShapes.filter(shape => allowedShapes.includes(shape));
          
          // If no line shapes are allowed, skip this test
          if (testableShapes.length === 0) {
            this.skip();
          }
          
          for (const shape of testableShapes) {
            for (const stroke of anyStrokes) {
              const points = shape === 2 ? 
                [{ x: 100n, y: 100n }, { x: 200n, y: 200n }] :
                [{ x: 100n, y: 100n }, { x: 150n, y: 150n }, { x: 200n, y: 200n }];
              
              const art = [{
                shape: shape,
                color: '0x000000',
                points: points,
                stroke: stroke,
              }];
              
              // Since stroke validation was removed, all strokes should now be accepted
              await expect(cmn.setArt(tokenId, art)).to.not.be.reverted;
            }
          }
        });

        it("should accept any stroke for rect/ellipse/polygon shapes", async function () {
          const tokenId = await cmn.tokenCount();
          const traits = await cmn.traits(tokenId);
          
          const anyStrokes = [1n, 5n, 10n, 20n, 30n, 50n, 100n];
          const solidShapes = [0, 1, 4]; // rect, ellipse, polygon
          
          // Only test shapes that are actually allowed for this token
          const allowedShapes = [Number(traits.shape0), Number(traits.shape1)];
          const testableShapes = solidShapes.filter(shape => {
            if (shape === 4) return true; // polygon is always allowed
            return allowedShapes.includes(shape);
          });
          
          // If no solid shapes are allowed, skip this test
          if (testableShapes.length === 0) {
            this.skip();
            return;
          }
          
          for (const shape of testableShapes) {
            for (const stroke of anyStrokes) {
              let points;
              if (shape === 4) {
                // For polygon, use the correct number of points from traits
                points = Array.from({ length: Number(traits.polygon) }, (_, i) => ({ 
                  x: BigInt(100 + i * 50), 
                  y: BigInt(100 + i * 25) 
                }));
              } else {
                // For rect/ellipse, use 2 points
                points = [{ x: 100n, y: 100n }, { x: 200n, y: 200n }];
              }
              
              const art = [{
                shape: shape,
                color: '0x000000',
                points: points,
                stroke: stroke,
              }];
              
              await expect(cmn.setArt(tokenId, art)).to.not.be.reverted;
            }
          }
        });
      });

      describe("Point validation", function () {
        it("should require exactly 2 points for rect/ellipse/line shapes", async function () {
          const tokenId = await cmn.tokenCount();
          const traits = await cmn.traits(tokenId);
          
          const twoPointShapes = [0, 1, 2]; // rect, ellipse, line
          
          // Only test shapes that are actually allowed for this token
          const allowedShapes = [Number(traits.shape0), Number(traits.shape1)];
          const testableShapes = twoPointShapes.filter(shape => allowedShapes.includes(shape));
          
          // If no two-point shapes are allowed, skip this test
          if (testableShapes.length === 0) {
            this.skip();
            return;
          }
          
          for (const shape of testableShapes) {
            // Test with 1 point (should fail)
            const art1Point = [{
              shape: shape,
              color: '0x000000',
              points: [{ x: 100n, y: 100n }],
              stroke: 8n,
            }];
            
            await expect(cmn.setArt(tokenId, art1Point)).to.be.revertedWithCustomError(
              cmn, "InvalidPoints"
            );

            // Test with 3 points (should fail)
            const art3Points = [{
              shape: shape,
              color: '0x000000',
              points: [{ x: 100n, y: 100n }, { x: 200n, y: 200n }, { x: 300n, y: 300n }],
              stroke: 8n,
            }];
            
            await expect(cmn.setArt(tokenId, art3Points)).to.be.revertedWithCustomError(
              cmn, "InvalidPoints"
            );

            // Test with 2 points (should pass)
            const art2Points = [{
              shape: shape,
              color: '0x000000',
              points: [{ x: 100n, y: 100n }, { x: 200n, y: 200n }],
              stroke: 8n,
            }];
            
            await expect(cmn.setArt(tokenId, art2Points)).to.not.be.reverted;
          }
        });

        it("should require correct polygon point count", async function () {
          const tokenId = await cmn.tokenCount();
          const traits = await cmn.traits(tokenId);
          
          const polygonShape = 4;
          const expectedPoints = Number(traits.polygon);
          
          // Test with wrong number of points (should fail)
          const wrongPoints = expectedPoints === 3 ? 5 : 3;
          const artWrongPoints = [{
            shape: polygonShape,
            color: '0x000000',
            points: Array.from({ length: wrongPoints }, (_, i) => ({ 
              x: BigInt(100 + i * 50), 
              y: BigInt(100 + i * 25) 
            })),
            stroke: 8n,
          }];
          
          await expect(cmn.setArt(tokenId, artWrongPoints)).to.be.revertedWithCustomError(
            cmn, "InvalidPoints"
          );

          // Test with correct number of points (should pass)
          const artCorrectPoints = [{
            shape: polygonShape,
            color: '0x000000',
            points: Array.from({ length: expectedPoints }, (_, i) => ({ 
              x: BigInt(100 + i * 50), 
              y: BigInt(100 + i * 25) 
            })),
            stroke: 8n,
          }];
          
          await expect(cmn.setArt(tokenId, artCorrectPoints)).to.not.be.reverted;
        });

        it("should accept variable points for polyline/path shapes", async function () {
          const tokenId = await cmn.tokenCount();
          const traits = await cmn.traits(tokenId);
          
          const variablePointShapes = [3, 5]; // polyline, path
          
          // Only test shapes that are actually allowed for this token
          const allowedShapes = [Number(traits.shape0), Number(traits.shape1)];
          const testableShapes = variablePointShapes.filter(shape => allowedShapes.includes(shape));
          
          // If no variable point shapes are allowed, skip this test
          if (testableShapes.length === 0) {
            this.skip();
            return;
          }
          
          for (const shape of testableShapes) {
            // Test with 1 point (should pass)
            const art1Point = [{
              shape: shape,
              color: '0x000000',
              points: [{ x: 100n, y: 100n }, { x: 200n, y: 200n }],
              stroke: 8n,
            }];
            
            await expect(cmn.setArt(tokenId, art1Point)).to.not.be.reverted;

            // Test with many points (should pass)
            const artManyPoints = [{
              shape: shape,
              color: '0x000000',
              points: Array.from({ length: 100 }, (_, i) => ({ 
                x: BigInt(100 + i), 
                y: BigInt(100 + i) 
              })),
              stroke: 8n,
            }];
            
            await expect(cmn.setArt(tokenId, artManyPoints)).to.not.be.reverted;
          }
        });
      });

      describe("Combined validation", function () {
        it("should reject art with multiple validation failures", async function () {
          const tokenId = await cmn.tokenCount();
          const traits = await cmn.traits(tokenId);
          
          const invalidArt = [{
            shape: 99, // invalid shape
            color: '0x123456', // invalid color
            points: [{ x: 100n, y: 100n }], // wrong point count for rect
            stroke: 99n, // invalid stroke
          }];
          
          // Should fail with first validation error (InvalidShape)
          // enum failure leading to reverted without a reason error
          await expect(cmn.setArt(tokenId, invalidArt)).to.be.reverted; // WithCustomError(
          //   paintNFT, "InvalidShape"
          // );
        });

        it("should accept complex valid art", async function () {
          const tokenId = await cmn.tokenCount();
          const traits = await cmn.traits(tokenId);
          
          // Build complex art using only shapes and colors that are valid for this token
          const complexArt = [];
          
          // Add a valid shape from traits (if available)
          if (traits.shape0 !== undefined) {
            complexArt.push({
              shape: Number(traits.shape0),
              color: traits.color0,
              points: [{ x: 100n, y: 100n }, { x: 200n, y: 200n }],
              stroke: 0n,
            });
          }
          
          // Add a line if it's allowed (with valid stroke)
          if (Number(traits.shape0) === 2 || Number(traits.shape1) === 2) {
            complexArt.push({
              shape: 2, // line
              color: '0x000000',
              points: [{ x: 150n, y: 150n }, { x: 250n, y: 250n }],
              stroke: 15n,
            });
          }
          
          // Add polygon (always allowed)
          complexArt.push({
            shape: 4, // polygon
            color: '0xffffff',
            points: Array.from({ length: Number(traits.polygon) }, (_, i) => ({ 
              x: BigInt(300 + i * 50), 
              y: BigInt(300 + i * 25) 
            })),
            stroke: 8n,
          });
          
          // If we have no valid shapes to test, skip this test
          if (complexArt.length === 0) {
            this.skip();
            return;
          }
          
          await expect(cmn.setArt(tokenId, complexArt)).to.not.be.reverted;
        });
      });
    });
  });
});