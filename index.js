// sww-n8n-helpers
// Main entry point - exports all utilities with hybrid approach
// Supports both individual function imports and module-based imports

// Get package version for debugging
const packageJson = require('./package.json');

/**
 * Get the current package version for debugging purposes
 * @returns {string} The current version string
 */
function getVersion() {
  return packageJson.version;
}

/**
 * Get detailed package information for debugging
 * @returns {Object} Package information including version, name, and description
 */
function getPackageInfo() {
  return {
    name: packageJson.name,
    version: packageJson.version,
    description: packageJson.description,
    loadedAt: new Date().toISOString()
  };
}

// Import all modules from src directory
const duration = require('./src/duration');
const file = require('./src/file');
const text = require('./src/text');
const validation = require('./src/validation');
const batch = require('./src/batch');
const dataTransform = require('./src/data-transform');
const sql = require('./src/sql');
const sqlSanitization = require('./src/sql-sanitization'); // Legacy compatibility
const n8n = require('./src/n8n');
const slackBlocks = require('./src/slack-blocks');

// Export all functions from all modules (individual imports)
// AND module namespaces (namespace imports)
module.exports = {
  // Individual function exports (flat namespace)
  ...duration,
  ...file,
  ...text,
  ...validation,
  ...batch,
  ...dataTransform,
  ...sql,
  ...sqlSanitization, // Legacy exports for backward compatibility
  ...n8n,
  ...slackBlocks,

  // Version and debugging functions
  getVersion,
  getPackageInfo,

  // Module namespace exports (organized imports)
  duration,
  file,
  text,
  validation,
  batch,
  dataTransform,
  sql,
  sqlSanitization, // Legacy - use dataTransform + sql instead
  n8n,
  slackBlocks
};

// ESM export for modern environments
module.exports.default = module.exports;