import Phaser from 'phaser';
import { EditorScene } from './scenes/EditorScene.js';

const config = {
    type: Phaser.CANVAS, // Use CANVAS renderer for better input responsiveness
    parent: 'game-container', // Target the container div we created in App.jsx
    fps: {
        target: 120, // Target higher FPS for maximum responsiveness
        forceSetTimeOut: false, // Use requestAnimationFrame
        min: 60 // Don't go below 60 FPS
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 }, // Add some gravity for jumping
            fps: 120, // Higher physics update rate
            timeScale: 1, // Normal time scale
            debug: false
        }
    },
    scene: [EditorScene], 
    backgroundColor: '#87CEEB', // Sky blue background
    scale: {
        mode: Phaser.Scale.RESIZE, // RESIZE mode to ensure it fills the container
        width: '100%',
        height: '100%',
        autoCenter: Phaser.Scale.CENTER_BOTH,
        autoRound: false, // Disable rounding to avoid any potential delay
    },
    // Maximum responsiveness for input
    input: {
        activePointers: 3, // Support multi-touch for mobile
        smoothFactor: 0, // No smoothing at all for direct input
        dragDistanceThreshold: 0, // No distance threshold for immediate drag detection
        dragTimeThreshold: 0 // No time threshold for immediate drag detection
    },
    // Make canvas responsive to window resizing
    dom: {
        createContainer: true
    },
    // Optimize rendering for speed
    render: {
        pixelArt: false,
        antialias: false, // Disable antialiasing for better performance
        roundPixels: false, // Disable pixel rounding for maximum performance
        batchSize: 4096, // Larger batch size for better performance
        clearBeforeRender: false, // Don't clear the canvas before each render for better performance
        powerPreference: 'high-performance' // Request high-performance GPU mode
    }
};

// More robust initialization function that works on multiple platforms
function initializeGame() {
    console.log('Initializing Phaser game...');
    
    // Check if the game container exists
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
        // Check if we've already created a game instance
        if (!window.phaserGame) {
            try {
                console.log('Creating new Phaser game instance...');
                
                // Set the container dimensions immediately to avoid layout issues
                gameContainer.style.width = '100%';
                gameContainer.style.height = '100%';
                
                // Check if we're on mobile
                const isMobile = window.innerWidth < 768 || ('ontouchstart' in window || navigator.maxTouchPoints > 0);
                console.log('Device detected as', isMobile ? 'mobile' : 'desktop');
                
                // Create the game instance
                const game = new Phaser.Game(config);
                
                // Make the game instance globally available
                window.phaserGame = game;
                
                // More responsive resize handling
                const handleResize = () => {
                    if (game && game.isBooted) {
                        // Get the container's computed dimensions
                        const containerWidth = gameContainer.clientWidth;
                        const containerHeight = gameContainer.clientHeight;
                        
                        console.log(`Resizing game to match container: ${containerWidth}x${containerHeight}`);
                        
                        // Force a resize of the game
                        game.scale.resize(containerWidth, containerHeight);
                        game.scale.refresh();
                    }
                };
                
                // Use both resize and orientationchange events
                window.addEventListener('resize', handleResize);
                window.addEventListener('orientationchange', () => {
                    // Delay the resize handling slightly after orientation change
                    setTimeout(handleResize, 200);
                });
                
                // Initial sizing
                setTimeout(handleResize, 100);
                
                console.log('Phaser game instance created successfully.');
            } catch (error) {
                console.error('Error creating Phaser game:', error);
            }
        } else {
            console.log('Phaser game already initialized.');
        }
    } else {
        console.error('Game container element not found! Delaying game initialization...');
        
        // Try again after a short delay to allow React to render
        setTimeout(() => {
            initializeGame();
        }, 500); // 500ms delay
    }
}

// Try multiple initialization approaches for better cross-platform compatibility

// Method 1: Wait for DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGame);
} else {
    // DOMContentLoaded has already fired
    setTimeout(initializeGame, 100);
}

// Method 2: Backup initialization after a delay to ensure React has rendered
setTimeout(initializeGame, 1000);

// Method 3: Window load event (last resort)
window.addEventListener('load', initializeGame);

// Export the config for reference
export { config };
