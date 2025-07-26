// src/data-transform.js
// Business data normalization utilities
// Handles field transformations, null handling, validation, and business rules

const { cleanHtml: cleanHtmlText, truncateWithSeparator } = require('./text');

/**
 * Normalize a single field value according to business rules
 * @param {*} value - The raw value to normalize
 * @param {Object} fieldConfig - Field configuration object
 * @param {string} fieldConfig.type - Field type (string, integer, bigint, boolean, date)
 * @param {number} fieldConfig.maxLength - Maximum length for strings
 * @param {boolean} fieldConfig.cleanHtml - Whether to clean HTML from strings
 * @param {boolean} fieldConfig.required - Whether field is required
 * @param {*} fieldConfig.defaultValue - Explicit default value (takes precedence)
 * @param {boolean} fieldConfig.trimWhitespace - Whether to trim whitespace (default: true)
 * @param {function} fieldConfig.customTransform - Custom transformation function
 * @returns {*} Normalized value
 */
function normalizeField(value, fieldConfig = {}) {
  const { 
    type = 'string',
    maxLength = null,
    cleanHtml = false,
    required = false,
    defaultValue = null,
    trimWhitespace = true,
    customTransform = null
  } = fieldConfig;

  // Step 1: Handle nulls/undefined as part of normalization
  if (value === null || value === undefined || value === '') {
    // If explicit defaultValue is provided, ALWAYS use it
    if (defaultValue !== null) {
      return defaultValue;
    }
    
    // Only fall back to type-based defaults if no explicit default AND required
    if (required) {
      switch (type) {
        case 'integer':
        case 'bigint': return 0;
        case 'string': return '';
        case 'boolean': return false;
        case 'date': return new Date().toISOString();
        default: return null;
      }
    }
    
    // Not required, no explicit default → null
    return null;
  }

  // Step 2: Apply business transformations to non-null values
  let normalized = value;
  
  // Trim whitespace for strings
  if (trimWhitespace && typeof normalized === 'string') {
    normalized = normalized.trim();
    // After trimming, check if it became empty
    if (normalized === '') {
      return normalizeField(null, fieldConfig); // Recurse with null handling
    }
  }
  
  // Clean HTML from strings
  if (cleanHtml && typeof normalized === 'string') {
    normalized = cleanHtmlText(normalized);
  }

  // Truncate strings to max length
  if (maxLength && typeof normalized === 'string') {
    normalized = truncateWithSeparator(normalized, maxLength, { separator: ' ' });
  }

  // Apply custom transformation if provided
  if (customTransform && typeof customTransform === 'function') {
    normalized = customTransform(normalized);
  }

  // Step 3: Type coercion and validation
  switch (type) {
    case 'integer':
      const intVal = parseInt(normalized);
      return isNaN(intVal) ? (required ? 0 : null) : intVal;
      
    case 'bigint':
      const bigintVal = parseInt(normalized);
      return isNaN(bigintVal) ? (required ? 0 : null) : bigintVal;
      
    case 'boolean':
      if (typeof normalized === 'boolean') return normalized;
      if (typeof normalized === 'string') {
        const lower = normalized.toLowerCase();
        return lower === 'true' || lower === '1' || lower === 'yes';
      }
      return Boolean(normalized);
      
    case 'date':
      if (normalized instanceof Date) return normalized.toISOString();
      if (typeof normalized === 'string') {
        const date = new Date(normalized);
        return isNaN(date.getTime()) ? (required ? new Date().toISOString() : null) : date.toISOString();
      }
      return required ? new Date().toISOString() : null;
      
    case 'string':
      return String(normalized);
      
    default:
      return normalized;
  }
}

/**
 * Normalize an entire data object according to a schema
 * @param {Object} data - Raw data object to normalize
 * @param {Object} schema - Schema object where keys are field names and values are field configs
 * @param {Object} options - Additional options
 * @param {boolean} options.includeOriginal - Include original values in output
 * @param {boolean} options.strict - Only include fields defined in schema
 * @returns {Object} Normalized data object
 */
function normalizeData(data, schema, options = {}) {
  const { includeOriginal = false, strict = false } = options;
  
  if (!data || typeof data !== 'object') {
    throw new Error('Data must be an object');
  }
  
  if (!schema || typeof schema !== 'object') {
    throw new Error('Schema must be an object');
  }
  
  const result = includeOriginal ? { ...data } : {};
  
  // Process fields defined in schema
  for (const [fieldName, fieldConfig] of Object.entries(schema)) {
    const rawValue = data[fieldName];
    result[fieldName] = normalizeField(rawValue, fieldConfig);
  }
  
  // Include non-schema fields if not in strict mode
  if (!strict) {
    for (const [fieldName, value] of Object.entries(data)) {
      if (!schema[fieldName] && !result.hasOwnProperty(fieldName)) {
        result[fieldName] = value;
      }
    }
  }
  
  return result;
}

