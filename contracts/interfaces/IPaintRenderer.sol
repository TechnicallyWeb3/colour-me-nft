// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../types.sol";

interface IPaintRenderer {

    function renderTrait(Trait memory _traits) external pure returns (bytes memory);
    function renderPath(Object memory _object) external view returns (bytes memory path);
    function renderObjects(Object[] memory _objects) external view returns (bytes memory paths);
    function getAttributes(Trait memory _trait) external pure returns (bytes memory);
}
