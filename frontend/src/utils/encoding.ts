// Frontend encoding utilities for converting ObjectStruct to PackedObject format
// Based on the successful encoding from test files

export interface Point {
  x: number;
  y: number;
}

export interface ObjectStruct {
  shape: number; // Path enum: 0=rect, 1=line, 2=ellipse, 3=polyline, 4=polygon, 5=path
  color: string; // hex color as bytes3
  stroke: number; // uint8
  points: Point[];
}

export interface PackedObject {
  base: bigint; // uint256
  additionalPoints: Uint8Array; // bytes
}

// Helper function to convert hex color to bytes3
export function hexToBytes3(hex: string): string {
  if (hex.startsWith('#')) {
    hex = hex.slice(1);
  }
  if (hex.length !== 6) {
    throw new Error("Invalid hex color");
  }
  return '0x' + hex;
}

// Helper function to convert int16 to uint16 (two's complement)
function int16ToUint16(value: number): number {
  // Ensure the value is within int16 range
  if (value < -32768 || value > 32767) {
    throw new Error(`Value ${value} is out of int16 range (-32768 to 32767)`);
  }
  
  // Convert to uint16 representation (two's complement for negative values)
  return value < 0 ? 65536 + value : value;
}

// Convert color string to number for encoding
export function colorToNumber(color: string): number {
  // Handle both formats: "#FF0000" or "0xFF0000"
  let hex = color;
  if (hex.startsWith('#')) {
    hex = '0x' + hex.slice(1);
  }
  if (!hex.startsWith('0x')) {
    hex = '0x' + hex;
  }
  return parseInt(hex, 16);
}

// Encode Object to PackedObject format following the contract spec:
// 1. bits 0-2: shape (3 bits)
// 2. bits 3-26: color (24 bits) 
// 3. bits 27-34: stroke (8 bits)
// 4. bits 35-50: pointsLength (16 bits)
// 5. bits 51-242: points (192 bits) // 6 points max
// 6. bits 243-255: unused (12 bits)
export function encodeObject(obj: ObjectStruct): PackedObject {
  let encoded = 0n;
  
  // Extract first 6 points for base encoding
  const basePoints = obj.points.slice(0, 6);
  const additionalPoints = obj.points.slice(6);
  
  // 1. Shape in bits 0-2 (3 bits)
  encoded |= BigInt(obj.shape & 0x7) << 0n;
  
  // 2. Color in bits 3-26 (24 bits)
  const colorNum = BigInt(colorToNumber(obj.color));
  encoded |= (colorNum & 0xFFFFFFn) << 3n;
  
  // 3. Stroke in bits 27-34 (8 bits)
  encoded |= BigInt(obj.stroke & 0xFF) << 27n;
  
  // 4. PointsLength in bits 35-50 (16 bits)
  encoded |= BigInt(obj.points.length & 0xFFFF) << 35n;
  
  // 5. Points in bits 51-242 (192 bits)
  // Each point takes 32 bits (16 for x, 16 for y)
  for (let i = 0; i < basePoints.length && i < 6; i++) {
    const point = basePoints[i];
    const pointStartBit = 51n + BigInt(i * 32);
    
    // Convert int16 coordinates to uint16 for encoding
    const x_uint16 = int16ToUint16(point.x);
    const y_uint16 = int16ToUint16(point.y);
    
    // X coordinate in first 16 bits, Y in next 16 bits
    encoded |= BigInt(x_uint16 & 0xFFFF) << pointStartBit;
    encoded |= BigInt(y_uint16 & 0xFFFF) << (pointStartBit + 16n);
  }
  
  // Encode additional points as bytes (4 bytes per point: x_high, x_low, y_high, y_low)
  const additionalBytes = new Uint8Array(additionalPoints.length * 4);
  for (let i = 0; i < additionalPoints.length; i++) {
    const point = additionalPoints[i];
    const offset = i * 4;
    
    // Convert int16 coordinates to uint16 for encoding
    const x_uint16 = int16ToUint16(point.x);
    const y_uint16 = int16ToUint16(point.y);
    
    // Big-endian encoding
    additionalBytes[offset] = (x_uint16 >> 8) & 0xFF;     // x high byte
    additionalBytes[offset + 1] = x_uint16 & 0xFF;        // x low byte
    additionalBytes[offset + 2] = (y_uint16 >> 8) & 0xFF; // y high byte
    additionalBytes[offset + 3] = y_uint16 & 0xFF;        // y low byte
  }
  
  return {
    base: encoded,
    additionalPoints: additionalBytes
  };
}

// Encode multiple objects
export function encodeObjects(objects: ObjectStruct[]): PackedObject[] {
  return objects.map(encodeObject);
}

