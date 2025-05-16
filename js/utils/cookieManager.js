/**
 * Utility functions for managing cookies and state persistence
 */

// Save data to a cookie
export const setCookie = (name, value, days = 7) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${JSON.stringify(value)};expires=${expires.toUTCString()};path=/`;
};

// Get data from a cookie
export const getCookie = (name) => {
  const nameEQ = `${name}=`;
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      try {
        return JSON.parse(c.substring(nameEQ.length, c.length));
      } catch (e) {
        console.error('Error parsing cookie:', e);
        return null;
      }
    }
  }
  return null;
};

// Delete a cookie
export const deleteCookie = (name) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
};

// Save game state to localStorage (as a fallback if cookies are too large)
export const saveStateToStorage = (state) => {
  try {
    const serializedState = JSON.stringify(state);
    // Try cookies first (they persist across domains)
    try {
      setCookie('gameState', state);
    } catch (e) {
      // If cookie is too large, fall back to localStorage
      localStorage.setItem('gameState', serializedState);
    }
    return true;
  } catch (e) {
    console.error('Failed to save state:', e);
    return false;
  }
};

// Save script editor state to localStorage
export const saveScriptStateToStorage = (state) => {
  try {
    const serializedState = JSON.stringify(state);
    // Try cookies first (they persist across domains)
    try {
      setCookie('scriptState', state);
    } catch (e) {
      // If cookie is too large, fall back to localStorage
      localStorage.setItem('scriptState', serializedState);
    }
    console.log('Script state saved successfully');
    return true;
  } catch (e) {
    console.error('Failed to save script state:', e);
    return false;
  }
};

// Load game state from storage
export const loadStateFromStorage = () => {
  try {
    // Try to load from cookies first
    let state = getCookie('gameState');
    
    // If not found in cookies, try localStorage
    if (!state) {
      const serializedState = localStorage.getItem('gameState');
      if (serializedState) {
        state = JSON.parse(serializedState);
      }
    }
    
    return state;
  } catch (e) {
    console.error('Failed to load state:', e);
    return null;
  }
};

// Load script editor state from storage
export const loadScriptStateFromStorage = () => {
  try {
    // Try to load from cookies first
    let state = getCookie('scriptState');
    
    // If not found in cookies, try localStorage
    if (!state) {
      const serializedState = localStorage.getItem('scriptState');
      if (serializedState) {
        state = JSON.parse(serializedState);
      }
    }
    
    if (state) {
      console.log('Script state loaded successfully');
    }
    
    return state;
  } catch (e) {
    console.error('Failed to load script state:', e);
    return null;
  }
};

// Clear saved state
export const clearSavedState = () => {
  deleteCookie('gameState');
  localStorage.removeItem('gameState');
  deleteCookie('scriptState');
  localStorage.removeItem('scriptState');
  console.log('All saved states cleared');
};
