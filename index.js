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
const n8n = require('./src/n8n');

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
  ...n8n,

  // Module namespace exports (organized imports)
  duration,
  file,
  text,
  validation,
  batch,
  sqlSanitization,
  n8n
};

// ESM export for modern environments
module.exports.default = module.exports;