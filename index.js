// @rin8n/content-processing-utils
// Main entry point - exports all utilities from individual modules

// Import all modules from src directory
const duration = require('./src/duration');
const file = require('./src/file');
const text = require('./src/text');
const validation = require('./src/validation');
const batch = require('./src/batch');
const sqlSanitization = require('./src/sql-sanitization');

// Export all functions from all modules (individual imports)
module.exports = {
  // Duration utilities
  ...duration,
  
  // File utilities
  ...file,
  
  // Text processing utilities
  ...text,
  
  // Validation utilities
  ...validation,
  
  // Batch processing utilities
  ...batch,
  
  // SQL sanitization utilities
  ...sqlSanitization,
  
  // Module namespace exports (for grouped imports)
  modules: {
    duration,
    file,
    text,
    validation,
    batch,
    sqlSanitization
  },
  
  // Direct module access
  duration,
  file,
  text,
  validation,
  batch,
  sqlSanitization
};

// ESM export for modern environments
module.exports.default = module.exports;