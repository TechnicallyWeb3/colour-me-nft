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
    int16 x;
    int16 y;
}

struct Object {
    uint256 base; // encoded object, see below
    bytes additionalPoints; // additional points above 6
}

// 1. bits 0-2: shape (3 bits)
// 2. bits 3-26: color (24 bits) 
// 3. bits 27-34: stroke (8 bits)
// 4. bits 35-50: pointsLength (16 bits)
// 5. bits 51-242: points (192 bits) // 6 points max
// 6. bits 243-255: unused (12 bits)

struct BaseObject {
    Path shape;
    bytes3 color;
    uint8 stroke;
    uint16 pointsLength;
}

function decodeShape(uint256 object) pure returns (Path) {
    // bits 1-3: shape (3 bits) -> bits 0-2 in 0-based indexing
    uint8 rawShape = uint8(object & 0x7);
    if (rawShape > 5) {
        revert InvalidShape(rawShape);
    }
    return Path(rawShape);
}

function decodeColor(uint256 object) pure returns (bytes3) {
    // bits 4-27: color (24 bits) -> bits 3-26 in 0-based indexing
    return bytes3(uint24(object >> 3));
}

function decodeStroke(uint256 object) pure returns (uint8) {
    // bits 28-35: stroke (8 bits) -> bits 27-34 in 0-based indexing
    return uint8(object >> 27);
}

function decodePointsLength(uint256 object) pure returns (uint16) {
    // bits 36-51: pointsLength (16 bits) -> bits 35-50 in 0-based indexing
    return uint16(object >> 35);
}

function validatePoints(Path shape, uint16 pointsLength) pure {
    if (
        (pointsLength < 2) || 
        // all shapes must have at least 2 points, path and polyline can have more
        ((shape == Path.rect || shape == Path.ellipse || shape == Path.line) && pointsLength != 2) || 
        // rect, ellipse, line must have exactly 2 points
        (shape == Path.polygon && pointsLength != 3 && pointsLength != 5 && pointsLength != 6) 
        // polygon must have 3, 5, or 6 points
    ) {
        revert InvalidPoints(pointsLength);
    }
}

function validateStroke(Path shape, uint8 stroke) pure {
    if (
        (shape == Path.path || shape == Path.line || shape == Path.polyline) && stroke == 0
    ) {
        revert InvalidStroke(stroke);
    }
}

function getBaseObject(uint256 object) pure returns (BaseObject memory) {
    Path shape = decodeShape(object);
    bytes3 color = decodeColor(object);
    uint8 stroke = decodeStroke(object);
    uint16 pointsLength = decodePointsLength(object);

    validateStroke(shape, stroke);
    validatePoints(shape, pointsLength);

    return BaseObject({
        shape: shape,
        color: color,
        stroke: stroke,
        pointsLength: pointsLength
    });
} 

function getBasePoints(uint256 object) pure returns (Point[2] memory) {
    uint16 pointsLength = decodePointsLength(object);
    if (pointsLength < 2) {
        revert InvalidPoints(pointsLength);
    }
    // bits 52-243: points (192 bits) -> bits 51-242 in 0-based
    // Point 0: bits 51-82 (x: 51-66, y: 67-82)
    // Point 1: bits 83-114 (x: 83-98, y: 99-114)
    return [
        Point({
            x: int16(uint16(object >> 51)),
            y: int16(uint16(object >> 67))
        }),
        Point({
            x: int16(uint16(object >> 83)),
            y: int16(uint16(object >> 99))
        })
    ];
}

function getObjectPoints(Object memory object) pure returns (Point[] memory) {
    
    // need to get the points from the base points and additional points
    uint16 pointsLength = decodePointsLength(object.base);
    
    Point[] memory points = new Point[](pointsLength);
    
    // Extract up to 6 points from the base object
    // bits 52-243: points (192 bits) -> bits 51-242 in 0-based
    // Each point takes 32 bits (16 for x, 16 for y)
    for (uint256 i = 0; i < 6 && i < pointsLength; i++) {
        uint256 pointStartBit = 51 + i * 32;
        int16 x = int16(uint16(object.base >> pointStartBit));
        int16 y = int16(uint16(object.base >> (pointStartBit + 16)));
        points[i] = Point({x: x, y: y});
    }

    // Extract additional points from bytes array (4 bytes per point)
    for (uint256 i = 0; i + 3 < object.additionalPoints.length && (6 + i / 4) < pointsLength; i += 4) {
        // Extract x coordinate from bytes i and i+1 (big-endian)
        uint16 x_raw = uint16(uint8(object.additionalPoints[i])) << 8 | 
                       uint16(uint8(object.additionalPoints[i + 1]));
        
        // Extract y coordinate from bytes i+2 and i+3 (big-endian)
        uint16 y_raw = uint16(uint8(object.additionalPoints[i + 2])) << 8 | 
                       uint16(uint8(object.additionalPoints[i + 3]));
        
        points[6 + i / 4] = Point({x: int16(x_raw), y: int16(y_raw)});
    }

    return points;
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
    if (shape == Path.rect) return "Rectangle";
    if (shape == Path.ellipse) return "Ellipse";
    if (shape == Path.line) return "Line";
    if (shape == Path.polyline) return "Polyline";
    revert InvalidShape(uint8(shape));
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