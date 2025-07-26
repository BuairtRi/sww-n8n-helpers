// src/duration.js
// Duration parsing and formatting utilities

const parseDuration = require('parse-duration');
const { createParsingError, logError } = require('./error');

/**
 * Parse various duration formats to seconds
 * @param {string|number} duration - Duration in various formats
 * @param {Object} options - Parsing options
 * @param {boolean} options.strict - If true, returns null for invalid formats
 * @returns {number|null} Duration in seconds or null if invalid
 */
function parseDurationToSeconds(duration, options = {}) {
  const { strict = false } = options;
  
  // Handle null/undefined
  if (duration === null || duration === undefined) {
    return null;
  }
  
  // Handle empty string specifically
  if (duration === '') {
    return null;
  }
  
  // Handle zero specifically
  if (duration === 0 || duration === '0') {
    return 0;
  }
  
  try {
    // Handle pure numbers first (assumed to be seconds)
    const numValue = Number(duration);
    if (!isNaN(numValue)) {
      // Handle negative numbers
      if (numValue < 0) {
        return strict ? null : 0;
      }
      if (numValue >= 0) {
        return Math.round(numValue);
      }
    }
  } catch (error) {
    // Continue to other parsing methods
  }
  
  // Try custom parser for time formats first (more reliable than parse-duration for these)
  try {
    const durationStr = String(duration).trim();
    
    // Return null for empty strings after trimming
    if (durationStr === '') {
      return null;
    }
    
    if (durationStr.includes(':')) {
      const parts = durationStr.split(':').map(part => {
        const num = parseInt(part, 10);
        return isNaN(num) ? NaN : num;
      });
      
      if (parts.some(isNaN)) {
        return strict ? null : 0;
      }
      
      if (parts.length === 3) {
        // HH:MM:SS
        const [hours, minutes, seconds] = parts;
        if (hours >= 0 && minutes >= 0 && seconds >= 0 && minutes < 60 && seconds < 60) {
          return hours * 3600 + minutes * 60 + seconds;
        }
      } else if (parts.length === 2) {
        // MM:SS
        const [minutes, seconds] = parts;
        if (minutes >= 0 && seconds >= 0 && seconds < 60) {
          return minutes * 60 + seconds;
        }
      } else {
        // Invalid format with too many colons
        return strict ? null : 0;
      }
    }
  } catch (error) {
    if (strict) return null;
  }
  
  // Try parse-duration for human-readable formats
  try {
    const milliseconds = parseDuration(String(duration));
    if (milliseconds && milliseconds > 0) {
      return Math.round(milliseconds / 1000);
    }
  } catch (error) {
    if (strict) return null;
  }
  
  // Fallback: try parsing as number
  try {
    const numSeconds = parseFloat(String(duration));
    if (!isNaN(numSeconds)) {
      if (numSeconds < 0) {
        return strict ? null : 0;
      }
      if (numSeconds >= 0) {
        return Math.round(numSeconds);
      }
    }
  } catch (error) {
    if (strict) return null;
  }
  
  return strict ? null : 0;
}

/**
 * Format seconds into human-readable duration
 * @param {number} seconds - Duration in seconds
 * @param {Object} options - Formatting options
 * @param {boolean} options.includeSeconds - Include seconds in output
 * @param {string} options.format - 'long' or 'short' format
 * @returns {string|null} Formatted duration or null if invalid
 */
function formatFriendlyDuration(seconds, options = {}) {
  if (!seconds || seconds <= 0) return null;
  
  const { includeSeconds = false, format = 'long' } = options;
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  const parts = [];
  
  if (format === 'short') {
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (includeSeconds && remainingSeconds > 0) parts.push(`${remainingSeconds}s`);
  } else {
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    if (includeSeconds && remainingSeconds > 0) {
      parts.push(`${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`);
    }
  }
  
  if (parts.length === 0) return null;
  
  const separator = format === 'short' ? ' ' : ' and ';
  return parts.join(separator);
}

/**
 * Convert seconds to HH:MM:SS format
 * @param {number} seconds - Duration in seconds
 * @param {Object} options - Formatting options
 * @param {boolean} options.alwaysShowHours - Always show hours even if 0
 * @returns {string|null} Time in HH:MM:SS format or null if invalid
 */
function convertSecondsToHHMMSS(seconds, options = {}) {
  if (!seconds || seconds <= 0) return null;
  
  const { alwaysShowHours = false } = options;
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  const mm = String(minutes).padStart(2, '0');
  const ss = String(remainingSeconds).padStart(2, '0');
  
  if (hours > 0 || alwaysShowHours) {
    const hh = String(hours).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  
  return `${mm}:${ss}`;
}

/**
 * Validate if a duration string is in a supported format
 * @param {string} duration - Duration string to validate
 * @returns {boolean} True if format is supported
 */
function isValidDurationFormat(duration) {
  if (!duration) return false;
  
  const result = parseDurationToSeconds(duration, { strict: true });
  return result !== null && result >= 0;
}

/**
 * Get duration statistics from an array of durations
 * @param {Array} durations - Array of duration values
 * @returns {Object} Statistics object with total, average, min, max
 */
function getDurationStats(durations) {
  if (!Array.isArray(durations)) {
    return { total: 0, average: 0, min: 0, max: 0, count: 0 };
  }
  
  const validDurations = durations
    .map(d => parseDurationToSeconds(d))
    .filter(d => d !== null && d > 0);
    
  if (validDurations.length === 0) {
    return { total: 0, average: 0, min: 0, max: 0, count: 0 };
  }
  
  const total = validDurations.reduce((sum, d) => sum + d, 0);
  const average = Math.round(total / validDurations.length);
  const min = Math.min(...validDurations);
  const max = Math.max(...validDurations);
  
  return {
    total,
    average,
    min,
    max,
    count: validDurations.length,
    totalFormatted: formatFriendlyDuration(total),
    averageFormatted: formatFriendlyDuration(average)
  };
}

module.exports = {
  parseDurationToSeconds,
  formatFriendlyDuration,
  convertSecondsToHHMMSS,
  isValidDurationFormat,
  getDurationStats
};