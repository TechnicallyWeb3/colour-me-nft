// Test utility to verify the chunking system works correctly
import type { ContractObject } from './blockchain';
import { 
  estimateObjectGasSize, 
  estimateTransactionGas, 
  calculateOptimalChunkSize,
  createTransactionQueue 
} from './blockchain';

// Generate test data with various object complexities
export const generateTestObjects = (count: number): ContractObject[] => {
  const objects: ContractObject[] = [];
  
  for (let i = 0; i < count; i++) {
    const objectType = i % 6; // Cycle through different shape types
    
    // Generate different complexity objects
    switch (objectType) {
      case 0: // Simple rectangle
        objects.push({
          shape: 0, // rect
          color: '#ff0000',
          stroke: 2,
          points: [
            { x: 10 + i * 5, y: 10 + i * 5 },
            { x: 50 + i * 5, y: 50 + i * 5 }
          ]
        });
        break;
        
      case 1: // Simple ellipse
        objects.push({
          shape: 2, // ellipse
          color: '#00ff00',
          stroke: 1,
          points: [
            { x: 20 + i * 5, y: 20 + i * 5 },
            { x: 30 + i * 5, y: 40 + i * 5 }
          ]
        });
        break;
        
      case 2: // Line
        objects.push({
          shape: 1, // line
          color: '#0000ff',
          stroke: 3,
          points: [
            { x: 5 + i * 3, y: 5 + i * 3 },
            { x: 45 + i * 3, y: 45 + i * 3 }
          ]
        });
        break;
        
      case 3: // Complex polyline (more points = more gas)
        const polylinePoints = [];
        const pointCount = 5 + (i % 10); // 5-14 points
        for (let j = 0; j < pointCount; j++) {
          polylinePoints.push({
            x: 10 + j * 20 + (i % 50),
            y: 10 + Math.sin(j * 0.5) * 20 + (i % 50)
          });
        }
        objects.push({
          shape: 3, // polyline
          color: '#ff00ff',
          stroke: 2,
          points: polylinePoints
        });
        break;
        
      case 4: // Triangle polygon
        objects.push({
          shape: 4, // polygon
          color: '#ffff00',
          stroke: 1,
          points: [
            { x: 15 + i * 4, y: 5 + i * 4 },
            { x: 5 + i * 4, y: 25 + i * 4 },
            { x: 25 + i * 4, y: 25 + i * 4 }
          ]
        });
        break;
        
      case 5: // Complex path (many points)
        const pathPoints = [];
        const pathPointCount = 8 + (i % 15); // 8-22 points
        for (let j = 0; j < pathPointCount; j++) {
          pathPoints.push({
            x: 30 + j * 10 + (i % 30),
            y: 30 + Math.cos(j * 0.3) * 15 + (i % 30)
          });
        }
        objects.push({
          shape: 5, // path
          color: '#00ffff',
          stroke: 4,
          points: pathPoints
        });
        break;
    }
  }
  
  return objects;
};

// Run chunking analysis
export const analyzeChunking = (objectCount: number) => {
  console.log(`\n🧪 Testing chunking system with ${objectCount} objects`);
  
  const testObjects = generateTestObjects(objectCount);
  
  // Calculate individual object gas costs
  const gasPerObject = testObjects.map(obj => estimateObjectGasSize(obj));
  const avgGasPerObject = gasPerObject.reduce((a, b) => a + b, 0) / gasPerObject.length;
  const maxGasPerObject = Math.max(...gasPerObject);
  const minGasPerObject = Math.min(...gasPerObject);
  
  console.log(`📊 Gas Analysis:`);
  console.log(`   Average gas per object: ${avgGasPerObject.toFixed(0)}`);
  console.log(`   Min gas per object: ${minGasPerObject}`);
  console.log(`   Max gas per object: ${maxGasPerObject}`);
  
  // Calculate total transaction gas
  const totalGas = estimateTransactionGas(testObjects);
  console.log(`   Total estimated gas: ${totalGas.toLocaleString()}`);
  
  // Test different gas limits
  const gasLimits = [100000, 300000, 500000, 1000000];
  
  gasLimits.forEach(gasLimit => {
    try {
      const chunking = calculateOptimalChunkSize(testObjects, gasLimit);
      console.log(`\n🔧 Gas limit ${gasLimit.toLocaleString()}:`);
      console.log(`   Optimal chunk size: ${chunking.chunkSize} objects`);
      console.log(`   Number of chunks: ${chunking.estimatedChunks}`);
      console.log(`   Objects per chunk: ${Math.ceil(objectCount / chunking.estimatedChunks)}`);
      
      // Test transaction queue creation
      const queue = createTransactionQueue(1, testObjects, 'set', gasLimit);
      console.log(`   Queue chunks: ${queue.chunks.length}`);
      console.log(`   First chunk objects: ${queue.chunks[0]?.objects.length || 0}`);
      console.log(`   Last chunk objects: ${queue.chunks[queue.chunks.length - 1]?.objects.length || 0}`);
      
    } catch (error) {
      console.log(`\n❌ Gas limit ${gasLimit.toLocaleString()}: ${error}`);
    }
  });
  
  return {
    totalObjects: objectCount,
    totalGas,
    avgGasPerObject,
    testObjects
  };
};

// Test scenarios
export const runChunkingTests = () => {
  console.log('🚀 Starting chunking system tests...\n');
  
  // Test small dataset (should use single transaction)
  analyzeChunking(5);
  
  // Test medium dataset (might need chunking)
  analyzeChunking(50);
  
  // Test large dataset (definitely needs chunking)
  analyzeChunking(200);
  
  // Test very large dataset with complex objects
  analyzeChunking(500);
  
  console.log('\n✅ Chunking tests completed!');
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).testChunking = {
    generateTestObjects,
    analyzeChunking,
    runChunkingTests
  };
}
