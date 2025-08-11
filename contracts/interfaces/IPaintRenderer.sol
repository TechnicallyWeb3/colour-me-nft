// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../types.sol";

interface IPaintRenderer {

    function renderShapeTool(Path _shape) external pure returns (bytes memory);
    function renderPolygon(uint8 _polygon) external pure returns (bytes memory);
    function renderTrait(Trait memory _traits) external pure returns (bytes memory);
    function renderPath(Object memory _object) external view returns (bytes memory path);
    function renderObjects(Object[] memory _objects) external view returns (bytes memory paths);
    function getAttributes(Trait memory _trait) external pure returns (bytes memory);
    function getURI(string memory _name, uint256 _tokenId, string memory _baseURL, bytes memory _svg, Trait memory _trait) external pure returns (bytes memory);
}
