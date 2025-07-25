// src/text.js
// Text processing and HTML cleaning utilities

const cheerio = require('cheerio');
const _ = require('lodash');

/**
 * Clean HTML content using Cheerio
 * @param {string} html - HTML content to clean
 * @param {Object} options - Cleaning options
 * @param {Array} options.removeElements - Elements to remove
 * @param {boolean} options.normalizeWhitespace - Normalize whitespace
 * @returns {string|null} Cleaned text or null if empty
 */
function cleanHtml(html, options = {}) {
  if (!html) return null;
  
  const { 
    removeElements = ['script', 'style', 'iframe', 'object', 'embed'],
    normalizeWhitespace = true 
  } = options;
  
  const $ = cheerio.load(html);
  
  // Remove unwanted elements
  removeElements.forEach(element => {
    $(element).remove();
  });
  
  let text = $.text();
  
  if (normalizeWhitespace) {
    text = text.replace(/\s+/g, ' ').trim();
  }
  
  return text || null;
}

/**
 * Truncate text with smart word boundary handling
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @param {Object} options - Truncation options
 * @param {string} options.separator - Word separator to respect
 * @param {string} options.omission - String to append when truncated
 * @returns {string} Truncated text
 */
function truncateWithSeparator(text, maxLength, options = {}) {
  const { separator = ' ', omission = '...' } = options;
  
  if (!text || text.length <= maxLength) return text || '';
  
  return _.truncate(text, { 
    length: maxLength, 
    separator, 
    omission 
  });
}

/**
 * Basic text sanitization for SQL usage (prevents injection)
 * @param {string} text - Text to sanitize
 * @returns {string|null} Sanitized text or null if empty
 */
function basicSanitizeForSQL(text) {
  if (!text) return null;
  
  return String(text)
    .replace(/'/g, "''")      // Escape single quotes
    .replace(/\\/g, "\\\\")   // Escape backslashes
    .replace(/\0/g, "")       // Remove null characters
    .trim();
}

/**
 * Extract plain text from markdown
 * @param {string} markdown - Markdown content
 * @param {Object} options - Processing options
 * @param {boolean} options.preserveLineBreaks - Keep line breaks
 * @returns {string|null} Plain text or null if empty
 */
function stripMarkdown(markdown, options = {}) {
  if (!markdown) return null;
  
  const { preserveLineBreaks = false } = options;
  
  let text = markdown
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}$/gm, '');
  
  if (!preserveLineBreaks) {
    text = text.replace(/\s+/g, ' ');
  }
  
  return text.trim() || null;
}

/**
 * Count words in text
 * @param {string} text - Text to count
 * @param {Object} options - Counting options
 * @param {boolean} options.excludeNumbers - Exclude pure numbers
 * @returns {number} Word count
 */
function countWords(text, options = {}) {
  if (!text) return 0;
  
  const { excludeNumbers = false } = options;
  
  let words = text.trim().split(/\s+/).filter(word => word.length > 0);
  
  if (excludeNumbers) {
    words = words.filter(word => !/^\d+$/.test(word));
  }
  
  return words.length;
}

/**
 * Extract sentences from text
 * @param {string} text - Text to split into sentences
 * @param {Object} options - Extraction options
 * @param {number} options.minLength - Minimum sentence length
 * @returns {Array} Array of sentences
 */
function extractSentences(text, options = {}) {
  if (!text) return [];
  
  const { minLength = 10 } = options;
  
  // Simple sentence splitting (can be enhanced with NLP libraries)
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length >= minLength);
  
  return sentences;
}

/**
 * Generate excerpt from text
 * @param {string} text - Text to excerpt
 * @param {number} maxLength - Maximum excerpt length
 * @param {Object} options - Excerpt options
 * @param {boolean} options.completeSentences - End on complete sentences
 * @returns {string|null} Excerpt or null if empty
 */
function generateExcerpt(text, maxLength = 200, options = {}) {
  if (!text) return null;
  
  const { completeSentences = true } = options;
  
  if (text.length <= maxLength) return text;
  
  if (completeSentences) {
    const sentences = extractSentences(text);
    let excerpt = '';
    
    for (const sentence of sentences) {
      if (excerpt.length + sentence.length + 1 <= maxLength) {
        excerpt += (excerpt ? ' ' : '') + sentence + '.';
      } else {
        break;
      }
    }
    
    return excerpt || truncateWithSeparator(text, maxLength);
  }
  
  return truncateWithSeparator(text, maxLength);
}

/**
 * Normalize whitespace and special characters
 * @param {string} text - Text to normalize
 * @param {Object} options - Normalization options
 * @param {boolean} options.removeExtraSpaces - Remove multiple spaces
 * @param {boolean} options.normalizeQuotes - Normalize quote characters
 * @returns {string|null} Normalized text or null if empty
 */
function normalizeText(text, options = {}) {
  if (!text) return null;
  
  const { removeExtraSpaces = true, normalizeQuotes = true } = options;
  
  let normalized = text;
  
  if (normalizeQuotes) {
    // Normalize various quote characters
    normalized = normalized
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'");
  }
  
  if (removeExtraSpaces) {
    normalized = normalized.replace(/\s+/g, ' ');
  }
  
  return normalized.trim() || null;
}

module.exports = {
  cleanHtml,
  truncateWithSeparator,
  basicSanitizeForSQL,
  stripMarkdown,
  countWords,
  extractSentences,
  generateExcerpt,
  normalizeText
};