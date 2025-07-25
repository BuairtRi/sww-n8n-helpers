// src/sql-sanitization.js
// SQL sanitization utilities for safe database operations
// Prevents SQL injection attacks and provides field-specific sanitization
// Uses tsqlstring for T-SQL/MS SQL Server specific escaping

const _ = require('lodash');
const SqlString = require('tsqlstring'); // peer dependency
const { createProcessingError } = require('./validation');

/**
 * Default field type configurations for sanitization
 */
const DEFAULT_FIELD_MAPPINGS = {
  // Topic fields
  Topic: { type: 'title', maxLength: 250 },
  PodcastPrompt: { type: 'content', maxLength: null },
  DigestPrompt: { type: 'content', maxLength: null },
  ResearchBriefPrompt: { type: 'content', maxLength: null },
  
  // Knowledge Source fields
  Name: { type: 'name', maxLength: 250 },
  Url: { type: 'url', maxLength: 2000 },
  SourceId: { type: 'default', maxLength: 500 },
  
  // Knowledge Source Instance fields
  Title: { type: 'title', maxLength: 250 },
  Subtitle: { type: 'title', maxLength: 250 },
  Author: { type: 'name', maxLength: 500 },
  SourceSummary: { type: 'summary', maxLength: null },
  SourceDescription: { type: 'description', maxLength: null },
  SourceUrl: { type: 'url', maxLength: 2000 },
  SourceLink: { type: 'url', maxLength: 4000 },
  SourceImageUrl: { type: 'url', maxLength: 4000 },
  
  // Text fields
  Text: { type: 'content', maxLength: null },
  Type: { type: 'name', maxLength: 50 },
  
  // Common fields
  subject: { type: 'title', maxLength: 250 },
  title: { type: 'title', maxLength: 250 },
  description: { type: 'description', maxLength: null },
  content: { type: 'content', maxLength: null },
  summary: { type: 'summary', maxLength: null },
  email: { type: 'email', maxLength: 255 },
  url: { type: 'url', maxLength: 2000 },
  link: { type: 'url', maxLength: 2000 }
};

/**
 * Core sanitization function for SQL-safe text using tsqlstring
 * @param {*} text - Text to sanitize
 * @param {Object} options - Sanitization options
 * @param {number} options.maxLength - Maximum length (null for unlimited)
 * @param {boolean} options.allowNewlines - Allow newline characters
 * @param {boolean} options.preserveBasicFormatting - Preserve basic formatting
 * @param {boolean} options.strictMode - Enable strict sanitization
 * @param {boolean} options.useTsqlstring - Use tsqlstring for escaping (default: true)
 * @returns {string|null} Sanitized text or null if empty
 */
