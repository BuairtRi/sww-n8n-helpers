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
// AND module namespaces (namespace imports)
module.exports = {
  // Individual function exports (flat namespace)
  ...duration,
  ...file,
  ...text,
  ...validation,
  ...batch,
  ...sqlSanitization,
  
  // Module namespace exports (organized imports)
  duration,
  file,
  text,
  validation,
  batch,
  sqlSanitization
};

// ESM export for modern environments
module.exports.default = module.exports;