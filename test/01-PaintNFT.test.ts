import { expect } from "chai";
import { ethers } from "hardhat";
import { TestPaintNFT, PaintRenderer } from "../typechain-types";
import { ObjectStruct, TraitStruct } from "../typechain-types/contracts/test/TestPaintNFT";
import * as fs from "fs";
import * as path from "path";

describe("PaintNFT", function () {
  let paintRenderer: PaintRenderer;
  let paintNFT: TestPaintNFT;
  let owner: any;
  let user1: any;

  let svgStart: string;
  let svgEnd: string;

  function bytesToString(bytes: string) {
    return Buffer.from(bytes.slice(2), 'hex').toString();
  }

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();
    const PaintRendererFactory = await ethers.getContractFactory("PaintRenderer");
    paintRenderer = await PaintRendererFactory.deploy();

    const PaintNFTFactory = await ethers.getContractFactory("TestPaintNFT");

    paintNFT = await PaintNFTFactory.deploy(
        "PaintCanvas",              // string memory name, 
        "PAINTCAN",                 // string memory symbol,
        "https://paintcan.xyz/",    // string memory _baseURL,
        10000,                      // uint256 _maxSupply,
        paintRenderer.target,       // address _paintRenderer,
        owner.address               // address _owner
    );
  });

  it("should mint a token", async function () {
    const tx = await paintNFT.mint(user1.address);
    await tx.wait();
    const tokenId = await paintNFT.tokenCount();
    expect(tokenId).to.equal(1);
  });

  describe("when the svg is set", function () {
    beforeEach(async function () {
      svgStart = '0x' + fs.readFileSync(path.join(__dirname, "../assets/paint.final.start.svg")).toString('hex');
      svgEnd = '0x' + fs.readFileSync(path.join(__dirname, "../assets/paint.final.end.svg")).toString('hex');
  
      const tx = await paintNFT.setSVG(svgStart, svgEnd);
      await tx.wait();
  
      const svgBytes = await paintNFT.exposed_renderSVG(0);
      // console.log(Buffer.from(svgBytes.slice(2), 'hex').toString());
      const traits: TraitStruct = {
          color0: '0x000000',
          color1: '0x000000',
          color2: '0x000000',
          color3: '0x000000',
          color4: '0x000000',
          shape0: 0,
          shape1: 0,
          polygon: 0,
      };
      const renderedTraitBytes = await paintRenderer.renderTrait(traits);
      // console.log(Buffer.from(renderedTraitBytes.slice(2), 'hex').toString());
  
      const objects: ObjectStruct[] = []
      const renderedObjectBytes = await paintRenderer.renderObjects(objects);
      // console.log(Buffer.from(renderedObjectBytes.slice(2), 'hex').toString());
      
      expect(bytesToString(svgBytes)).to.equal(
          bytesToString(svgStart) 
          + bytesToString(renderedTraitBytes) 
          + bytesToString(renderedObjectBytes) 
          + bytesToString(svgEnd)
      );
    });

    it("should return the correct svg", async function () {
        const tx = await paintNFT.mint(user1.address);
        await tx.wait();
        const tokenId = await paintNFT.tokenCount();
        const svg = await paintNFT.exposed_renderSVG(tokenId);
        // console.log(bytesToString(svg));
    });

    it("should return the correct attributes", async function () {
        const tx = await paintNFT.mint(user1.address);
        await tx.wait();
        const tokenId = await paintNFT.tokenCount();
        console.log(tokenId);
        const traits = await paintNFT.traits(tokenId) as TraitStruct;
        console.log(traits.color0);
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
        const attributes = await paintRenderer.getAttributes(traitsManual);
        console.log(bytesToString(attributes));
        const shape = (shape: bigint) => {
            return shape === 0n ? 'Rectangle' : shape === 1n ? 'Ellipse' : shape === 2n ? 'Line' : 'Polyline';
        }
        const polygon = (polygon: bigint) => {
            return polygon === 3n ? 'Triangle' : polygon === 5n ? 'Pentagon' : 'Hexagon';
        }
        expect(bytesToString(attributes)).to.equal('['
            +'{"trait_type":"Color1","value":"#' + traits.color0.slice(2) + '"},'
            +'{"trait_type":"Color2","value":"#' + traits.color1.slice(2) + '"},'
            +'{"trait_type":"Color3","value":"#' + traits.color2.slice(2) + '"},'
            +'{"trait_type":"Color4","value":"#' + traits.color3.slice(2) + '"},'
            +'{"trait_type":"Color5","value":"#' + traits.color4.slice(2) + '"},'
            +'{"trait_type":"Shape1","value":"' + shape(BigInt(traits.shape0)) + '"},'
            +'{"trait_type":"Shape2","value":"' + shape(BigInt(traits.shape1)) + '"},'
            +'{"trait_type":"Shape3","value":"' + polygon(BigInt(traits.polygon)) + '"}'
          +']'
        );
    });

    it("should return the tokenURI", async function () {
        await expect(paintNFT.tokenURI(1)).to.be.revertedWithCustomError(paintNFT, "ERC721NonexistentToken");
        // console.log('minting token');
        const tx = await paintNFT.mint(user1.address);
        await tx.wait();
        // console.log('token minted');
        const tokenURI = await paintNFT.tokenURI(1);
        // console.log(tokenURI);
        expect(tokenURI).to.include('"external_url":"https://paintcan.xyz/#1"');
    });

  });
});