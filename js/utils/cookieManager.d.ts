/**
 * Type declarations for cookieManager.js
 */

// Save data to a cookie
export function setCookie(name: string, value: any, days?: number): void;

// Get data from a cookie
export function getCookie(name: string): any | null;

// Delete a cookie
export function deleteCookie(name: string): void;

// Save game state to localStorage (as a fallback if cookies are too large)
export function saveStateToStorage(state: any): boolean;

// Save script editor state to localStorage
export function saveScriptStateToStorage(state: any): boolean;

// Load game state from storage
export function loadStateFromStorage(): any | null;

// Load script editor state from storage
export function loadScriptStateFromStorage(): any | null;

// Clear saved state
export function clearSavedState(): void;
