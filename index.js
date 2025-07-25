// @rin8n/content-processing-utils
// Main entry point - exports all utilities from individual modules

// Import all modules from src directory
const duration = require('./src/duration');
const file = require('./src/file');
const text = require('./src/text');
const validation = require('./src/validation');
const batch = require('./src/batch');
const sqlSanitization = require('./src/sql-sanitization');

// Export hybrid structure: both individual functions AND grouped modules
module.exports = {
  // Individual functions (for backward compatibility and convenience)
  ...duration,
  ...file,
  ...text,
  ...validation,
  ...batch,
  ...sqlSanitization,
  
  // Grouped modules (for organized imports)
  duration,
  file,
  text,
  validation,
  batch,
  sqlSanitization
};

// ESM export for modern environments
module.exports.default = module.exports;