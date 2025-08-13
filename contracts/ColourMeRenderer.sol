// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.20;

/// @custom:interface build ./interfaces/IColourMeRenderer.sol
/// @custom:interface import "../types.sol";

import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import "./types.sol";

contract ColourMeRenderer {
    using Strings for uint8;
    using Strings for uint16;
    using Strings for uint256;
    using Base64 for bytes;

    bytes constant shapePrefix = '<rect x="0" y="0" width="30" height="30" class="tool-bg" data-shape="';
    bytes constant shapeSuffix = ' fill="none" stroke="#333" stroke-width="2" class="shape-icon"/>';

    function renderShapeTool(Path _shape) public pure returns (bytes memory) {
        
        if (_shape == Path.rect) {
            return abi.encodePacked(
                shapePrefix, 
                'rect"/><rect x="5" y="7.5" width="20" height="15"',
                shapeSuffix
            );
        } else if (_shape == Path.ellipse) {
            return abi.encodePacked(
                shapePrefix, 
                'ellipse"/><ellipse cx="15" cy="15" rx="8" ry="8"',
                shapeSuffix
            );
        } else if (_shape == Path.line) {
            return abi.encodePacked(
                shapePrefix, 
                'line"/><line x1="5" y1="10" x2="25" y2="20"',
                shapeSuffix
            );
        } else if (_shape == Path.polyline) {
            return abi.encodePacked(
                shapePrefix, 
                'polyline"/><polyline points="5,15 12.5,10 17.5,20 25,15"',
                shapeSuffix
            );
        } else {
            revert InvalidShape(_shape);
        }
    }

    function renderPolygon(uint8 _polygon) public pure returns (bytes memory) {
        if (_polygon == 3) {
            return abi.encodePacked(
                shapePrefix, 
                'polygon-3"/><polygon points="15,7 25,23 5,23"',
                shapeSuffix
            );
        } else if (_polygon == 5) {
            return abi.encodePacked(
                shapePrefix, 
                'polygon-5"/><polygon points="15,5 25,12 20,22.5 10,22.5 5,12"',
                shapeSuffix
            );
        } else if (_polygon == 6) {
            return abi.encodePacked(
                shapePrefix, 
                'polygon-6"/><polygon points="10,6 20,6 25,15 20,24 10,24 5,15"',
                shapeSuffix
            );
        } else {
            revert InvalidPolygon(_polygon);
        }
    }

    function renderTrait(Trait memory _traits) external pure returns (bytes memory) {
        return abi.encodePacked(
            '<circle cx="90" cy="35" r="15" class="color-btn" fill="#', toRGBString_(_traits.color0),
            '"/><circle cx="130" cy="35" r="15" class="color-btn" fill="#', toRGBString_(_traits.color1),
            '"/><circle cx="170" cy="35" r="15" class="color-btn" fill="#', toRGBString_(_traits.color2),
            '"/><circle cx="210" cy="35" r="15" class="color-btn" fill="#', toRGBString_(_traits.color3),
            '"/><circle cx="250" cy="35" r="15" class="color-btn" fill="#', toRGBString_(_traits.color4),
            '"/><g class="shape-group" transform="translate(445, 20)">', renderShapeTool(_traits.shape0),
            '</g><g class="shape-group" transform="translate(485, 20)">', renderShapeTool(_traits.shape1),
            '</g><g class="shape-group" transform="translate(525, 20)">', renderPolygon(_traits.polygon), '</g>'
        );
    }

    function _getPolyPoints(Point[] memory _points) internal view returns (bytes memory) {
        if (_points.length == 0) {
            return new bytes(0);
        }
        
        // Pre-calculate total size needed
        uint256 totalSize = 0;
        bytes[] memory pointStrings = new bytes[](_points.length);
        
        for (uint256 i = 0; i < _points.length; i++) {
            // Convert each point to "x,y " format
            bytes memory xStr = bytes(Strings.toString(_points[i].x));
            bytes memory yStr = bytes(Strings.toString(_points[i].y));
            
            // Format: "x,y " (comma + space = 2 bytes)
            pointStrings[i] = new bytes(xStr.length + 1 + yStr.length + 1);
            
            // Copy x coordinate
            for (uint256 j = 0; j < xStr.length; j++) {
                pointStrings[i][j] = xStr[j];
            }
            
            // Add comma
            pointStrings[i][xStr.length] = ',';
            
            // Copy y coordinate
            for (uint256 j = 0; j < yStr.length; j++) {
                pointStrings[i][xStr.length + 1 + j] = yStr[j];
            }
            
            // Add space
            pointStrings[i][xStr.length + 1 + yStr.length] = ' ';
            
            totalSize += pointStrings[i].length;
        }
        
        // Allocate final buffer with exact size
        bytes memory result = new bytes(totalSize);
        uint256 currentPos = 0;
        
        // Copy all point strings using assembly for efficiency
        for (uint256 i = 0; i < pointStrings.length; i++) {
            bytes memory pointStr = pointStrings[i];
            
            assembly {
                // memcpy via identity pre-compile (address 0x04)
                let len := mload(pointStr)                        // length of current point string
                let src := add(pointStr, 32)                      // skip length slot
                let dst := add(add(result, 32), currentPos)       // destination in result buffer
                pop(staticcall(gas(), 4, src, len, dst, len))
            }
            currentPos += pointStr.length;
        }
        
        return result;
    }

    function _getPathSegments(Point[] memory _points) internal view returns (bytes memory) {
        if (_points.length <= 1) {
            return new bytes(0);
        }
        
        // Pre-calculate total size needed
        uint256 totalSize = 0;
        bytes[] memory segmentStrings = new bytes[](_points.length - 1);
        
        for (uint256 i = 1; i < _points.length; i++) {
            // Convert each segment to " L x y" format
            bytes memory xStr = bytes(Strings.toString(_points[i].x));
            bytes memory yStr = bytes(Strings.toString(_points[i].y));
            
            // Format: " Lx y" (space + L + x + space + y = 3 bytes + x + y lengths)
            segmentStrings[i - 1] = new bytes(3 + xStr.length + yStr.length);
            
            // Add " L" prefix
            segmentStrings[i - 1][0] = ' ';
            segmentStrings[i - 1][1] = 'L';
            
            // Copy x coordinate
            for (uint256 j = 0; j < xStr.length; j++) {
                segmentStrings[i - 1][2 + j] = xStr[j];
            }
            
            // Add space before y
            segmentStrings[i - 1][2 + xStr.length] = ' ';
            
            // Copy y coordinate
            for (uint256 j = 0; j < yStr.length; j++) {
                segmentStrings[i - 1][3 + xStr.length + j] = yStr[j];
            }
            
            totalSize += segmentStrings[i - 1].length;
        }
        
        // Allocate final buffer with exact size
        bytes memory result = new bytes(totalSize);
        uint256 currentPos = 0;
        
        // Copy all segment strings using assembly for efficiency
        for (uint256 i = 0; i < segmentStrings.length; i++) {
            bytes memory segmentStr = segmentStrings[i];
            
            assembly {
                // memcpy via identity pre-compile (address 0x04)
                let len := mload(segmentStr)                        // length of current segment string
                let src := add(segmentStr, 32)                      // skip length slot
                let dst := add(add(result, 32), currentPos)         // destination in result buffer
                pop(staticcall(gas(), 4, src, len, dst, len))
            }
            currentPos += segmentStr.length;
        }
        
        return result;
    }

    function renderPath(Object memory _object) public view returns (bytes memory path) {
        if (_object.shape == Path.rect) {
            path = abi.encodePacked(
                '<rect fill="#', toRGBString_(_object.color),
                '" x="', _object.points[0].x.toString(),
                '" y="', _object.points[0].y.toString(),
                '" width="', _object.points[1].x.toString(),
                '" height="', _object.points[1].y.toString(), '"/>'
            );
        } else if (_object.shape == Path.ellipse) {
            path = abi.encodePacked(
                '<ellipse fill="#', toRGBString_(_object.color),
                '" cx="', _object.points[0].x.toString(),
                '" cy="', _object.points[0].y.toString(),
                '" rx="', _object.points[1].x.toString(),
                '" ry="', _object.points[1].y.toString(), '"/>'
            );
        } else if (_object.shape == Path.line) {
            path = abi.encodePacked(
                '<line fill="none" stroke="#', toRGBString_(_object.color),
                '" stroke-width="', _object.stroke.toString(),
                '" x1="', _object.points[0].x.toString(),
                '" y1="', _object.points[0].y.toString(),
                '" x2="', _object.points[1].x.toString(),
                '" y2="', _object.points[1].y.toString(), '"/>'
            );
        } else if (_object.shape == Path.polyline || _object.shape == Path.polygon) {
            bytes memory pointsString = _getPolyPoints(_object.points);
            
            if (_object.shape == Path.polyline) {
                path = abi.encodePacked(
                    '<polyline fill="none" stroke="#', toRGBString_(_object.color), 
                    '" stroke-width="', _object.stroke.toString(), 
                    '" points="', pointsString, '"/>'
                );
            } else {
                path = abi.encodePacked(
                    '<polygon fill="#', toRGBString_(_object.color), 
                    '" points="', pointsString, '"/>'
                );
            }
        } else if (_object.shape == Path.path) {
            bytes memory pathSegments = _getPathSegments(_object.points);
            
            path = abi.encodePacked(
                '<path stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="#', 
                toRGBString_(_object.color), '" stroke-width="', _object.stroke.toString(), '" d="M',
                _object.points[0].x.toString(), ' ', _object.points[0].y.toString(), pathSegments, '"/>'
            );
        }
        return path;
    }

    function renderObjects(Object[] memory _objects) external view returns (bytes memory paths) {
        if (_objects.length == 0) {
            return abi.encodePacked('');
        }
        
        // Pre-calculate total size needed
        uint256 totalSize = 0;
        bytes[] memory renderedObjects = new bytes[](_objects.length);
        
        for (uint256 i = 0; i < _objects.length; i++) {
            renderedObjects[i] = renderPath(_objects[i]);
            totalSize += renderedObjects[i].length;
        }
        
        // Allocate final buffer with exact size
        bytes memory combinedObjects = new bytes(totalSize);
        uint256 currentPos = 0;
        
        // Copy all rendered objects using assembly for efficiency
        for (uint256 i = 0; i < renderedObjects.length; i++) {
            bytes memory rendered = renderedObjects[i];
            
            assembly {
                let len := mload(rendered)
                let src := add(rendered, 32)
                let dst := add(add(combinedObjects, 32), currentPos)
                pop(staticcall(gas(), 4, src, len, dst, len))
            }
            currentPos += rendered.length;
        }
        
        return combinedObjects;
    }

    function getAttributes(Trait memory _trait) public pure returns (bytes memory) {
        return abi.encodePacked(
            '[{"trait_type":"Colour1","value":"#', toRGBString_(_trait.color0), 
            '"},{"trait_type":"Colour2","value":"#', toRGBString_(_trait.color1), 
            '"},{"trait_type":"Colour3","value":"#', toRGBString_(_trait.color2), 
            '"},{"trait_type":"Colour4","value":"#', toRGBString_(_trait.color3), 
            '"},{"trait_type":"Colour5","value":"#', toRGBString_(_trait.color4), 
            '"},{"trait_type":"Shape1","value":"', toShapeLabel(_trait.shape0), 
            '"},{"trait_type":"Shape2","value":"', toShapeLabel(_trait.shape1), 
            '"},{"trait_type":"Shape3","value":"', toPolygonLabel(_trait.polygon), '"}]'
        );
    }

    function getURI(
        string memory _name, 
        uint256 _tokenId, 
        string memory _baseURL, 
        bytes memory _svg, 
        Trait memory _trait
    ) external pure returns (bytes memory) {
        return abi.encodePacked(
            '{"name":"', _name, ' #', _tokenId.toString(), '",',
                '"description":"Colour your NFT your way. Proving you can create an SVG using an SVG on the blockchain",',
                '"external_url":"', _baseURL,'#', _tokenId.toString(), '",',
                '"image_data":"data:image/svg+xml;base64,', _svg.encode(), '",'
                '"attributes":', getAttributes(_trait),
            '}'
        );
    }
}