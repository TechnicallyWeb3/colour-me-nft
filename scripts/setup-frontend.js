#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, options = {}) {
  log(`Running: ${command}`, 'cyan');
  try {
    const result = execSync(command, { 
      encoding: 'utf8', 
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options 
    });
    return result;
  } catch (error) {
    log(`Command failed: ${error.message}`, 'red');
    throw error;
  }
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function deleteFile(filePath) {
  if (fileExists(filePath)) {
    fs.unlinkSync(filePath);
    log(`Deleted: ${filePath}`, 'yellow');
  } else {
    log(`File not found (skipping): ${filePath}`, 'yellow');
  }
}

function copyFile(src, dest) {
  if (!fileExists(src)) {
    log(`Source file not found: ${src}`, 'red');
    return false;
  }
  
  // Ensure destination directory exists
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  fs.copyFileSync(src, dest);
  log(`Copied: ${src} → ${dest}`, 'green');
  return true;
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) {
    log(`Source directory not found: ${src}`, 'red');
    return false;
  }
  
  // Remove destination if it exists
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
  
  // Copy directory recursively
  fs.cpSync(src, dest, { recursive: true });
  log(`Copied directory: ${src} → ${dest}`, 'green');
  return true;
}

function updateFrontendConfig(network, nftAddress, rendererAddress) {
  const configPath = './frontend/src/utils/blockchain.ts';
  
  if (!fileExists(configPath)) {
    log(`Frontend config not found: ${configPath}`, 'red');
    return false;
  }
  
  let content = fs.readFileSync(configPath, 'utf8');
  
  // Debug: log what we're looking for
  log(`Attempting to update ${network} network config...`, 'cyan');
  log(`Looking for address to replace with: ${nftAddress}`, 'cyan');
  
  // Update the specific network configuration
  // More precise regex that handles whitespace and comments better
  const networkConfigRegex = new RegExp(
    `(${network}:\\s*\\{[\\s\\S]*?contracts:\\s*\\{[\\s\\S]*?ColourMeNFT:\\s*\\{[\\s\\S]*?address:\\s*")([^"]+)("[\\s\\S]*?,)`
  );
  
  // Debug: check if pattern matches
  const match = content.match(networkConfigRegex);
  if (match) {
    log(`Found existing address: ${match[2]}`, 'yellow');
    log(`Replacing with: ${nftAddress}`, 'yellow');
  } else {
    log(`Pattern not found for network: ${network}`, 'red');
    log(`Trying alternative regex patterns...`, 'yellow');
    
    // Try simpler pattern
    const simpleRegex = new RegExp(
      `(${network}:[\\s\\S]*?address:\\s*")([^"]+)(")`
    );
    const simpleMatch = content.match(simpleRegex);
    if (simpleMatch) {
      log(`Found with simple pattern. Current address: ${simpleMatch[2]}`, 'green');
      const updated = content.replace(simpleRegex, `$1${nftAddress}$3`);
      fs.writeFileSync(configPath, updated);
      log(`✅ Updated ${network} contract address to: ${nftAddress}`, 'green');
      return true;
    } else {
      log(`❌ No pattern found for network ${network}`, 'red');
      return false;
    }
  }
  
  const updated = content.replace(networkConfigRegex, `$1${nftAddress}$3`);
  
  if (updated !== content) {
    fs.writeFileSync(configPath, updated);
    log(`✅ Updated ${network} contract address to: ${nftAddress}`, 'green');
    return true;
  } else {
    log(`❌ Could not update ${network} config - no changes made`, 'yellow');
    return false;
  }
}