function sanitizeForSQL(text, options = {}) {
  const {
    maxLength = null,
    allowNewlines = true,
    preserveBasicFormatting = false,
    strictMode = false,
    useTsqlstring = true
  } = options;
  
  // Handle null/undefined
  if (text === null || text === undefined) {
    return null;
  }
  
  // Convert to string if needed
  if (typeof text !== 'string') {
    if (typeof text === 'object' && text !== null) {
      text = JSON.stringify(text);
    } else {
      text = String(text);
    }
  }
  
  // Trim whitespace
  text = text.trim();
  
  // Return null for empty strings
  if (text === '') {
    return null;
  }
  
  // Truncate if max length specified and is a positive number
  if (maxLength && maxLength > 0 && text.length > maxLength) {
    text = text.substring(0, maxLength - 3) + '...';
  }
  
  // Handle newlines based on preference
  if (!allowNewlines) {
    text = text.replace(/[\r\n]+/g, ' ');
  } else if (!preserveBasicFormatting) {
    // Normalize line endings
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }
  
  // Clean up extra whitespace (unless preserving formatting)
  if (!preserveBasicFormatting) {
    text = text.replace(/\s+/g, ' ').trim();
  }
  
  // In strict mode, be more aggressive with dangerous patterns
  if (strictMode) {
    const dangerousPatterns = [
      /--\s*$/gm,  // SQL comments at end of lines
      /\/\*.*?\*\//gs, // Block comments
      /<script[^>]*>.*?<\/script>/gis, // Script tags
      /<iframe[^>]*>.*?<\/iframe>/gis, // Iframe tags
      /xp_cmdshell/gi, // Dangerous SQL Server procedures
      /sp_oacreate/gi,
      /sp_oamethod/gi
    ];
    
    dangerousPatterns.forEach(pattern => {
      text = text.replace(pattern, ' ');
    });
  }
  
  // Use tsqlstring for robust T-SQL escaping
  if (useTsqlstring) {
    // tsqlstring.escape() handles all the complex SQL injection scenarios
    const escaped = SqlString.escape(text);
    // Remove the outer quotes that tsqlstring adds since we may not always want them
    return escaped.slice(1, -1);
  } else {
    // Fallback: Basic escaping
    text = text.replace(/'/g, "''");
    text = text.replace(/\\/g, "\\\\");
    text = text.replace(/\0/g, " ");
    text = text.replace(/\x1a/g, " ");
    return text;
  }
}

/**
 * Enhanced sanitization for different field types
 * @param {*} text - Text to sanitize
 * @param {string} fieldType - Type of field (title, content, url, etc.)
 * @param {number} maxLength - Maximum length override
 * @returns {string|null} Sanitized text
 */
function sanitizeByFieldType(text, fieldType, maxLength = null) {
  // Normalize maxLength - treat null, undefined, 0, or negative numbers as unlimited
  const effectiveMaxLength = (maxLength === null || maxLength === undefined || maxLength <= 0) ? null : maxLength;
  const baseOptions = { maxLength: effectiveMaxLength };
  
  switch (fieldType.toLowerCase()) {
    case 'title':
    case 'name':
    case 'subject':
      return sanitizeForSQL(text, {
        ...baseOptions,
        maxLength: effectiveMaxLength || 250,
        allowNewlines: false,
        strictMode: true
      });
      
    case 'description':
    case 'content':
    case 'summary':
      return sanitizeForSQL(text, {
        ...baseOptions,
        maxLength: effectiveMaxLength,
        allowNewlines: true,
        preserveBasicFormatting: true,
        strictMode: false
      });
      
    case 'url':
    case 'link':
      // URLs need special handling
      if (!text) return null;
      const cleanUrl = text.trim().replace(/['"\s]/g, '');
      return sanitizeForSQL(cleanUrl, {
        maxLength: effectiveMaxLength || 2000,
        allowNewlines: false,
        strictMode: true
      });
      
    case 'email':
      if (!text) return null;
      const cleanEmail = text.trim().toLowerCase().replace(/['";\s]/g, '');
      return sanitizeForSQL(cleanEmail, {
        maxLength: effectiveMaxLength || 255,
        allowNewlines: false,
        strictMode: true
      });
      
    case 'json':
      // For JSON strings, be extra careful
      if (!text) return null;
      try {
        // Validate it's actually JSON
        JSON.parse(text);
        return sanitizeForSQL(text, {
          ...baseOptions,
          allowNewlines: true,
          strictMode: false
        });
      } catch (e) {
        console.warn('Invalid JSON provided for sanitization:', e.message);
        return sanitizeForSQL(text, {
          ...baseOptions,
          allowNewlines: true,
          strictMode: true
        });
      }
      
    default:
      return sanitizeForSQL(text, {
        ...baseOptions,
        allowNewlines: true,
        strictMode: false
      });
  }
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
 * Batch sanitization function for multiple fields with selective processing
 * @param {Object} obj - Object to sanitize
 * @param {Object} fieldMappings - Field type mappings
 * @param {Array|null} fieldsToProcess - Fields to process (null = all string fields)
 * @param {Object} options - Processing options
 * @param {boolean} options.includeOriginal - Include original values in output
 * @param {string} options.sanitizedSuffix - Suffix for sanitized field names
 * @returns {Object} Sanitized object
 */
function sanitizeObject(obj, fieldMappings = {}, fieldsToProcess = null, options = {}) {
  const { 
    includeOriginal = false, 
    sanitizedSuffix = 'Sanitized' 
  } = options;
  
  const result = includeOriginal ? { ...obj } : {};
  
  // If fieldsToProcess is null, process all string fields
  // If it's an array, only process those fields
  const shouldProcessField = (key) => {
    if (fieldsToProcess === null) return true;
    return fieldsToProcess.includes(key);
  };
  
  for (const [key, value] of Object.entries(obj)) {
    // Only process if it's in our field list and is a string-like value
    if (shouldProcessField(key) && (value !== null && value !== undefined)) {
      // Determine field type and max length from mappings
      const fieldConfig = fieldMappings[key] || {};
      const fieldType = fieldConfig.type || 'default';
      const maxLength = fieldConfig.maxLength || null;
      
      // Add sanitized version
      result[`${key}${sanitizedSuffix}`] = sanitizeByFieldType(value, fieldType, maxLength);
    } else if (shouldProcessField(key)) {
      // Field was in the list but is null/undefined
      result[`${key}${sanitizedSuffix}`] = null;
    }
  }
  
  return result;
}

/**
 * Advanced SQL escaping using tsqlstring for complex scenarios
 * @param {*} value - Value to escape for SQL
 * @param {Object} options - Escaping options
 * @param {boolean} options.includeQuotes - Include surrounding quotes
 * @returns {string} Properly escaped SQL value
 */
function escapeSqlValue(value, options = {}) {
  const { includeQuotes = true } = options;
  
  // Use tsqlstring's robust escaping
  const escaped = SqlString.escape(value);
  
  return includeQuotes ? escaped : escaped.slice(1, -1);
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
 * Generate INSERT statement with proper escaping
 * @param {string} tableName - Table name
 * @param {Object|Array} data - Data to insert (object or array of objects)
 * @param {Object} options - Generation options
 * @returns {string} Generated INSERT statement
 */
function generateInsertStatement(tableName, data, options = {}) {
  if (!tableName || !data) {
    throw new Error('Table name and data are required');
  }
  
  const escapedTable = escapeSqlIdentifier(tableName);
  
  if (Array.isArray(data)) {
    // Bulk insert
    if (data.length === 0) return '';
    
    const firstRow = data[0];
    const columns = Object.keys(firstRow);
    const escapedColumns = columns.map(col => escapeSqlIdentifier(col));
    
    const values = data.map(row => 
      `(${columns.map(col => escapeSqlValue(row[col])).join(', ')})`
    ).join(', ');
    
    return `INSERT INTO ${escapedTable} (${escapedColumns.join(', ')}) VALUES ${values}`;
  } else {
    // Single row insert
    const columns = Object.keys(data);
    const escapedColumns = columns.map(col => escapeSqlIdentifier(col));
    const values = columns.map(col => escapeSqlValue(data[col]));
    
    return `INSERT INTO ${escapedTable} (${escapedColumns.join(', ')}) VALUES (${values.join(', ')})`;
  }
}

/**
 * Generate UPDATE statement with proper escaping
 * @param {string} tableName - Table name
 * @param {Object} data - Data to update
 * @param {Object} whereClause - WHERE clause conditions
 * @param {Object} options - Generation options
 * @returns {string} Generated UPDATE statement
 */
function generateUpdateStatement(tableName, data, whereClause, options = {}) {
  if (!tableName || !data || !whereClause) {
    throw new Error('Table name, data, and where clause are required');
  }
  
  const escapedTable = escapeSqlIdentifier(tableName);
  
  const setParts = Object.keys(data).map(key => 
    `${escapeSqlIdentifier(key)} = ${escapeSqlValue(data[key])}`
  );
  
  const whereParts = Object.keys(whereClause).map(key =>
    `${escapeSqlIdentifier(key)} = ${escapeSqlValue(whereClause[key])}`
  );
  
  return `UPDATE ${escapedTable} SET ${setParts.join(', ')} WHERE ${whereParts.join(' AND ')}`;
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
 * @param {Object} options.fieldMappings - Field type mappings
 * @param {Array|null} options.fieldsToProcess - Fields to process
 * @param {boolean} options.includeValidation - Include validation results
 * @param {boolean} options.maintainPairing - Maintain n8n item pairing
 * @returns {Array} Processed items
 */
function sanitizeItemsBatch(items, options = {}) {
  const {
    fieldMappings = DEFAULT_FIELD_MAPPINGS,
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
        item.fieldMappings || fieldMappings, 
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
      
      const errorResult = createProcessingError(
        'sanitization_error',
        error.message,
        { 
          itemIndex: i,
          originalData: {
            keys: Object.keys(item || {}),
            hasObjectToSanitize: item?.objectToSanitize !== undefined,
            fieldsToSanitize: item?.fieldsToSanitize
          }
        }
      );
      
      if (includeValidation) {
        errorResult.processingMetadata = {
          sanitizedAt: new Date().toISOString(),
          itemIndex: i,
          failed: true
        };
      }
      
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

module.exports = {
  // Core sanitization functions
  sanitizeForSQL,
  sanitizeByFieldType,
  parseFieldList,
  sanitizeObject,
  validateSanitizedText,
  sanitizeItemsBatch,
  DEFAULT_FIELD_MAPPINGS,
  
  // Advanced tsqlstring-based functions
  escapeSqlValue,
  escapeSqlIdentifier,
  formatSqlQuery,
  createRawSql,
  escapeSqlValuesBatch,
  generateInsertStatement,
  generateUpdateStatement
}; 