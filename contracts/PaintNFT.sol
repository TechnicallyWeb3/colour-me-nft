// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.20;

import "./interfaces/IPaintRenderer.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

interface IPaintNFT is IERC721 {
    function mint(address to) external;
    function setArt(uint256 tokenId, Object[] memory _art) external;
    function appendArt(uint256 tokenId, Object[] memory _object) external;
    function tokenSVG(uint256 tokenId) external view returns (bytes memory);
    function tokenURI(uint256 tokenId) external view returns (string memory);
}

contract PaintNFT is ERC721, ERC2981, Ownable {
    using Strings for uint256;
    using Base64 for bytes;

    constructor(
        string memory name, 
        string memory symbol,
        string memory _baseURL,
        uint256 _maxSupply,
        address _paintRenderer,
        address _owner,
        uint96 _royalty
    ) ERC721(name, symbol) Ownable(_owner) {
        baseURL = _baseURL;
        maxSupply = _maxSupply;
        paintRenderer = IPaintRenderer(_paintRenderer);
        _setDefaultRoyalty(owner(), _royalty);
    }

    string public baseURL;
    bytes public svgStart;
    bytes public svgEnd;
    uint256 public tokenCount;
    uint256 public maxSupply;
    IPaintRenderer public paintRenderer;

    mapping(uint256 => Trait) public traits;
    mapping(uint256 => bytes) public traitSVG;
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
        traitSVG[tokenCount] = paintRenderer.renderTrait(traits[tokenCount]);
    }

    function _objectAllowed(uint256 tokenId, Object memory object) internal view {
        // do we make this less restrictive? Let hackers make dope art?
        if (!(
            object.shape == traits[tokenId].shape0 || 
            object.shape == traits[tokenId].shape1 ||
            object.shape == Path.polygon ||
            object.shape == Path.path ||
            object.shape > Path.path
        )) {
            revert InvalidShape(object.shape);
        }
        if (!(
            object.color == 0x000000 ||
            object.color == 0xffffff ||
            object.color == traits[tokenId].color0 || 
            object.color == traits[tokenId].color1 || 
            object.color == traits[tokenId].color2 || 
            object.color == traits[tokenId].color3 || 
            object.color == traits[tokenId].color4
        )) {
            revert InvalidColor(object.color);
        }
        if (
            object.shape == Path.polyline ||
            object.shape == Path.path
        ) { 
            if (object.points.length < 2) {
                revert InvalidPoints(object.points.length);
            }
        }
        // find MAX_POINTS for ethereum transaction limits
        if (
            object.shape == Path.rect || 
            object.shape == Path.ellipse || 
            object.shape == Path.line
        ) {
            if (object.points.length != 2) {
                revert InvalidPoints(object.points.length);
            }
        } else if (object.shape == Path.polygon) {
            if (object.points.length != traits[tokenId].polygon) {
                revert InvalidPoints(object.points.length);
            }
        }
        // pass
    }

    function setArt(uint256 tokenId, Object[] memory _art) external {
        delete art[tokenId];

        for (uint256 i = 0; i < _art.length; i++) {
            _objectAllowed(tokenId, _art[i]);
            art[tokenId].push();
            art[tokenId][i].color = _art[i].color; 
            art[tokenId][i].shape = _art[i].shape;
            art[tokenId][i].stroke = _art[i].stroke;
            for (uint256 j = 0; j < _art[i].points.length; j++) {
                art[tokenId][i].points.push(_art[i].points[j]);
            }
        }
    }

    function appendArt(uint256 tokenId, Object[] memory _object) external {
        uint256 artLength = art[tokenId].length;
        for (uint256 i = 0; i < _object.length; i++) {
            _objectAllowed(tokenId, _object[i]);
            art[tokenId].push();
            art[tokenId][i + artLength].color = _object[i].color; 
            art[tokenId][i + artLength].shape = _object[i].shape;
            art[tokenId][i + artLength].stroke = _object[i].stroke;
            for (uint256 j = 0; j < _object[i].points.length; j++) {
                art[tokenId][i + artLength].points.push(_object[i].points[j]);
            }
        }
    }

    function tokenSVG(uint256 tokenId) public view returns (bytes memory) {
        return abi.encodePacked(
            svgStart, 
            traitSVG[tokenId],
            '<g id="drawing-area" clip-path="url(#canvas-clip)">',
                paintRenderer.renderObjects(art[tokenId]),
            '</g>',
            svgEnd
        );
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return string(paintRenderer.getURI(name(), tokenId, baseURL, tokenSVG(tokenId), traits[tokenId]));
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC2981) returns (bool) {
        return interfaceId == type(IERC2981).interfaceId || super.supportsInterface(interfaceId);
    }

}