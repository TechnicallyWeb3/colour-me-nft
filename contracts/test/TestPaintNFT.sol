// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.20;

import "../PaintNFT.sol";

contract TestPaintNFT is PaintNFT {
    constructor(
        string memory name,
        string memory symbol,
        string memory _baseURL,
        uint256 _maxSupply,
        address _paintRenderer,
        address _owner
    ) PaintNFT(name, symbol, _baseURL, _maxSupply, _paintRenderer, _owner) {}

    function exposed_randomTraits(uint256 tokenId) public view returns (Trait memory) {
        return _randomTraits(tokenId);
    }

    function exposed_renderSVG(uint256 tokenId) public view returns (bytes memory) {
        return _renderSVG(tokenId);
    }

}