// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.20;

import "../types.sol";

contract EncodingTest {

    mapping(uint16 => Object[]) public userArt;

    function storeArt(uint16 tokenId, Object[] memory art) public {
        // should validate aganist token traits to validate the art is allowed
        delete userArt[tokenId];
        for (uint256 i = 0; i < art.length; i++) {
            userArt[tokenId].push(art[i]);
        }
    }

    function getArt(uint16 tokenId) public view returns (Object[] memory) {
        return userArt[tokenId];
    }

    function unpackArt(uint16 tokenId) public view returns (BaseObject[] memory, Point[][] memory) {
        Object[] memory art = userArt[tokenId];
        BaseObject[] memory baseObjects = new BaseObject[](art.length);
        Point[][] memory points = new Point[][](art.length);
        for (uint256 i = 0; i < art.length; i++) {
            baseObjects[i] = getBaseObject(art[i].base);
            points[i] = getObjectPoints(art[i]);
        }
        return (baseObjects, points);
    }

    // Individual decode functions for testing
    function testDecodeShape(uint256 object) public pure returns (Path) {
        return decodeShape(object);
    }

    function testDecodeColor(uint256 object) public pure returns (bytes3) {
        return decodeColor(object);
    }

    function testDecodeStroke(uint256 object) public pure returns (uint8) {
        return decodeStroke(object);
    }

    function testDecodePointsLength(uint256 object) public pure returns (uint16) {
        return decodePointsLength(object);
    }

}