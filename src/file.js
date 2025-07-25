// src/file.js
// File and media utilities

const validator = require('validator');
const sanitizeFilename = require('sanitize-filename');
const _ = require('lodash');

/**
 * Comprehensive MIME type to file extension mapping
 */
const AUDIO_MIME_TYPES = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/wav': 'wav',
  'audio/wave': 'wav',
  'audio/x-wav': 'wav',
  'audio/flac': 'flac',
  'audio/ogg': 'ogg',
  'audio/opus': 'opus',
  'audio/webm': 'webm',
  'audio/wma': 'wma',
  'audio/x-ms-wma': 'wma',
  'audio/aiff': 'aiff',
  'audio/x-aiff': 'aiff',
  'audio/basic': 'au',
  'audio/3gpp': '3gp',
  'audio/amr': 'amr'
};

/**
 * Extract file extension from URL or MIME type
 * @param {string} audioUrl - Audio file URL
 * @param {string} mimeType - MIME type of the file
 * @param {string} defaultExtension - Default extension if none found
 * @returns {string} File extension (without dot)
 */
function extractFileExtension(audioUrl, mimeType, defaultExtension = 'mp3') {
  // Try to extract from URL first
  if (audioUrl && validator.isURL(audioUrl)) {
    try {
      const urlPath = new URL(audioUrl).pathname;
      const urlExtension = _.last(urlPath.split('.'));
      if (urlExtension && /^[a-zA-Z0-9]{2,4}$/.test(urlExtension)) {
        return urlExtension.toLowerCase();
      }
    } catch (e) {
      // Continue to MIME type fallback
    }
  }
  
  // Fallback to MIME type mapping
  if (mimeType) {
    const extension = AUDIO_MIME_TYPES[mimeType.toLowerCase()];
    if (extension) {
      return extension;
    }
  }
  
  return defaultExtension;
}

/**
 * Generate a safe filename from title and extension
 * @param {string} title - Title to convert to filename
 * @param {string} fileExtension - File extension (without dot)
 * @param {Object} options - Generation options
 * @param {number} options.maxLength - Maximum filename length
 * @param {string} options.replacement - Character to replace invalid chars
 * @param {string} options.fallbackName - Name to use if title is empty
 * @returns {string} Safe filename
 */
function generateSafeFileName(title, fileExtension, options = {}) {
  const { 
    maxLength = 100, 
    replacement = '_', 
    fallbackName = 'episode' 
  } = options;
  
  let baseFilename;
  
  if (title && title.trim()) {
    baseFilename = _.truncate(title.trim(), { 
      length: maxLength, 
      separator: ' ', 
      omission: '' 
    });
  } else {
    baseFilename = fallbackName;
  }
  
  return sanitizeFilename(`${baseFilename}.${fileExtension}`, { replacement });
}

/**
 * Validate if URL is a valid audio/media URL
 * @param {string} url - URL to validate
 * @param {Array} allowedExtensions - Array of allowed extensions
 * @returns {boolean} True if valid audio URL
 */
function validateAudioUrl(url, allowedExtensions = ['mp3', 'm4a', 'wav', 'ogg', 'aac']) {
  if (!url || !validator.isURL(String(url))) {
    return false;
  }
  
  try {
    const urlPath = new URL(url).pathname.toLowerCase();
    return allowedExtensions.some(ext => urlPath.includes(`.${ext}`));
  } catch (e) {
    return false;
  }
}

/**
 * Get MIME type from file extension
 * @param {string} extension - File extension (with or without dot)
 * @returns {string|null} MIME type or null if not found
 */
function getMimeTypeFromExtension(extension) {
  if (!extension) return null;
  
  const cleanExtension = extension.replace(/^\./, '').toLowerCase();
  
  // Reverse lookup in AUDIO_MIME_TYPES
  for (const [mimeType, ext] of Object.entries(AUDIO_MIME_TYPES)) {
    if (ext === cleanExtension) {
      return mimeType;
    }
  }
  
  return null;
}

/**
 * Parse content length header to bytes
 * @param {string|number} contentLength - Content length value
 * @returns {number|null} Size in bytes or null if invalid
 */
function parseContentLength(contentLength) {
  if (contentLength == null || contentLength === '') return null;
  
  const size = parseInt(contentLength);
  return isNaN(size) ? null : size;
}

/**
 * Validate file size is within acceptable limits
 * @param {number} sizeInBytes - File size in bytes
 * @param {Object} limits - Size limits
 * @param {number} limits.minSize - Minimum size in bytes
 * @param {number} limits.maxSize - Maximum size in bytes
 * @returns {boolean} True if size is valid
 */
function validateFileSize(sizeInBytes, limits = {}) {
  const { minSize = 1024, maxSize = 500 * 1024 * 1024 } = limits; // Default: 1KB - 500MB
  
  if (!sizeInBytes || sizeInBytes < minSize) return false;
  if (sizeInBytes > maxSize) return false;
  
  return true;
}

module.exports = {
  AUDIO_MIME_TYPES,
  extractFileExtension,
  generateSafeFileName,
  validateAudioUrl,
  getMimeTypeFromExtension,
  parseContentLength,
  validateFileSize
};