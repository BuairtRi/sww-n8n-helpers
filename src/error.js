// src/error.js
// Centralized error handling utilities for different use cases

const _ = require('lodash');

/**
 * Create a base error object with common fields
 * @param {string} type - Error type
 * @param {string} message - Error message
 * @param {Object} context - Additional context
 * @returns {Object} Base error object
 */
function createBaseError(type, message, context = {}) {
  return {
    _error: {
      type,
      message,
      timestamp: new Date().toISOString(),
      ...context
    }
  };
}

/**
 * Create error object for N8N batch processing failures
 * Maintains item pairing and preserves original data for debugging
 * @param {Error} error - The error that occurred
 * @param {Object} item - The item that failed processing
 * @param {number} itemIndex - Index of the failed item
 * @param {boolean} logErrors - Whether to log the error
 * @returns {Object} Error result object with pairedItem
 */
function createN8NProcessingError(error, item, itemIndex, logErrors = true) {
  if (logErrors) {
    console.error(`Processing failed for item ${itemIndex}:`, error.message);
  }
  
  const errorObj = createBaseError(
    'processing_error',
    error.message,
    { 
      itemIndex, 
      originalData: _.pick(item.json || item, ['id', 'title', 'name', 'guid']),
      stack: error.stack
    }
  );
  
  return {
    result: {
      json: {
        ...(item.json || item),
        ...errorObj
      },
      pairedItem: itemIndex
    },
    errorInfo: {
      itemIndex,
      error: errorObj._error,
      originalItem: item
    }
  };
}

/**
 * Create error object for SQL sanitization failures
 * Includes field-specific context and processing metadata
 * @param {Error} error - The error that occurred
 * @param {number} itemIndex - Index of the failed item
 * @param {Object} item - The item that failed sanitization
 * @param {boolean} includeValidation - Whether to include processing metadata
 * @returns {Object} Sanitization error object
 */
function createSQLSanitizationError(error, itemIndex, item = {}, includeValidation = true) {
  const errorResult = createBaseError(
    'sanitization_error',
    error.message,
    {
      itemIndex,
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
      itemIndex,
      failed: true
    };
  }

  return errorResult;
}

/**
 * Create error object for general validation failures
 * Flexible structure for various validation contexts
 * @param {string} type - Error type
 * @param {string} message - Error message
 * @param {Object} context - Additional context
 * @returns {Object} Standardized validation error object
 */
function createValidationError(type, message, context = {}) {
  return createBaseError(type, message, context);
}

/**
 * Create error object for N8N node access failures
 * Includes node access context and retry information
 * @param {string} nodeName - Name of the node that failed
 * @param {number} itemIndex - Index of the item being accessed
 * @param {Error} error - The error that occurred
 * @param {number} attempt - Current attempt number
 * @param {string} accessMethod - Method used to access the node
 * @returns {Object} Node access error object
 */
function createNodeAccessError(nodeName, itemIndex, error, attempt = 0, accessMethod = 'unknown') {
  return createBaseError(
    'node_access_error',
    `Failed to access node '${nodeName}': ${error.message}`,
    {
      nodeName,
      itemIndex,
      attempt,
      accessMethod,
      originalError: error.message,
      stack: error.stack
    }
  );
}

/**
 * Create error object for data parsing failures
 * Used for JSON parsing, duration parsing, etc.
 * @param {string} dataType - Type of data being parsed
 * @param {*} originalValue - The value that failed to parse
 * @param {Error} error - The parsing error
 * @param {Object} context - Additional parsing context
 * @returns {Object} Parsing error object
 */
function createParsingError(dataType, originalValue, error, context = {}) {
  return createBaseError(
    'parsing_error',
    `Failed to parse ${dataType}: ${error.message}`,
    {
      dataType,
      originalValue: typeof originalValue === 'object' ? 
        JSON.stringify(originalValue).substring(0, 100) : 
        String(originalValue).substring(0, 100),
      originalError: error.message,
      ...context
    }
  );
}

/**
 * Create error object for file operation failures
 * Used for file validation, generation, etc.
 * @param {string} operation - File operation that failed
 * @param {string} filename - Filename or path involved
 * @param {Error} error - The file operation error
 * @param {Object} context - Additional file context
 * @returns {Object} File operation error object
 */
