// src/validation.js
// Data validation and fallback utilities

const validator = require('validator');
const _ = require('lodash');

/**
 * Create a fallback chain for object property access
 * @param {Object} obj - Object to search
 * @param {Array} paths - Array of property paths to try
 * @param {*} defaultValue - Default value if no path succeeds
 * @returns {*} First found value or default
 */
function createFallbackChain(obj, paths, defaultValue = null) {
  if (!obj || !Array.isArray(paths)) return defaultValue;
  
  for (const path of paths) {
    const value = _.get(obj, path);
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  
  return defaultValue;
}

/**
 * Validate required fields in an object
 * @param {Object} obj - Object to validate
 * @param {Array} requiredFields - Array of required field names
 * @returns {Object} Validation result with isValid and missingFields
 */
function validateRequiredFields(obj, requiredFields) {
  if (!obj || !Array.isArray(requiredFields)) {
    return { isValid: false, missingFields: requiredFields || [] };
  }
  
  const missingFields = requiredFields.filter(field => {
    const value = _.get(obj, field);
    return value === undefined || value === null || value === '';
  });
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

/**
 * Safe URL validation and extraction
 * @param {*} value - Value to validate as URL
 * @param {Array} allowedProtocols - Allowed URL protocols
 * @returns {string|null} Valid URL or null
 */
function validateAndExtractUrl(value, allowedProtocols = ['http', 'https']) {
  if (!value) return null;
  
  const urlString = String(value);
  if (!validator.isURL(urlString)) return null;
  
  try {
    const url = new URL(urlString);
    if (allowedProtocols.includes(url.protocol.replace(':', ''))) {
      return urlString;
    }
  } catch (e) {
    // Invalid URL
  }
  
  return null;
}

/**
 * Create error object for failed processing
 * @deprecated Use createValidationError from './error' instead
 * @param {string} type - Error type
 * @param {string} message - Error message
 * @param {Object} context - Additional context
 * @returns {Object} Standardized error object
 */
function createProcessingError(type, message, context = {}) {
  const { createValidationError } = require('./error');
  return createValidationError(type, message, context);
}

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @param {Object} options - Validation options
 * @param {boolean} options.allowDisplayName - Allow display names
 * @returns {boolean} True if valid email
 */
function validateEmail(email, options = {}) {
  if (!email) return false;
  
  const { allowDisplayName = false } = options;
  
  return validator.isEmail(String(email), { allow_display_name: allowDisplayName });
}

/**
 * Validate and normalize phone number
 * @param {string} phone - Phone number to validate
 * @param {string} locale - Locale for validation (e.g., 'en-US')
 * @returns {string|null} Normalized phone or null if invalid
 */
function validatePhone(phone, locale = 'any') {
  if (!phone) return null;
  
  const phoneStr = String(phone).trim();
  
  if (locale === 'any') {
    // Basic validation for international numbers
    const cleanPhone = phoneStr.replace(/[^\d+]/g, '');
    if (cleanPhone.length >= 7 && cleanPhone.length <= 15) {
      return cleanPhone;
    }
  } else {
    if (validator.isMobilePhone(phoneStr, locale)) {
      return phoneStr;
    }
  }
  
  return null;
}

/**
 * Validate date string and return ISO format using moment.js for better parsing
 * @param {string|Date} date - Date to validate
 * @param {Object} options - Validation options
 * @param {boolean} options.strict - Strict date validation
 * @param {string|Array} options.format - Expected date format(s) for moment parsing
 * @returns {string|null} ISO date string or null if invalid
 */
function validateAndFormatDate(date, options = {}) {
  if (!date) return null;
  
  const { strict = false, format } = options;
  const moment = require('moment');
  
  try {
    let momentDate;
    
    if (format) {
      // Parse with specific format(s)
      momentDate = moment(date, format, strict);
    } else {
      // Parse with default moment parsing
      momentDate = moment(date);
    }
    
    if (!momentDate.isValid()) {
      return null;
    }
    
    if (strict) {
      // Additional validation for realistic dates
      const year = momentDate.year();
      if (year < 1900 || year > 2100) {
        return null;
      }
    }
    
    return momentDate.toISOString();
  } catch (e) {
    return null;
  }
}

/**
 * Validate numeric value within range
 * @param {*} value - Value to validate
 * @param {Object} range - Range constraints
 * @param {number} range.min - Minimum value
 * @param {number} range.max - Maximum value
 * @param {boolean} range.integer - Must be integer
 * @returns {number|null} Valid number or null
 */
function validateNumericRange(value, range = {}) {
  if (value === null || value === undefined || value === '') return null;
  
  const { min = -Infinity, max = Infinity, integer = false } = range;
  
  const num = Number(value);
  if (isNaN(num)) return null;
  
  if (integer && !Number.isInteger(num)) return null;
  if (num < min || num > max) return null;
  
  return num;
}

/**
 * Validate array has required elements
 * @param {Array} array - Array to validate
 * @param {Object} constraints - Validation constraints
 * @param {number} constraints.minLength - Minimum array length
 * @param {number} constraints.maxLength - Maximum array length
 * @param {Function} constraints.elementValidator - Function to validate each element
 * @returns {boolean} True if array is valid
 */
function validateArray(array, constraints = {}) {
  if (!Array.isArray(array)) return false;
  
  const { minLength = 0, maxLength = Infinity, elementValidator } = constraints;
  
  if (array.length < minLength || array.length > maxLength) {
    return false;
  }
  
  if (elementValidator && typeof elementValidator === 'function') {
    return array.every(elementValidator);
  }
  
  return true;
}

/**
 * Deep validation of nested object structure
 * @param {Object} obj - Object to validate
 * @param {Object} schema - Validation schema
 * @returns {Object} Validation result with errors
 */
function validateObjectSchema(obj, schema) {
  const errors = {};
  
  if (!obj || typeof obj !== 'object') {
    return { isValid: false, errors: { _root: 'Object is required' } };
  }
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = _.get(obj, field);
    
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors[field] = 'Required field is missing';
      continue;
    }
    
    if (value !== undefined && value !== null && value !== '') {
      if (rules.type && typeof value !== rules.type) {
        errors[field] = `Expected ${rules.type}, got ${typeof value}`;
        continue;
      }
      
      if (rules.validator && typeof rules.validator === 'function') {
        const isValid = rules.validator(value);
        if (!isValid) {
          errors[field] = rules.message || 'Validation failed';
        }
      }
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Clean object by removing invalid/empty values
 * @param {Object} obj - Object to clean
 * @param {Object} options - Cleaning options
 * @param {boolean} options.removeEmpty - Remove empty strings
 * @param {boolean} options.removeNull - Remove null values
 * @param {boolean} options.removeUndefined - Remove undefined values
 * @returns {Object} Cleaned object
 */
function cleanObject(obj, options = {}) {
  const { removeEmpty = true, removeNull = true, removeUndefined = true } = options;
  
  if (!obj || typeof obj !== 'object') return obj;
  
  const cleaned = {};
  
  for (const [key, value] of Object.entries(obj)) {
    let shouldInclude = true;
    
    if (removeUndefined && value === undefined) shouldInclude = false;
    if (removeNull && value === null) shouldInclude = false;
    if (removeEmpty && value === '') shouldInclude = false;
    
    if (shouldInclude) {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
}

module.exports = {
  createFallbackChain,
  validateRequiredFields,
  validateAndExtractUrl,
  createProcessingError,
  validateEmail,
  validatePhone,
  validateAndFormatDate,
  validateNumericRange,
  validateArray,
  validateObjectSchema,
  cleanObject
};