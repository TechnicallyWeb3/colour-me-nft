// DOM elements
const paintObject = document.getElementById('paint-object');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const drawingSize = document.getElementById('drawing-size');
const txCount = document.getElementById('tx-count');
const gasEstimate = document.getElementById('gas-estimate');
const connectWalletBtn = document.getElementById('connect-wallet');
const switchNetworkBtn = document.getElementById('switch-network');
const mintNftBtn = document.getElementById('mint-nft');
const exportSvgBtn = document.getElementById('export-svg');
const gasDetails = document.getElementById('gas-details');
const transactionList = document.getElementById('transaction-list');
const transactionCount = document.getElementById('transaction-count');
const transactionWindow = document.getElementById('transaction-window');
const minimizeBtn = document.querySelector('.xp-btn.minimize');
const maximizeBtn = document.querySelector('.xp-btn.maximize');
const closeBtn = document.querySelector('.xp-btn.close');

// App state
let walletConnected = false;
let currentAccount = null;
let currentNetwork = null;
let drawingData = null;
let transactionChunks = [];

// Window dragging state
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let windowStartX = 0;
let windowStartY = 0;
let currentDraggedWindow = null;
let currentDragX = 0;
let currentDragY = 0;

// Blockchain constants
const POLYGON_CHAIN_ID = '0x89';
const POLYGON_NETWORK = {
    chainId: POLYGON_CHAIN_ID,
    chainName: 'Polygon Mainnet',
    nativeCurrency: {
        name: 'Polygon PoS',
        symbol: 'POL',
        decimals: 18
    },
    rpcUrls: ['https://polygon-bor-rpc.publicnode.com/'],
    blockExplorerUrls: ['https://polygonscan.com/']
};

// Gas limits and transaction sizing
const MAX_GAS_PER_TX = 300000; // 300k gas limit per transaction
const BYTES_PER_TX = 32 * 1024; // 32KB per transaction (conservative)
const GAS_PRICE_ESTIMATE = 30; // 30 gwei estimate

// Window dragging functions
function startDrag(e, windowElement) {
    // Check if the click target is a button or button-like element
    const target = e.target;
    if (target.closest('button') || 
        target.closest('.xp-btn') || 
        target.closest('input') || 
        target.closest('select') ||
        target.closest('textarea') ||
        target.closest('a')) {
        return; // Don't start dragging if clicking on interactive elements
    }
    
    // Prevent default to avoid text selection and other browser behaviors
    e.preventDefault();
    e.stopPropagation();
    
    isDragging = true;
    currentDraggedWindow = windowElement;
    dragStartX = e.clientX || e.touches[0].clientX;
    dragStartY = e.clientY || e.touches[0].clientY;
    
    // Get the current computed position instead of getBoundingClientRect
    const computedStyle = window.getComputedStyle(windowElement);
    windowStartX = parseFloat(computedStyle.left) || 0;
    windowStartY = parseFloat(computedStyle.top) || 0;
    
    // Reset any existing transform to avoid conflicts
    windowElement.style.transform = '';
    document.body.style.cursor = 'move';
    // windowElement.style.cursor = 'move';
    
    currentDragX = windowStartX;
    currentDragY = windowStartY;
    
    // Add a class to the dragged window for visual feedback
    windowElement.classList.add('dragging');
}