function createFileOperationError(operation, filename, error, context = {}) {
  return createBaseError(
    'file_operation_error',
    `File ${operation} failed for '${filename}': ${error.message}`,
    {
      operation,
      filename,
      originalError: error.message,
      ...context
    }
  );
}

/**
 * Calculate processing statistics from results and errors
 * Provides success rates, error breakdowns, and sample errors
 * @param {Array} results - Processing results array
 * @param {Array} errors - Errors array
 * @returns {Object} Statistics object with error analysis
 */
function calculateErrorStats(results, errors) {
  const total = results.length;
  const failed = errors.length;
  const successful = total - failed;
  
  const stats = {
    total,
    successful,
    failed,
    successRate: total > 0 ? successful / total : 0,
    failureRate: total > 0 ? failed / total : 0
  };
  
  if (failed > 0) {
    const errorTypes = {};
    errors.forEach(error => {
      const errorType = error.error?.type || 'unknown';
      errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
    });
    
    stats.errorBreakdown = errorTypes;
    stats.sampleErrors = errors.slice(0, 3).map(error => ({
      type: error.error?.type,
      message: error.error?.message,
      itemIndex: error.itemIndex
    }));
  }
  
  return stats;
}

/**
 * Wrap a function with error handling
 * Automatically creates appropriate error objects for function failures
 * @param {Function} fn - Function to wrap
 * @param {string} errorType - Type of error to create on failure
 * @param {Object} context - Additional context for error creation
 * @returns {Function} Wrapped function that handles errors
 */
function withErrorHandling(fn, errorType = 'function_error', context = {}) {
  return async function(...args) {
    try {
      return await fn(...args);
    } catch (error) {
      return createBaseError(errorType, error.message, {
        functionName: fn.name || 'anonymous',
        arguments: args.length,
        originalError: error.message,
        stack: error.stack,
        ...context
      });
    }
  };
}

/**
 * Check if an object is an error object created by this module
 * @param {*} obj - Object to check
 * @returns {boolean} True if object is an error object
 */
function isErrorObject(obj) {
  return obj && typeof obj === 'object' && obj._error && obj._error.type && obj._error.message;
}

/**
 * Extract error message from error object or Error instance
 * @param {*} error - Error object or Error instance
 * @returns {string} Error message
 */
function getErrorMessage(error) {
  if (isErrorObject(error)) {
    return error._error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error';
}

/**
 * Log error with appropriate level based on error type
 * @param {Object} error - Error object to log
 * @param {Object} options - Logging options
 * @param {boolean} options.includeStack - Include stack trace in log
 * @param {string} options.prefix - Prefix for log message
 */
function logError(error, options = {}) {
  const { includeStack = false, prefix = '' } = options;
  
  if (!isErrorObject(error)) {
    console.error(`${prefix}Error:`, error);
    return;
  }

  const errorInfo = error._error;
  const logMessage = `${prefix}${errorInfo.type}: ${errorInfo.message}`;
  
  // Log at different levels based on error type
  switch (errorInfo.type) {
    case 'validation_error':
    case 'parsing_error':
      console.warn(logMessage);
      break;
    case 'node_access_error':
      console.warn(logMessage);
      break;
    case 'processing_error':
    case 'sanitization_error':
    case 'file_operation_error':
      console.error(logMessage);
      break;
    default:
      console.error(logMessage);
  }
  
  if (includeStack && errorInfo.stack) {
    console.error('Stack trace:', errorInfo.stack);
  }
  
  if (errorInfo.itemIndex !== undefined) {
    console.error(`Item index: ${errorInfo.itemIndex}`);
  }
}

module.exports = {
  // Core error creators
  createBaseError,
  createN8NProcessingError,
  createSQLSanitizationError,
  createValidationError,
  createNodeAccessError,
  createParsingError,
  createFileOperationError,
  
  // Error analysis and statistics
  calculateErrorStats,
  
  // Error utilities
  withErrorHandling,
  isErrorObject,
  getErrorMessage,
  logError
};