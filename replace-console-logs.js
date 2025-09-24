// Script to replace console.log with debugLog
// This is a Node.js script to automate the replacement

const fs = require('fs');
const path = require('path');

const files = [
  'script.js',
  'admin.js', 
  'wijzig-afspraak.js'
];

function replaceConsoleLogs(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace console.log with debugLog
    content = content.replace(/console\.log\(/g, 'debugLog(');
    
    // Keep console.error and console.warn as they are
    content = content.replace(/debugLog\(/g, 'debugLog(');
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated ${filePath}`);
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

// Process all files
files.forEach(file => {
  if (fs.existsSync(file)) {
    replaceConsoleLogs(file);
  } else {
    console.log(`⚠️ File not found: ${file}`);
  }
});

console.log('🎉 Console.log replacement completed!');
