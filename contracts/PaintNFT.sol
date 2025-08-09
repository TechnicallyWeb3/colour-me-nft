// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.20;

import "./interfaces/IPaintRenderer.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

contract PaintNFT is ERC721, Ownable {
    using Strings for uint256;
    using Base64 for bytes;

    constructor(
        string memory name, 
        string memory symbol,
        string memory _baseURL,
        uint256 _maxSupply,
        address _paintRenderer,
        address _owner
    ) ERC721(name, symbol) Ownable(_owner) {
        baseURL = _baseURL;
        maxSupply = _maxSupply;
        paintRenderer = IPaintRenderer(_paintRenderer);
    }

    string public baseURL;
    bytes public svgStart;
    bytes public svgEnd;
    uint256 public tokenCount;
    uint256 public maxSupply;
    IPaintRenderer public paintRenderer;

    mapping(uint256 => Trait) public traits;
    mapping(uint256 => Object[]) public art;

    function setSVG(bytes memory _svgStart, bytes memory _svgEnd) external onlyOwner {
        svgStart = _svgStart;
        svgEnd = _svgEnd;
    }

    function _randomTraits(uint256 tokenId) internal view returns (Trait memory) {
        uint24[] memory colors = new uint24[](5);
        colors[0] = uint24(random_(tokenId, 1, 0xfffffe));
        colors[1] = uint24(random_(colors[0], 1, 0xfffffd));
        if (colors[1] >= colors[0]) colors[1] ++;
        colors[2] = uint24(random_(colors[1], 1, 0xfffffc));
        if (colors[2] >= colors[0]) colors[2] ++;
        if (colors[2] >= colors[1]) colors[2] ++;
        colors[3] = uint24(random_(colors[2], 1, 0xfffffb));
        if (colors[3] == colors[0]) colors[3] ++;
        if (colors[3] >= colors[1]) colors[3] ++;
        if (colors[3] >= colors[2]) colors[3] ++;
        colors[4] = uint24(random_(colors[3], 1, 0xfffffa));
        if (colors[4] >= colors[0]) colors[4] ++;
        if (colors[4] >= colors[1]) colors[4] ++;
        if (colors[4] >= colors[2]) colors[4] ++;
        if (colors[4] >= colors[3]) colors[4] ++;
        uint8[] memory shapes = new uint8[](2);
        shapes[0] = uint8(random_(colors[4], 0, 3));
        shapes[1] = uint8(random_(shapes[0], 0, 2));
        if (shapes[1] >= shapes[0]) shapes[1] ++;
        uint8 polygon = uint8(random_(shapes[1], 4, 6));
        if (polygon == 4) polygon = 3;
        return Trait({
            color0: bytes3(colors[0]),
            color1: bytes3(colors[1]),
            color2: bytes3(colors[2]),
            color3: bytes3(colors[3]),
            color4: bytes3(colors[4]),
            shape0: Path(shapes[0]),
            shape1: Path(shapes[1]),
            polygon: polygon
        });
    }

    function mint(address to) external {
        tokenCount++;
        _mint(to, tokenCount);
        traits[tokenCount] = _randomTraits(tokenCount);
    }

    function setArt(uint256 tokenId, Object[] memory _art) external {
        // Clear existing art
        delete art[tokenId];
        
        // Copy objects one at a time, handling nested arrays
        for (uint256 i = 0; i < _art.length; i++) {
            Object storage newObject = art[tokenId].push();
            newObject.shape = _art[i].shape;
            newObject.color = _art[i].color;
            newObject.stroke = _art[i].stroke;
            
            // Copy points array
            for (uint256 j = 0; j < _art[i].points.length; j++) {
                Point storage newPoint = newObject.points.push();
                newPoint.x = _art[i].points[j].x;
                newPoint.y = _art[i].points[j].y;
            }
        }
    }

    function appendArt(uint256 tokenId, Object[] memory _object) external {
        for (uint256 i = 0; i < _object.length; i++) {
            Object storage newObject = art[tokenId].push();
            newObject.shape = _object[i].shape;
            newObject.color = _object[i].color;
            newObject.stroke = _object[i].stroke;
            
            // Copy points array
            for (uint256 j = 0; j < _object[i].points.length; j++) {
                Point storage newPoint = newObject.points.push();
                newPoint.x = _object[i].points[j].x;
                newPoint.y = _object[i].points[j].y;
            }
        }
    }

    function _renderSVG(uint256 tokenId) internal view returns (bytes memory) {
        return abi.encodePacked(
            svgStart, 
            paintRenderer.renderTrait(traits[tokenId]),
            paintRenderer.renderObjects(art[tokenId]), 
            svgEnd
        );
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return string(abi.encodePacked(
            '{"name":"', name(), ' #', tokenId.toString(), '",',
                '"description":"Color your NFT your way. Proving you can create an SVG using an SVG on the blockchain",',
                '"external_url":"', baseURL,'#', tokenId.toString(), '",',
                '"image_data":"', _renderSVG(tokenId).encode(), '",'
                '"attributes":', paintRenderer.getAttributes(traits[tokenId]),
            '"}'
        ));
    }
}