function getDeployedAddresses(network) {
  try {
    const deploymentsDir = './ignition/deployments';
    
    if (!fs.existsSync(deploymentsDir)) {
      log('No ignition deployments found', 'yellow');
      return null;
    }
    
    // Map network names to chain IDs used by ignition
    const networkToChainId = {
      'local': 'chain-31337',
      'localhost': 'chain-31337', 
      'testnet': 'chain-11155111',
      'sepolia': 'chain-11155111',
      'mainnet': 'chain-137',
      'polygon': 'chain-137'
    };
    
    const chainId = networkToChainId[network] || `chain-${network}`;
    const chainDir = path.join(deploymentsDir, chainId);
    
    if (!fs.existsSync(chainDir)) {
      log(`No deployments found for network: ${network} (${chainId})`, 'yellow');
      return null;
    }
    
    const deploymentFile = path.join(chainDir, 'deployed_addresses.json');
    
    if (!fs.existsSync(deploymentFile)) {
      log(`No deployment addresses file found: ${deploymentFile}`, 'yellow');
      return null;
    }
    
    const deployments = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    const nftAddress = deployments['NFTModule#ColourMeNFT'];
    const rendererAddress = deployments['NFTModule#ColourMeRenderer'];
    
    if (!nftAddress || !rendererAddress) {
      log('Contract addresses not found in deployment file', 'yellow');
      return null;
    }
    log(`Found deployment:`, 'green');
    log(`  Network: ${network}`, 'green');
    log(`  Deployment file: ${deploymentFile}`, 'green');
    log(`  NFT: ${nftAddress}`, 'green');
    log(`  Renderer: ${rendererAddress}`, 'green');
    
    return { nftAddress, rendererAddress };
  } catch (error) {
    log(`Error reading deployed addresses: ${error.message}`, 'red');
    return null;
  }
}

async function waitForServer(port, timeout = 30000) {
  log(`Waiting for server on port ${port}...`, 'yellow');
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      execCommand(`npx wait-on tcp:127.0.0.1:${port}`, { silent: true });
      log(`Server is ready on port ${port}`, 'green');
      return true;
    } catch (error) {
      // Wait 1 second before trying again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw new Error(`Server did not start within ${timeout}ms`);
}

