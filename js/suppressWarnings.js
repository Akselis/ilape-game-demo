// This file contains code to suppress specific React warnings
// that come from third-party libraries

// Suppress the ReactDOM.render warning
const originalConsoleWarn = console.warn;
console.warn = function(message) {
  // Check if the message is the ReactDOM.render warning
  if (typeof message === 'string' && message.includes('ReactDOM.render is no longer supported')) {
    // Ignore this specific warning
    return;
  }
  // Pass through all other warnings
  originalConsoleWarn.apply(console, arguments);
};

console.log('React warnings suppressed');
