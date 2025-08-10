// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.20;

error OutOfBounds(uint256 index, uint256 length);
error InvalidShape(uint8 shape);
error InvalidColor(bytes3 color);
error InvalidStroke(uint8 stroke);
error InvalidPoints(uint256 points);
error InvalidPolygon(uint256 points);

enum Path {
    rect,
    line,
    ellipse,
    polyline,
    polygon,
    path
}

struct Point {
    uint16 x;
    uint16 y;
}

struct Object {
    // represens a single svg object <rect> <ellipse> <line> <polygon> or <polyline>
    Path shape;
    bytes3 color;
    uint8 stroke; // optional width for path, line and polyline
    Point[] points;
}

struct Trait {
    bytes3 color0;
    bytes3 color1;
    bytes3 color2;
    bytes3 color3;
    bytes3 color4;
    Path shape0;
    Path shape1;
    uint8 polygon;
}

function toShapeLabel(Path shape) pure returns (bytes memory) {
    uint8 _shape = uint8(shape);
    if (_shape == 0) return "Rectangle";
    if (_shape == 1) return "Ellipse";
    if (_shape == 2) return "Line";
    if (_shape == 3) return "Polyline";
    revert InvalidShape(_shape);
}

function toPolygonLabel(uint8 polygon) pure returns (bytes memory) {
    if (polygon == 3) return "Triangle";
    if (polygon == 5) return "Pentagon";
    if (polygon == 6) return "Hexagon";
    revert InvalidPolygon(polygon);
}

function toRGBString_(bytes3 rgb) pure returns (bytes memory) {
    bytes16 _HEX_SYMBOLS = "0123456789abcdef";
    bytes memory buffer = new bytes(6);
    for (uint256 i = 0; i < 3; i++) {
        uint8 value = uint8(rgb[i]);
        buffer[i * 2 ] = _HEX_SYMBOLS[value >> 4];
        buffer[i * 2 + 1] = _HEX_SYMBOLS[value & 0x0f];
    }
    return buffer;
} 

function random_(uint256 seed, uint256 min, uint256 max) view returns (uint256) {
    return uint256(keccak256(abi.encodePacked(
        seed, 
        block.timestamp, 
        block.prevrandao, 
        block.number,
        msg.sender
    ))) % (max - min + 1) + min;
}