async function main() {
  // Get network from command line arguments (default to local)
  const network = process.argv[2] || 'local';
  const networkDisplay = network === 'local' ? 'local development' : `${network} network`;
  
  log(`🚀 Setting up frontend for ${networkDisplay}...`, 'magenta');
  
  try {
    // Step 1: Clean up frontend assets
    log('\n📁 Step 1: Cleaning frontend assets...', 'blue');
    deleteFile('./frontend/src/assets/colour-me.full.svg');
    deleteFile('./frontend/src/assets/colour-me.test.svg');
    
    // Step 2: Run Python script to generate full SVG
    log('\n🐍 Step 2: Running Python script to generate SVG assets...', 'blue');
    if (fileExists('./minify_and_split.py')) {
      execCommand('python minify_and_split.py');
    } else {
      log('Python script not found, skipping SVG generation', 'yellow');
    }
    
    let hardhatProcess = null;
    const networkName = network === 'testnet' ? 'sepolia' : network === 'mainnet' ? 'polygon' : 'localhost';
    
    // // Step 4: Setup network-specific deployment
    // if (network === 'local') {
    //   log('\n📋 Step 4: Using existing local deployment...', 'blue');
    //   log('(Node and contracts should already be running from concurrent process)', 'cyan');
      
    //   // Just wait for the deployment to be ready (no need to start node/deploy ourselves)
    //   log('Waiting for local deployment to be ready...', 'yellow');
    //   try {
    //     // Wait for deployment file to exist (created by concurrent deploy process)
    //     await new Promise((resolve, reject) => {
    //       const checkFile = () => {
    //         const deploymentFile = './ignition/deployments/chain-31337/deployed_addresses.json';
    //         if (fs.existsSync(deploymentFile)) {
    //           resolve();
    //         } else {
    //           setTimeout(checkFile, 500);
    //         }
    //       };
    //       checkFile();
          
    //       // Timeout after 30 seconds
    //       setTimeout(() => reject(new Error('Deployment timeout')), 30000);
    //     });
    //     log('✅ Local deployment found', 'green');
    //   } catch (error) {
    //     log('⚠️ Could not find local deployment, proceeding anyway...', 'yellow');
    //   }
    // } else {

    // Step 3: Check existing deployments for this network
    log(`\n📋 Step 3: Checking existing deployments for ${network}...`, 'blue');
    
    // Check if contracts are already deployed for this network
    let deployedAddresses = getDeployedAddresses(network);
    
    if (deployedAddresses) {
      log(`✅ Found existing deployment:`, 'green');
      log(`  NFT: ${deployedAddresses.nftAddress}`, 'green');
      log(`  Renderer: ${deployedAddresses.rendererAddress}`, 'green');
      
      // Reset SVG for existing deployments
      log('\n🔄 Step 3.1: Resetting SVG for existing deployment...', 'blue');
      try {
        if (network !== 'local') {
          execCommand(`npx hardhat reset-svg --contract ${deployedAddresses.nftAddress} --network ${networkName}`);
          log('✅ SVG reset completed', 'green');
        } else {
          log('Skipping SVG reset for local deployment, if manually deployed, run "npx hardhat reset-svg --contract <contract-address> --network localhost" to reset the SVG', 'yellow');
        }
      } catch (error) {
        log(`⚠️ SVG reset failed: ${error.message}`, 'yellow');
        log('Continuing with setup...', 'yellow');
      }
    } else {
      try {
        log(`⚠️ No deployment found for ${network}. Deploy first with:`, 'yellow');
        log(`  Trying to deploy via ignition to ${network}...`, 'yellow');
        execCommand(`npm run ${network}:deploy`);
        deployedAddresses = getDeployedAddresses(network);
        if (!deployedAddresses) {
          throw new Error('Failed to deploy contracts to ' + network);
        }
        log(`✅ Deployment successful:`, 'green');
        log(`  NFT: ${deployedAddresses.nftAddress}`, 'green');
        log(`  Renderer: ${deployedAddresses.rendererAddress}`, 'green');
      } catch (error) {
        log(`⚠️ Failed to load or deploy contracts to ${network}.`, 'yellow');
        log(`  Please try running "npm run ${network}:deploy" manually.`, 'yellow');
        log(`  Error: ${error.message}`, 'red');
        process.exit(1);
      }

      // Step 4: Update frontend config with deployed addresses
      log('\n🔧 Step 4: Updating frontend configuration...', 'blue');
      updateFrontendConfig(network, deployedAddresses.nftAddress, deployedAddresses.rendererAddress);
    }
    
    try {
      // Step 5: Generate test art (always use in-memory Hardhat VM for accurate contract testing)
      log('\n🎨 Step 5: Generating test art using in-memory Hardhat VM...', 'blue');
      log('(This ensures debug page has accurate examples from actual contract)', 'cyan');
      
      // Generate test art using self-contained script that deploys, mints, and generates
      log('Running self-contained test art generation (deploy + mint + generate)...', 'yellow');
      execCommand('npx hardhat run ./scripts/generate-test-art.ts');
      
      // Step 6: Copy SVG assets to frontend
      log('\n📄 Step 6: Copying SVG assets to frontend...', 'blue');
      copyFile('./assets/colour-me.full.svg', './frontend/src/assets/colour-me.full.svg');
      
      // Always try to copy test SVG since we now always generate it
      if (fileExists('./assets/colour-me.test.svg')) {
        copyFile('./assets/colour-me.test.svg', './frontend/src/assets/colour-me.test.svg');
      } else {
        log('Test SVG not found, using full SVG as fallback', 'yellow');
        copyFile('./assets/colour-me.full.svg', './frontend/src/assets/colour-me.test.svg');
      }
      
      // Step 7: Compile contracts and copy types
      log('\n🔨 Step 7: Compiling contracts and copying types...', 'blue');
      execCommand('npx hardhat compile');
      copyDirectory('./typechain-types', './frontend/src/typechain-types');
      
      log(`\n✅ Frontend setup complete for ${network}!`, 'green');
      log('\nNext steps:', 'cyan');
      
      if (network === 'local') {
        log('  1. Run "npm run local" to start the full development environment', 'cyan');
        log('  2. Or run "npm run local:ui" to just start the frontend (if node is already running)', 'cyan');
      } else {
        log(`  1. Run "npm run ${network}:ui" to start the frontend for ${network}`, 'cyan');
        log(`  2. Or run "npm run ${network}" to deploy and start everything`, 'cyan');
        log(`  3. Make sure your wallet is connected to the ${network} network`, 'cyan');
      }
      
    } catch (error) {
      log(`\n❌ Setup failed: ${error.message}`, 'red');
      process.exit(1);
    }
    // finally {
    //   // Always cleanup: kill hardhat node if we started one
    //   if (hardhatProcess && !hardhatProcess.killed) {
    //     log('\n🧹 Cleaning up local node...', 'yellow');
    //     hardhatProcess.kill();
    //     // Also kill any processes on port 8545
    //     try {
    //       if (process.platform === 'win32') {
    //         execCommand('taskkill /F /IM node.exe', { silent: true });
    //       } else {
    //         execCommand('pkill -f "hardhat node"', { silent: true });
    //       }
    //     } catch (error) {
    //       // Ignore cleanup errors
    //     }
    //   }
    // }
    
  } catch (error) {
    log(`\n❌ Setup failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  log('\n🛑 Setup interrupted by user', 'yellow');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('\n🛑 Setup terminated', 'yellow');
  process.exit(0);
});

main();