/**
 * Create a reusable normalizer function from a schema
 * @param {Object} schema - Field schema configuration
 * @param {Object} options - Default options for normalization
 * @returns {Function} Normalizer function that takes data and returns normalized data
 */
function createNormalizer(schema, options = {}) {
  return function(data) {
    return normalizeData(data, schema, options);
  };
}

/**
 * Validate that normalized data meets requirements
 * @param {Object} data - Normalized data to validate
 * @param {Object} schema - Schema used for normalization
 * @returns {Object} Validation result with { isValid, errors, warnings }
 */
function validateNormalizedData(data, schema) {
  const errors = [];
  const warnings = [];
  
  for (const [fieldName, fieldConfig] of Object.entries(schema)) {
    const value = data[fieldName];
    const { required = false, type = 'string', maxLength = null } = fieldConfig;
    
    // Check required fields
    if (required && (value === null || value === undefined || value === '')) {
      errors.push(`Required field '${fieldName}' is missing or empty`);
    }
    
    // Check string length (even after truncation, might indicate data loss)
    if (type === 'string' && maxLength && typeof value === 'string' && value.length === maxLength) {
      if (value.endsWith('...')) {
        warnings.push(`Field '${fieldName}' was truncated to ${maxLength} characters`);
      }
    }
    
    // Type validation
    if (value !== null && value !== undefined) {
      switch (type) {
        case 'integer':
        case 'bigint':
          if (typeof value !== 'number' || !Number.isInteger(value)) {
            errors.push(`Field '${fieldName}' should be an integer, got ${typeof value}`);
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push(`Field '${fieldName}' should be a boolean, got ${typeof value}`);
          }
          break;
        case 'string':
          if (typeof value !== 'string') {
            errors.push(`Field '${fieldName}' should be a string, got ${typeof value}`);
          }
          break;
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Common field configurations for reuse
 */
const COMMON_FIELD_CONFIGS = {
  // Text fields
  title: { type: 'string', maxLength: 250, cleanHtml: true, required: true, trimWhitespace: true },
  name: { type: 'string', maxLength: 250, required: true, trimWhitespace: true },
  description: { type: 'string', maxLength: 4000, cleanHtml: true, trimWhitespace: true },
  summary: { type: 'string', maxLength: 2000, cleanHtml: true, trimWhitespace: true },
  
  // URL fields
  url: { type: 'string', maxLength: 2000, trimWhitespace: true },
  sourceUrl: { type: 'string', maxLength: 2000, trimWhitespace: true },
  sourceLink: { type: 'string', maxLength: 4000, trimWhitespace: true },
  imageUrl: { type: 'string', maxLength: 4000, trimWhitespace: true },
  
  // ID fields
  guid: { type: 'string', maxLength: 500, required: true, trimWhitespace: true },
  sourceId: { type: 'string', maxLength: 500, trimWhitespace: true },
  knowledgeSourceId: { type: 'string', required: true, trimWhitespace: true }, // GUID/uniqueidentifier
  
  // Numeric fields
  duration: { type: 'integer', defaultValue: 0 },
  fileSize: { type: 'bigint', defaultValue: 0 },
  id: { type: 'integer', required: true },
  
  // File fields
  fileName: { type: 'string', maxLength: 255, trimWhitespace: true },
  fileExtension: { type: 'string', maxLength: 10, trimWhitespace: true },
  mimeType: { type: 'string', maxLength: 100, trimWhitespace: true },
  
  // Author and meta fields
  author: { type: 'string', maxLength: 500, trimWhitespace: true },
  email: { 
    type: 'string', 
    maxLength: 255, 
    trimWhitespace: true,
    customTransform: (value) => typeof value === 'string' ? value.toLowerCase() : value
  },
  
  // Date fields
  publicationDate: { type: 'date' },
  createdAt: { type: 'date', defaultValue: () => new Date().toISOString() },
  updatedAt: { type: 'date', defaultValue: () => new Date().toISOString() },
  
  // Boolean fields
  active: { type: 'boolean', defaultValue: true },
  published: { type: 'boolean', defaultValue: false }
};

module.exports = {
  normalizeField,
  normalizeData,
  createNormalizer,
  validateNormalizedData,
  COMMON_FIELD_CONFIGS
};