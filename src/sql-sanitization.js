// src/sql-sanitization.js
// DEPRECATED: Legacy SQL utilities - use src/sql.js and src/data-transform.js instead
// This module is maintained for backward compatibility only
// 
// Recommended migration:
// - Use normalizeData() from data-transform.js for business logic
// - Use generateInsert() from sql.js for SQL generation

const _ = require('lodash');
const SqlString = require('tsqlstring');
const { createSQLSanitizationError } = require('./error');
const { normalizeData, COMMON_FIELD_CONFIGS } = require('./data-transform');
const { generateInsert, generateUpdate, escape, escapeId, format, raw } = require('./sql');

/**
 * Simple field length limits for common database fields
 */
const FIELD_LENGTH_LIMITS = {
  // Common short fields
  Title: 250,
  Name: 250,
  Subject: 250,
  Type: 50,
  Email: 255,
  
  // URL fields
  Url: 2000,
  SourceUrl: 2000,
  SourceLink: 4000,
  SourceImageUrl: 4000,
  
  // ID fields
  SourceId: 500,
  
  // Author fields
  Author: 500,
  
  // File-related fields
  FileName: 255,
  FileExtension: 10,
  MimeType: 100,
  
  // Duration/size display fields
  FriendlyDuration: 50,
  FriendlyLength: 50
};

/**
 * @deprecated Use escape() from sql.js instead
 * Simple SQL value escaping using tsqlstring
 * @param {*} value - Value to escape for SQL
 * @param {Object} options - Escaping options
 * @param {boolean} options.includeQuotes - Include surrounding quotes
 * @returns {string} Properly escaped SQL value
 */
function escapeSqlValue(value, options = {}) {
  const { includeQuotes = true } = options;
  
  // Delegate to new sql.js module
  const escaped = escape(value);
  return includeQuotes ? escaped : escaped.slice(1, -1);
}

/**
 * Simple SQL text sanitization using tsqlstring
 * @param {*} text - Text to sanitize
 * @param {Object} options - Sanitization options
 * @param {number} options.maxLength - Maximum length (null for unlimited)
 * @param {boolean} options.includeQuotes - Include surrounding quotes for SQL values (default: true)
 * @returns {string|null} Sanitized text or null if empty
 */
function sanitizeForSQL(text, options = {}) {
  const { maxLength = null, includeQuotes = true } = options;

  // Handle null/undefined
  if (text === null || text === undefined) {
    return null;
  }

  // Convert to string if needed
  if (typeof text !== 'string') {
    text = typeof text === 'object' ? JSON.stringify(text) : String(text);
  }

  // Trim whitespace
  text = text.trim();

  // Return null for empty strings
  if (text === '') {
    return null;
  }

  // Remove null bytes and substitute characters
  text = text.replace(/\0/g, '').replace(/\x1a/g, '');

  // Apply length truncation before escaping
  if (maxLength && maxLength > 0 && text.length > maxLength) {
    text = text.substring(0, maxLength - 3) + '...';
  }

  // Use tsqlstring for escaping, preserve or remove quotes based on option
  const escaped = SqlString.escape(text);
  return includeQuotes ? escaped : escaped.slice(1, -1);
}

/**
 * Simple field-based sanitization with length limits
 * @param {*} text - Text to sanitize
 * @param {string} fieldName - Field name for length lookup
 * @param {number} maxLength - Maximum length override
 * @param {Object} options - Additional options
 * @returns {string|null} Sanitized text
 */