// Helper function to estimate packed size savings
export function estimatePackedSizeReduction(objects: ObjectStruct[]): {
  unpackedSize: number;
  packedSize: number;
  savings: number;
  savingsPercent: number;
} {
  // Rough estimation in bytes
  const unpackedSize = objects.reduce((total, obj) => {
    // Each unpacked object: ~32 bytes + (points * 8 bytes)
    return total + 32 + (obj.points.length * 8);
  }, 0);
  
  const packedSize = objects.reduce((total, obj) => {
    // Each packed object: 32 bytes (uint256) + additional points (4 bytes each beyond 6)
    const additionalPointsCount = Math.max(0, obj.points.length - 6);
    return total + 32 + (additionalPointsCount * 4);
  }, 0);
  
  const savings = unpackedSize - packedSize;
  const savingsPercent = unpackedSize > 0 ? (savings / unpackedSize) * 100 : 0;
  
  return {
    unpackedSize,
    packedSize,
    savings,
    savingsPercent
  };
}

// Helper function to get maximum points that can be efficiently stored
export function getMaxEfficientPoints(): number {
  // 6 points fit in the base object, additional points use extra storage
  // For efficiency, suggest staying under a reasonable limit
  return 50; // This allows for very complex drawings while staying efficient
}

// Helper function to validate object before encoding
export function validateObjectForEncoding(obj: ObjectStruct): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate shape
  if (obj.shape < 0 || obj.shape > 5) {
    errors.push(`Invalid shape: ${obj.shape}. Must be 0-5.`);
  }
  
  // Validate color
  try {
    colorToNumber(obj.color);
  } catch (e) {
    errors.push(`Invalid color format: ${obj.color}. Must be hex format like #FF0000 or 0xFF0000.`);
  }
  
  // Validate stroke
  if (obj.stroke < 0 || obj.stroke > 255) {
    errors.push(`Invalid stroke: ${obj.stroke}. Must be 0-255.`);
  }
  
  // Validate stroke requirements
  if ((obj.shape === 5 || obj.shape === 1 || obj.shape === 3) && obj.stroke === 0) {
    errors.push(`Shape ${obj.shape} (path/line/polyline) requires stroke > 0.`);
  }
  
  // Validate points
  if (obj.points.length < 1) {
    errors.push("Object must have at least 1 point.");
  }
  
  // Shape-specific point validation
  if ((obj.shape === 0 || obj.shape === 1 || obj.shape === 2) && obj.points.length !== 2) {
    errors.push(`Shape ${obj.shape} (rect/line/ellipse) must have exactly 2 points.`);
  }
  
  if (obj.shape === 4 && ![3, 5, 6].includes(obj.points.length)) {
    errors.push(`Shape ${obj.shape} (polygon) must have 3, 5, or 6 points.`);
  }
  
  if ((obj.shape === 3 || obj.shape === 5) && obj.points.length < 2) {
    errors.push(`Shape ${obj.shape} (polyline/path) must have at least 2 points.`);
  }
  
  // Validate coordinate ranges (int16: -32768 to 32767)
  for (const point of obj.points) {
    if (point.x < -32768 || point.x > 32767 || point.y < -32768 || point.y > 32767) {
      errors.push(`Point coordinates must be -32768 to 32767. Found: (${point.x}, ${point.y})`);
    }
  }
  
  // Warnings for efficiency
  if (obj.points.length > 6) {
    warnings.push(`Object has ${obj.points.length} points. Points beyond 6 use additional storage.`);
  }
  
  if (obj.points.length > getMaxEfficientPoints()) {
    warnings.push(`Object has ${obj.points.length} points. Consider splitting into multiple objects for better efficiency.`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// Debug helper to decode and verify encoding
export function debugEncoding(obj: ObjectStruct): {
  original: ObjectStruct;
  packed: PackedObject;
  decoded: {
    shape: number;
    color: string;
    stroke: number;
    pointsLength: number;
  };
  encodingInfo: {
    basePointsCount: number;
    additionalPointsCount: number;
    totalEncodedSize: number;
  };
} {
  const packed = encodeObject(obj);
  
  // Decode for verification
  const decoded = {
    shape: Number(packed.base & 0x7n),
    color: '0x' + Number((packed.base >> 3n) & 0xFFFFFFn).toString(16).padStart(6, '0'),
    stroke: Number((packed.base >> 27n) & 0xFFn),
    pointsLength: Number((packed.base >> 35n) & 0xFFFFn)
  };
  
  const basePointsCount = Math.min(obj.points.length, 6);
  const additionalPointsCount = Math.max(0, obj.points.length - 6);
  const totalEncodedSize = 32 + (additionalPointsCount * 4); // bytes
  
  return {
    original: obj,
    packed,
    decoded,
    encodingInfo: {
      basePointsCount,
      additionalPointsCount,
      totalEncodedSize
    }
  };
}
