// @rin8n/content-processing-utils
// Main entry point - exports all utilities from individual modules

// Import all modules from src directory
const duration = require('./src/duration');
const file = require('./src/file');
const text = require('./src/text');
const validation = require('./src/validation');
const batch = require('./src/batch');
const sqlSanitization = require('./src/sql-sanitization');

// Export all functions from all modules (for destructuring)
// AND export modules as objects (for organized access)
module.exports = {
  // Individual functions for destructuring import
  // e.g., const { cleanHtml, validateEmail } = require('@rin8n/content-processing-utils');
  
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

  // Module objects for organized access
  // e.g., const { text, validation } = require('@rin8n/content-processing-utils');
  // then: text.cleanHtml(...), validation.validateEmail(...)
  
  text: text,
  duration: duration,
  file: file,
  validation: validation,
  batch: batch,
  sqlSanitization: sqlSanitization
};

// ESM export for modern environments
module.exports.default = module.exports;