function drag(e) {
    if (!isDragging || !currentDraggedWindow) return;
    
    // Prevent default to avoid any interference
    e.preventDefault();
    
    const currentX = e.clientX || e.touches[0].clientX;
    const currentY = e.clientY || e.touches[0].clientY;
    
    const deltaX = currentX - dragStartX;
    const deltaY = currentY - dragStartY;
    
    // Add a small threshold to prevent accidental dragging
    const dragThreshold = 5; // 5 pixels
    if (Math.abs(deltaX) < dragThreshold && Math.abs(deltaY) < dragThreshold) {
        return;
    }
    
    const newX = windowStartX + deltaX;
    const newY = windowStartY + deltaY;
    
    // Keep window within viewport bounds
    const maxX = window.innerWidth - currentDraggedWindow.offsetWidth;
    
    // Allow window to extend below viewport, but keep at least 50px visible
    // Prevent window from going above y=0
    const minVisibleHeight = 50;
    const maxY = window.innerHeight - minVisibleHeight;
    const minY = Math.max(0, -(currentDraggedWindow.offsetHeight - minVisibleHeight));
    
    const clampedX = Math.max(0, Math.min(newX, maxX));
    const clampedY = Math.max(minY, Math.min(newY, maxY));
    
    // Update current drag position
    currentDragX = clampedX;
    currentDragY = clampedY;
    
    // Use transform for better performance
    currentDraggedWindow.style.transform = `translate(${clampedX - windowStartX}px, ${clampedY - windowStartY}px)`;
}

function stopDrag() {
    if (!isDragging || !currentDraggedWindow) return;

    forceStopDrag();
}

// Force stop drag if mouse leaves the window
function forceStopDrag() {
    console.log('stopDrag');
    // Set the final position directly using the tracked coordinates
    if (currentDraggedWindow) {
        currentDraggedWindow.style.transform = '';
        currentDraggedWindow.style.left = currentDragX + 'px';
        currentDraggedWindow.style.top = currentDragY + 'px';
        currentDraggedWindow.classList.remove('dragging'); // what does this do? A: it removes the dragging class from the window, which is used to style the window while dragging
    }
    
    // Clean up 
    isDragging = false;
    currentDraggedWindow = null;
    document.body.style.cursor = 'default';
}

// Update status display
function updateStatus(message, type = 'disconnected') {
    statusText.textContent = message;
    statusDot.className = 'xp-status-dot ' + type;
}

// Update transaction info
function updateTransactionInfo(size, count) {
    drawingSize.textContent = size;
    txCount.textContent = count;
    
    // Estimate gas (rough calculation)
    const estimatedGas = count * MAX_GAS_PER_TX;
    const gasInGwei = (estimatedGas * GAS_PRICE_ESTIMATE) / 1e9;
    gasEstimate.textContent = gasInGwei.toFixed(2) + ' POL';
}

// Create pseudo transaction elements
function createTransactionItems(chunks) {
    transactionList.innerHTML = '';
    transactionCount.textContent = `${chunks.length} transactions`;
    
    chunks.forEach((chunk, index) => {
        const transactionItem = document.createElement('div');
        transactionItem.className = 'xp-transaction-item';
        
        const details = document.createElement('div');
        details.className = 'xp-transaction-details';
        
        const chunkInfo = document.createElement('span');
        chunkInfo.textContent = `Chunk ${index + 1}/${chunk.total} (${(chunk.size / 1024).toFixed(1)} KB)`;
        
        const status = document.createElement('div');
        status.className = 'xp-transaction-status pending';
        status.textContent = 'Pending';
        
        details.appendChild(chunkInfo);
        transactionItem.appendChild(details);
        transactionItem.appendChild(status);
        
        // Add click handler to simulate transaction processing
        transactionItem.addEventListener('click', () => {
            alert(`Processing transaction ${index + 1}:\nSize: ${(chunk.size / 1024).toFixed(1)} KB\nData preview: ${chunk.data.substring(0, 50)}...`);
            
            // Simulate completion
            setTimeout(() => {
                status.className = 'xp-transaction-status completed';
                status.textContent = 'Completed';
            }, 1000);
        });
        
        transactionList.appendChild(transactionItem);
    });
}

// Check MetaMask availability
async function checkMetaMask() {
    if (typeof window.ethereum !== 'undefined') {
        return true;
    }
    return false;
}

