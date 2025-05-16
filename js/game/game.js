import Phaser from 'phaser';
import { EditorScene } from './scenes/EditorScene.js';

const config = {
    type: Phaser.AUTO,
    width: 800, 
    height: 500, // Match the container height
    parent: 'game-container', // Target the container div we created in App.jsx
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 }, // Add some gravity for jumping
            debug: true 
        }
    },
    scene: [EditorScene], 
    backgroundColor: '#333',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

// Wait for the DOM to be ready before initializing Phaser
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Phaser game...');
    
    // Check if the game container exists
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
        const game = new Phaser.Game(config);
        console.log('Phaser game instance created.');
        
        // Make the game instance globally available
        window.phaserGame = game;
    } else {
        console.error('Game container element not found! Delaying game initialization...');
        
        // Try again after a short delay to allow React to render
        setTimeout(() => {
            const delayedContainer = document.getElementById('game-container');
            if (delayedContainer) {
                const game = new Phaser.Game(config);
                console.log('Phaser game instance created after delay.');
                window.phaserGame = game;
            } else {
                console.error('Game container element still not found after delay!');
            }
        }, 500);
    }
});

// Export the config for reference
export { config };