function sanitizeByFieldType(text, fieldName, maxLength = null, options = {}) {
  if (!text) return null;

  // Determine max length from field name or override
  const effectiveMaxLength = maxLength || FIELD_LENGTH_LIMITS[fieldName] || null;

  // Special handling for URLs - remove quotes and spaces
  if (fieldName && (fieldName.toLowerCase().includes('url') || fieldName.toLowerCase().includes('link'))) {
    text = String(text).trim().replace(/['"\s]/g, '');
  }

  // Special handling for emails - lowercase and clean
  if (fieldName && fieldName.toLowerCase().includes('email')) {
    text = String(text).trim().toLowerCase().replace(/['";\s]/g, '');
  }

  return sanitizeForSQL(text, { maxLength: effectiveMaxLength, ...options });
}

/**
 * Parse field list from comma-delimited string
 * @param {string} fieldListString - Comma-separated field names
 * @returns {Array|null} Array of field names or null for all fields
 */
function parseFieldList(fieldListString) {
  if (!fieldListString || typeof fieldListString !== 'string') {
    return null; // null means "process all fields"
  }

  return fieldListString
    .split(',')
    .map(field => field.trim())
    .filter(field => field.length > 0);
}

/**
 * Simple object sanitization with optional field selection
 * @param {Object} obj - Object to sanitize
 * @param {Array|null} fieldsToProcess - Fields to process (null = all fields)
 * @param {Object} options - Processing options
 * @param {boolean} options.includeOriginal - Include original values in output
 * @param {string} options.sanitizedSuffix - Suffix for sanitized field names
 * @returns {Object} Sanitized object
 */
function sanitizeObject(obj, fieldsToProcess = null, options = {}) {
  const {
    includeOriginal = false,
    sanitizedSuffix = 'Sanitized'
  } = options;

  const result = includeOriginal ? { ...obj } : {};

  for (const [key, value] of Object.entries(obj)) {
    const shouldProcess = fieldsToProcess === null || fieldsToProcess.includes(key);
    
    if (shouldProcess && value !== null && value !== undefined) {
      if (typeof value === 'number') {
        result[`${key}${sanitizedSuffix}`] = value;
      } else {
        result[`${key}${sanitizedSuffix}`] = sanitizeByFieldType(value, key);
      }
    } else if (shouldProcess) {
      result[`${key}${sanitizedSuffix}`] = null;
    }
  }

  return result;
}

/**
 * Validation function to check for potential issues in sanitization
 * @param {*} original - Original value
 * @param {*} sanitized - Sanitized value
 * @param {string} fieldName - Field name for error reporting
 * @returns {Array} Array of validation issues
 */
function validateSanitizedText(original, sanitized, fieldName = 'text') {
  const issues = [];

  if (original && !sanitized) {
    issues.push(`${fieldName}: Text was completely removed during sanitization`);
  }

  if (original && sanitized && original.length > sanitized.length * 2) {
    issues.push(`${fieldName}: Text was significantly truncated (${original.length} -> ${sanitized.length} chars)`);
  }

  if (sanitized && sanitized.includes('...')) {
    issues.push(`${fieldName}: Text was truncated due to length limits`);
  }

  return issues;
}

/**
 * Process multiple items with SQL sanitization using batch processing
 * @param {Array} items - Items to process
 * @param {Object} options - Processing options
 * @param {Array|null} options.fieldsToProcess - Fields to process
 * @param {boolean} options.includeValidation - Include validation results
 * @param {boolean} options.maintainPairing - Maintain n8n item pairing
 * @returns {Array} Processed items
 */
function sanitizeItemsBatch(items, options = {}) {
  const {
    fieldsToProcess = null,
    includeValidation = true,
    maintainPairing = true,
    logErrors = true
  } = options;

  const outputItems = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    try {
      let objectToProcess;

      // Determine what object to sanitize
      if (item.objectToSanitize !== undefined) {
        // Handle objectToSanitize - might be a string or already an object
        if (typeof item.objectToSanitize === 'string') {
          try {
            objectToProcess = JSON.parse(item.objectToSanitize);
          } catch (e) {
            throw new Error(`Failed to parse objectToSanitize as JSON: ${e.message}`);
          }
        } else if (typeof item.objectToSanitize === 'object' && item.objectToSanitize !== null) {
          objectToProcess = item.objectToSanitize;
        } else {
          throw new Error('objectToSanitize must be a JSON string or object');
        }
      } else {
        // Process the item itself
        objectToProcess = item;
      }

      // Parse field list if provided
      const fieldsToSanitize = parseFieldList(item.fieldsToSanitize) || fieldsToProcess;

      // Sanitize the object
      const sanitizedObject = sanitizeObject(
        objectToProcess,
        fieldsToSanitize,
        { includeOriginal: false }
      );

      // Add validation if requested
      if (includeValidation) {
        const allValidationIssues = [];
        const processedFields = [];

        for (const [key, value] of Object.entries(objectToProcess)) {
          const shouldProcess = fieldsToSanitize === null || fieldsToSanitize.includes(key);
          if (shouldProcess && (typeof value === 'string' || (value !== null && value !== undefined))) {
            processedFields.push(key);
            const sanitizedKey = `${key}Sanitized`;
            if (sanitizedObject[sanitizedKey] !== undefined) {
              const issues = validateSanitizedText(value, sanitizedObject[sanitizedKey], key);
              allValidationIssues.push(...issues);
            }
          }
        }

        // Add processing metadata
        sanitizedObject.processingMetadata = {
          sanitizedAt: new Date().toISOString(),
          itemIndex: i,
          validationIssues: allValidationIssues,
          fieldsProcessed: processedFields,
          fieldsRequested: fieldsToSanitize,
          totalFieldsInObject: Object.keys(objectToProcess).length
        };
      }

      if (maintainPairing) {
        outputItems.push({
          json: sanitizedObject,
          pairedItem: i
        });
      } else {
        outputItems.push(sanitizedObject);
      }

    } catch (error) {
      if (logErrors) {
        console.error(`Sanitization failed for item ${i}:`, error.message);
      }

      const errorResult = createSQLSanitizationError(error, i, item, includeValidation);

      if (maintainPairing) {
        outputItems.push({
          json: errorResult,
          pairedItem: i
        });
      } else {
        outputItems.push(errorResult);
      }
    }
  }

  return outputItems;
}

/**
 * Escape SQL identifiers (table names, column names) using tsqlstring
 * @param {string} identifier - Identifier to escape
 * @param {boolean} allowDots - Allow dots for qualified identifiers
 * @returns {string} Properly escaped SQL identifier
 */
function escapeSqlIdentifier(identifier, allowDots = true) {
  if (!identifier) return '';

  return SqlString.escapeId(identifier, !allowDots);
}

/**
 * Format SQL query with placeholders using tsqlstring
 * @param {string} sql - SQL query with ? placeholders
 * @param {Array} values - Values to substitute
 * @returns {string} Formatted SQL query
 */
function formatSqlQuery(sql, values) {
  if (!values || values.length === 0) return sql;

  return SqlString.format(sql, values);
}

/**
 * Create a raw SQL value that won't be escaped (use with caution)
 * @param {string} sql - Raw SQL string
 * @returns {Object} Raw SQL object for tsqlstring
 */
function createRawSql(sql) {
  return SqlString.raw(sql);
}

/**
 * Batch escape multiple values for SQL insertion
 * @param {Array} values - Array of values to escape
 * @param {Object} options - Escaping options
 * @returns {Array} Array of escaped values
 */
function escapeSqlValuesBatch(values, options = {}) {
  if (!Array.isArray(values)) return [];

  return values.map(value => escapeSqlValue(value, options));
}

/**
 * @deprecated Use generateInsert() from sql.js instead
 * Generate INSERT statement using SqlString.format with placeholders
 * @param {string} tableName - Table name
 * @param {Object|Array} data - Data to insert (object or array of objects)
 * @param {Object} options - Generation options
 * @param {string} options.outputClause - OUTPUT clause to add (e.g., "OUTPUT INSERTED.*")
 * @param {Object} options.specialValues - Special SQL values like { id: 'NEWID()' }
 * @returns {string} Generated INSERT statement
 */
function generateInsertStatement(tableName, data, options = {}) {
  const { outputClause = null, specialValues = {} } = options;
  
  // Convert specialValues to rawValues format for new API
  const rawValues = {};
  Object.keys(specialValues).forEach(key => {
    rawValues[key] = raw(specialValues[key]);
  });
  
  // Delegate to new sql.js module
  return generateInsert(tableName, data, { 
    outputClause, 
    rawValues 
  });
}


/**
 * @deprecated Use generateUpdate() from sql.js instead
 * Generate UPDATE statement with proper escaping
 * @param {string} tableName - Table name
 * @param {Object} data - Data to update
 * @param {Object} whereClause - WHERE clause conditions
 * @returns {string} Generated UPDATE statement
 */
function generateUpdateStatement(tableName, data, whereClause) {
  // Delegate to new sql.js module
  return generateUpdate(tableName, data, whereClause);
}

module.exports = {
  // Legacy sanitization functions (deprecated)
  sanitizeForSQL,
  sanitizeByFieldType,
  parseFieldList,
  sanitizeObject,
  validateSanitizedText,
  sanitizeItemsBatch,

  // Legacy tsqlstring-based functions (deprecated - use sql.js)
  escapeSqlValue,
  escapeSqlIdentifier: escapeId,
  formatSqlQuery: format,
  createRawSql: raw,
  escapeSqlValuesBatch,
  generateInsertStatement,
  generateUpdateStatement,
  
  // Legacy field limits (deprecated - use COMMON_FIELD_CONFIGS from data-transform.js)
  FIELD_LENGTH_LIMITS,
  
  // Re-export new modules for convenience
  normalizeData,
  COMMON_FIELD_CONFIGS,
  escape,
  escapeId,
  format,
  raw,
  generateInsert,
  generateUpdate
}; 