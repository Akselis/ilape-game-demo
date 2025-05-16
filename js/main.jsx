// Import warning suppression first
import './suppressWarnings.js';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// Import the game after App to ensure the DOM is ready
import './game/game.js';

console.log('main.jsx executing...');

// Find the root element
const rootElement = document.getElementById('root');

if (rootElement) {
    console.log('Found root element, creating React root...');
    // Create a React root
    const root = ReactDOM.createRoot(rootElement);

    // Render the App component inside StrictMode for extra checks
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
    console.log('React app rendered.');
    
    // The game will be initialized after DOM is ready via the event listener in game.js
} else {
    console.error('Failed to find the root element');
}

console.log('main.jsx finished.');