// Connect wallet
async function connectWallet() {
    if (!await checkMetaMask()) {
        updateStatus('MetaMask not installed', 'disconnected');
        return false;
    }

    try {
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        if (accounts.length > 0) {
            currentAccount = accounts[0];
            walletConnected = true;
            updateStatus('Wallet connected: ' + currentAccount.substring(0, 6) + '...' + currentAccount.substring(38), 'connected');
            connectWalletBtn.disabled = true;
            switchNetworkBtn.disabled = false;
            return true;
        }
    } catch (error) {
        console.error('Error connecting wallet:', error);
        updateStatus('Failed to connect wallet: ' + error.message, 'disconnected');
    }
    return false;
}

// Switch to Polygon network
async function switchToPolygon() {
    if (!walletConnected) {
        if (!await connectWallet()) return false;
    }

    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: POLYGON_CHAIN_ID }],
        });
        
        currentNetwork = 'polygon';
        updateStatus('Connected to Polygon network', 'ready');
        switchNetworkBtn.disabled = true;
        mintNftBtn.disabled = false;
        return true;
    } catch (switchError) {
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [POLYGON_NETWORK],
                });
                
                currentNetwork = 'polygon';
                updateStatus('Added and connected to Polygon network', 'ready');
                switchNetworkBtn.disabled = true;
                mintNftBtn.disabled = false;
                return true;
            } catch (addError) {
                console.error('Error adding Polygon network:', addError);
                updateStatus('Failed to add Polygon network: ' + addError.message, 'disconnected');
                return false;
            }
        } else {
            console.error('Error switching to Polygon:', switchError);
            updateStatus('Failed to switch to Polygon: ' + switchError.message, 'disconnected');
            return false;
        }
    }
}

// Chunk drawing data into transactions
function chunkDrawingData(drawingData) {
    const chunks = [];
    const dataString = JSON.stringify(drawingData);
    const totalBytes = new Blob([dataString]).size;
    
    // Calculate number of transactions needed
    const numTransactions = Math.ceil(totalBytes / BYTES_PER_TX);
    
    for (let i = 0; i < numTransactions; i++) {
        const start = i * BYTES_PER_TX;
        const end = Math.min(start + BYTES_PER_TX, totalBytes);
        const chunk = dataString.substring(start, end);
        
        chunks.push({
            index: i,
            total: numTransactions,
            data: chunk,
            size: chunk.length
        });
    }
    
    return chunks;
}

// Mint NFT (placeholder for now)
async function mintNFT() {
    if (!walletConnected || currentNetwork !== 'polygon') {
        updateStatus('Wallet not connected or wrong network', 'disconnected');
        return;
    }

    if (!drawingData) {
        updateStatus('No drawing data to mint', 'disconnected');
        return;
    }

    try {
        updateStatus('Preparing NFT mint...', 'ready');
        
        // Chunk the data
        transactionChunks = chunkDrawingData(drawingData);
        updateTransactionInfo(
            (new Blob([JSON.stringify(drawingData)]).size / 1024).toFixed(1) + ' KB',
            transactionChunks.length
        );
        
        // Create transaction items
        createTransactionItems(transactionChunks);
        
        // Show gas details
        gasDetails.style.display = 'block';
        
        updateStatus(`Ready to mint! ${transactionChunks.length} transactions required`, 'ready');
        
        // Here you would implement the actual minting logic
        // For now, just show the preparation is complete
        
    } catch (error) {
        console.error('Error preparing NFT mint:', error);
        updateStatus('Error preparing NFT mint: ' + error.message, 'disconnected');
    }
}

// Export SVG
function exportSVG() {
    if (paintObject.contentDocument) {
        paintObject.contentDocument.defaultView.postMessage({
            type: 'EXPORT_REQUEST'
        }, '*');
    }
}

// Event listeners
connectWalletBtn.addEventListener('click', connectWallet);
switchNetworkBtn.addEventListener('click', switchToPolygon);
mintNftBtn.addEventListener('click', mintNFT);
exportSvgBtn.addEventListener('click', exportSVG);

