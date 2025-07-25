// sww-n8n-helpers
// Main entry point - exports all utilities with hybrid approach
// Supports both individual function imports and module-based imports

// Import all modules from src directory
const duration = require('./src/duration');
const file = require('./src/file');
const text = require('./src/text');
const validation = require('./src/validation');
const batch = require('./src/batch');
const sqlSanitization = require('./src/sql-sanitization');

// Export individual functions (for backwards compatibility and convenience)
const individualExports = {
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
  ...sqlSanitization
};

// Export modules as objects (for organized imports)
const moduleExports = {
  duration,
  file,
  text,
  validation,
  batch,
  sqlSanitization
};

// Hybrid export: individual functions + modules object
module.exports = {
  ...individualExports,
  modules: moduleExports
};

// ESM export for modern environments
module.exports.default = module.exports;