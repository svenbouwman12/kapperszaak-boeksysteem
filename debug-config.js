// Debug Configuration
// Set to true to enable debug logging, false to disable
window.DEBUG_MODE = false;

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
  console.log('Debug mode:', window.DEBUG_MODE ? 'ON' : 'OFF');
  return window.DEBUG_MODE;
};

// Initialize debug mode message
if (window.DEBUG_MODE) {
  console.log('🐛 Debug mode is ENABLED');
} else {
  console.log('🔇 Debug mode is DISABLED - use toggleDebug() to enable');
}