// Listen for messages from the SVG
window.addEventListener('message', async function(event) {
    // Verify the message is from our object
    if (event.source !== paintObject.contentWindow) return;
    
    const { type, data } = event.data;
    
    switch (type) {
        case 'DRAWING_UPDATE':
            console.log('Drawing update received from SVG');
            drawingData = data;
            
            // Calculate transaction requirements
            const dataSize = new Blob([JSON.stringify(data)]).size;
            const sizeKB = (dataSize / 1024).toFixed(1);
            const numTx = Math.ceil(dataSize / BYTES_PER_TX);
            
            updateTransactionInfo(sizeKB + ' KB', numTx);
            
            if (walletConnected && currentNetwork === 'polygon') {
                updateStatus(`Drawing updated: ${numTx} transactions needed`, 'ready');
            } else {
                updateStatus(`Drawing updated: ${sizeKB} KB`, 'disconnected');
            }
            break;
            
        case 'SAVE_REQUEST':
            console.log('Save request received from SVG');
            // The SVG handles its own localStorage, we just need to get the data
            if (paintObject.contentDocument) {
                paintObject.contentDocument.defaultView.postMessage({
                    type: 'GET_DRAWING_DATA'
                }, '*');
            }
            break;
    }
});

// Initialize
window.addEventListener('load', function() {
    updateStatus('Color Me NFT loaded, ready to create!', 'disconnected');
    
    // Add drag event listeners to main window titlebar
    const mainTitlebar = document.querySelector('.xp-window .xp-titlebar');
    mainTitlebar.addEventListener('mousedown', (e) => startDrag(e, paintObject.closest('.xp-window')));
    mainTitlebar.addEventListener('touchstart', (e) => startDrag(e, paintObject.closest('.xp-window')));
    
    // Add drag event listeners to transaction window titlebar
    const transactionTitlebar = transactionWindow.querySelector('.xp-titlebar');
    transactionTitlebar.addEventListener('mousedown', (e) => startDrag(e, transactionWindow));
    transactionTitlebar.addEventListener('touchstart', (e) => startDrag(e, transactionWindow));
    
    // Global drag event listeners with better mouse handling
    document.addEventListener('mousemove', drag, { passive: false });
    document.addEventListener('touchmove', drag, { passive: false });
    
    // Multiple ways to stop dragging for better reliability
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchend', stopDrag);
    document.addEventListener('mouseleave', forceStopDrag);
    window.addEventListener('blur', forceStopDrag);
    
    // Prevent text selection while dragging
    mainTitlebar.addEventListener('selectstart', function(e) {
        e.preventDefault();
    });
    transactionTitlebar.addEventListener('selectstart', function(e) {
        e.preventDefault();
    });
    
    // Wait for the SVG to load
    paintObject.addEventListener('load', function() {
        updateStatus('Paint app loaded, ready to create!', 'disconnected');
        
        // Request initial drawing data
        setTimeout(() => {
            if (paintObject.contentDocument) {
                paintObject.contentDocument.defaultView.postMessage({
                    type: 'GET_DRAWING_DATA'
                }, '*');
            }
        }, 1000);
    });
});

// Handle network changes
if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('accountsChanged', function (accounts) {
        if (accounts.length === 0) {
            // User disconnected wallet
            walletConnected = false;
            currentAccount = null;
            currentNetwork = null;
            updateStatus('Wallet disconnected', 'disconnected');
            connectWalletBtn.disabled = false;
            switchNetworkBtn.disabled = true;
            mintNftBtn.disabled = true;
        } else {
            // Account changed
            currentAccount = accounts[0];
            updateStatus('Account changed: ' + currentAccount.substring(0, 6) + '...' + currentAccount.substring(38), 'connected');
        }
    });

    window.ethereum.on('chainChanged', function (chainId) {
        if (chainId === POLYGON_CHAIN_ID) {
            currentNetwork = 'polygon';
            updateStatus('Connected to Polygon network', 'ready');
            switchNetworkBtn.disabled = true;
            mintNftBtn.disabled = false;
        } else {
            currentNetwork = null;
            updateStatus('Wrong network detected', 'disconnected');
            switchNetworkBtn.disabled = false;
            mintNftBtn.disabled = true;
        }
    });
} 