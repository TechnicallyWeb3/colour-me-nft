// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.20;

/// @custom:interface build ./interfaces/IPaintRenderer.sol
/// @custom:interface import "../types.sol";

import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import "./types.sol";

contract PaintRenderer {
    using Strings for uint8;
    using Strings for uint16;
    using Strings for uint256;

    function renderTrait(Trait memory _traits) external pure returns (bytes memory) {
        return abi.encodePacked(
            '<circle cx="90" cy="35" r="15" class="color-btn" fill="#', toRGBString_(_traits.color0),
            '"/><circle cx="130" cy="35" r="15" class="color-btn" fill="#', toRGBString_(_traits.color1),
            '"/><circle cx="170" cy="35" r="15" class="color-btn" fill="#', toRGBString_(_traits.color2),
            '"/><circle cx="210" cy="35" r="15" class="color-btn" fill="#', toRGBString_(_traits.color3),
            '"/><circle cx="250" cy="35" r="15" class="color-btn" fill="#', toRGBString_(_traits.color4),
            '"/><use href="#shape-', uint8(_traits.shape0).toString(),
            '" x="445" y="20" class="shape-btn"/><use href="#shape-', uint8(_traits.shape1).toString(),
            '" x="485" y="20" class="shape-btn"/><use href="#polygon-', _traits.polygon.toString(),
            '" x="525" y="20" class="shape-btn"/>'
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
                '<line stroke="#', toRGBString_(_object.color),
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
                    '<polyline stroke="#', toRGBString_(_object.color), 
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
                '<path stroke-linecap="round" stroke-linejoin="round" stroke="#', 
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

    function getAttributes(Trait memory _trait) external pure returns (bytes memory) {
        return abi.encodePacked(
            '[{"trait_type":"Color1","value":"#', toRGBString_(_trait.color0), 
            '"},{"trait_type":"Color2","value":"#', toRGBString_(_trait.color1), 
            '"},{"trait_type":"Color3","value":"#', toRGBString_(_trait.color2), 
            '"},{"trait_type":"Color4","value":"#', toRGBString_(_trait.color3), 
            '"},{"trait_type":"Color5","value":"#', toRGBString_(_trait.color4), 
            '"},{"trait_type":"Shape1","value":"', toShapeLabel(_trait.shape0), 
            '"},{"trait_type":"Shape2","value":"', toShapeLabel(_trait.shape1), 
            '"},{"trait_type":"Shape3","value":"', toPolygonLabel(_trait.polygon), '"}]'
        );
    }

}