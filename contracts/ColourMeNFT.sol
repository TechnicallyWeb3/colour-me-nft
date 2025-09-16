// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.20;

import "./interfaces/IColourMeRenderer.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
// import "@wttp/site/contracts/extensions/WTTPForwarder.sol";

interface IColourMeNFT is IERC721 {
    function getProjectInfo() external view returns (string memory, string memory, string memory, uint256, uint256, uint256, uint256, uint256, uint256);
    function mint(address to) external;
    function setArt(uint256 tokenId, Object[] memory _art) external;
    function appendArt(uint256 tokenId, Object[] memory _object) external;
    function tokenSVG(uint256 tokenId) external view returns (string memory);
    function tokenURI(uint256 tokenId) external view returns (string memory);
}

contract ColourMeNFT is ERC721, ERC2981, Ownable { //, WTTPForwarder {
    using Strings for uint256;
    using Base64 for bytes;

    error MintingClosed(string reason);
    error InvalidQuantity();
    error InsufficientPayment(uint256 required, uint256 sent);

    event CanvasMinted(uint256 tokenId, address to, uint256 qty);
    event ArtSaved(uint256 indexed tokenId, address indexed artist);

    constructor(
        string memory name, 
        string memory symbol,
        string memory _baseURL,
        uint256 _maxSupply,
        address _paintRenderer,
        address _owner,
        uint96 _royalty,
        uint256 _mintPrice,
        uint256 _mintLimit,
        uint256 _mintStart,
        uint256 _mintDuration
    ) ERC721(name, symbol) Ownable(_owner) { //WTTPForwarder(_baseURL, 301) {
        baseURL = _baseURL;
        maxSupply = _maxSupply;
        cmr = IColourMeRenderer(_paintRenderer);
        _setDefaultRoyalty(owner(), _royalty);
        mintPrice = _mintPrice;
        mintLimit = _mintLimit;
        mintStart = _mintStart;
        mintDuration = _mintDuration;
    }

    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external onlyOwner {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    // future proofing allows artists to set their own royalty via an owner contract
    function setArtistRoyalty(uint256 tokenId, address receiver, uint96 feeNumerator) external onlyOwner {
        _setTokenRoyalty(tokenId, receiver, feeNumerator);
    }

    string private baseURL;
    bytes public svgStart;
    bytes public svgEnd;
    uint256 public tokenCount;
    uint256 public maxSupply;
    IColourMeRenderer private cmr;
    uint256 private mintPrice;
    uint256 private mintLimit;
    uint256 private mintStart;
    uint256 private mintDuration;

    mapping(uint256 => Trait) public traits;
    mapping(uint256 => bytes) public traitSVG;
    mapping(uint256 => Object[]) public art;

    function getProjectInfo() external view returns (string memory, string memory, string memory, uint256, uint256, uint256, uint256, uint256, uint256) {
        return (
            name(), 
            symbol(), 
            baseURL,
            tokenCount,
            maxSupply, 
            mintPrice, 
            mintLimit, 
            mintStart, 
            mintDuration
        );
    }

    // function setRedirect(string memory _url) external onlyOwner {
    //     _setRedirectConfig(_url, 301);
    // }

    function setSVG(bytes memory _svgStart, bytes memory _svgEnd) external onlyOwner {
        svgStart = _svgStart;
        svgEnd = _svgEnd;
    }

    function _correctColors(uint24[] memory colors, uint8 index) internal pure returns (uint24[] memory) {
        for (uint8 i = 0; i < index; i++) {
            if (colors[index] >= colors[i]) colors[index] ++;
        }
        return colors;
    }

    function _randomTraits(uint256 tokenId) internal view returns (Trait memory) {
        uint24[] memory colors = new uint24[](5);
        colors[0] = uint24(random_(tokenId, 1, 0xfffffe));
        colors[1] = uint24(random_(colors[0], 1, 0xfffffd));
        colors = _correctColors(colors, 1);
        colors[2] = uint24(random_(colors[1], 1, 0xfffffc));
        colors = _correctColors(colors, 2);
        colors[3] = uint24(random_(colors[2], 1, 0xfffffb));
        colors = _correctColors(colors, 3);
        colors[4] = uint24(random_(colors[3], 1, 0xfffffa));
        colors = _correctColors(colors, 4);
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

    function mint(address to, uint256 qty) external payable {
        if(block.timestamp < mintStart) revert MintingClosed("Mint not started");
        if(block.timestamp > mintStart + mintDuration) revert MintingClosed("Mint ended");
        if(tokenCount >= maxSupply) revert MintingClosed("Max supply reached");
        if(qty > mintLimit || qty == 0) revert InvalidQuantity();
        if(msg.value < mintPrice * qty) revert InsufficientPayment(mintPrice * qty, msg.value);
        for(uint256 i = 0; i < qty; i++) {
            tokenCount++;
            _mint(to, tokenCount);
            traits[tokenCount] = _randomTraits(tokenCount);
            traitSVG[tokenCount] = cmr.renderTrait(traits[tokenCount]);
            if(tokenCount == maxSupply) break;
        }
        emit CanvasMinted(tokenCount, to, qty);
    }

    function _objectAllowed(uint256 tokenId, Object memory object) internal view {
        // Decode essential fields for validation (minimal decoding strategy)
        bytes3 color = decodeColor(object.base);
        
        // Early exit: validate color first (cheapest check)
        if (!(
            color == 0x000000 ||
            color == 0xffffff ||
            color == traits[tokenId].color0 || 
            color == traits[tokenId].color1 || 
            color == traits[tokenId].color2 || 
            color == traits[tokenId].color3 || 
            color == traits[tokenId].color4
        )) {
            revert InvalidColor(color);
        }

        Path shape = decodeShape(object.base);

        // Check if shape is allowed for this token
        bool shapeAllowed = (
            shape == traits[tokenId].shape0 || 
            shape == traits[tokenId].shape1 ||
            shape == Path.polygon ||
            shape == Path.path
        );
        
        // Special case: bucket tool rect (only if token doesn't allow rect)
        if (!shapeAllowed && shape == Path.rect) {
            // Decode first 2 points to check bucket tool dimensions
            Point[2] memory basePoints = getBasePoints(object.base);
            if (
                basePoints[0].x == 10 &&
                basePoints[0].y == 90 &&
                basePoints[1].x == 980 &&
                basePoints[1].y == 900
            ) {
                shapeAllowed = true; // Allow bucket tool rect
            }
        }
        
        if (!shapeAllowed) {
            revert InvalidShape(uint8(shape));
        }
        
        // Additional validation for specific shapes
        uint16 pointsLength = decodePointsLength(object.base);

        if (pointsLength < 2) {
            revert InvalidPoints(pointsLength);
        } else if (
            (
                shape == Path.rect || 
                shape == Path.ellipse || 
                shape == Path.line
            ) &&
            pointsLength != 2
        ) {
            revert InvalidPoints(pointsLength);
        }

        // Additional validation for specific shapes
        if (shape == Path.polygon) {
            if (pointsLength != traits[tokenId].polygon) {
                revert InvalidPoints(pointsLength);
            }
        }

        // Additional validation for specific shapes
        uint8 stroke = decodeStroke(object.base);

        if (
            stroke == 0 &&
            (
                shape == Path.line ||
                shape == Path.polyline ||
                shape == Path.path
            )
        ) {
            revert InvalidStroke(stroke);
        }
        
        // pass - object is allowed
    }

    function _updateArt(uint256 tokenId, Object[] calldata _art) internal {
        for (uint256 i = 0; i < _art.length; i++) {
            // Token-specific validation
            _objectAllowed(tokenId, _art[i]);
            art[tokenId].push(_art[i]);
        }
        emit ArtSaved(tokenId, msg.sender);
    }

    function setArt(uint256 tokenId, Object[] calldata _art) external {
        delete art[tokenId];
        _updateArt(tokenId, _art);
    }

    function appendArt(uint256 tokenId, Object[] calldata _object) external {
        _updateArt(tokenId, _object);
    }

    function tokenSVG(uint256 tokenId) public view returns (string memory) {
        _requireOwned(tokenId);
        return string(abi.encodePacked(
            svgStart, 
            traitSVG[tokenId],
            '<g id="drawing-area" clip-path="url(#canvas-clip)" data-token="', tokenId.toString(), '">',
                cmr.renderObjects(art[tokenId]),
            '</g>',
            svgEnd
        ));
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return string(cmr.getURI(name(), tokenId, baseURL, tokenSVG(tokenId), traits[tokenId]));
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC2981) returns (bool) {
        return interfaceId == type(IColourMeNFT).interfaceId || super.supportsInterface(interfaceId);
    }
}