// Debug Configuration
// Set to true to enable debug logging, false to disable
window.DEBUG_MODE = true;

// Debug logging function
window.debugLog = function(...args) {
  if (window.DEBUG_MODE) {
    console.log(...args);
  }
};

// Debug error logging (always shows errors)
window.debugError = function(...args) {
  console.error(...args);
};

// Debug warning logging (always shows warnings)
window.debugWarn = function(...args) {
  console.warn(...args);
};

// Debug info logging (controlled by DEBUG_MODE)
window.debugInfo = function(...args) {
  if (window.DEBUG_MODE) {
    console.info(...args);
  }
};

// Quick toggle function for browser console
window.toggleDebug = function() {
  window.DEBUG_MODE = !window.DEBUG_MODE;
  if (window.DEBUG_MODE) {
    console.log('🐛 Debug mode: ON - All debug messages will be shown');
  } else {
    console.log('🔇 Debug mode: OFF - Debug messages hidden');
  }
  return window.DEBUG_MODE;
};

// Initialize debug mode message (only show when explicitly enabled)
// No automatic messages for end users
