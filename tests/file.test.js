// tests/file.test.js
const {
  AUDIO_MIME_TYPES,
  extractFileExtension,
  generateSafeFileName,
  validateAudioUrl,
  getMimeTypeFromExtension,
  parseContentLength,
  validateFileSize,
  file
} = require('../index');

describe('File Utilities', () => {
  describe('Module Export Structure', () => {
    test('should export individual functions', () => {
      expect(typeof generateSafeFileName).toBe('function');
      expect(typeof extractFileExtension).toBe('function');
      expect(typeof validateAudioUrl).toBe('function');
    });

    test('should export module namespaces', () => {
      expect(file).toBeDefined();
      expect(typeof file.generateSafeFileName).toBe('function');
      expect(typeof file.extractFileExtension).toBe('function');
      expect(typeof file.validateAudioUrl).toBe('function');
    });

    test('should have identical functionality in both export styles', () => {
      // Test that both export styles work the same way
      const title = 'Test File';
      const extension = 'mp3';
      
      const individualResult = generateSafeFileName(title, extension);
      const groupedResult = file.generateSafeFileName(title, extension);
      
      expect(individualResult).toBe(groupedResult);
    });
  });

  describe('AUDIO_MIME_TYPES', () => {
    test('should contain common audio MIME types', () => {
      expect(AUDIO_MIME_TYPES['audio/mpeg']).toBe('mp3');
      expect(AUDIO_MIME_TYPES['audio/mp4']).toBe('m4a');
      expect(AUDIO_MIME_TYPES['audio/wav']).toBe('wav');
      expect(AUDIO_MIME_TYPES['audio/ogg']).toBe('ogg');
    });
  });

  describe('extractFileExtension', () => {
    test('should extract extension from URL', () => {
      const result = extractFileExtension('https://example.com/audio.mp3', null);
      expect(result).toBe('mp3');
    });

    test('should extract extension from URL with query parameters', () => {
      const result = extractFileExtension('https://example.com/audio.wav?version=1', null);
      expect(result).toBe('wav');
    });

    test('should fallback to MIME type when URL has no extension', () => {
      const result = extractFileExtension('https://example.com/audio', 'audio/mpeg');
      expect(result).toBe('mp3');
    });

    test('should use default extension when both URL and MIME type fail', () => {
      const result = extractFileExtension('https://example.com/audio', 'unknown/type');
      expect(result).toBe('mp3');
    });

    test('should use custom default extension', () => {
      const result = extractFileExtension('invalid-url', null, 'wav');
      expect(result).toBe('wav');
    });

    test('should handle invalid URLs gracefully', () => {
      const result = extractFileExtension('not-a-url', 'audio/wav');
      expect(result).toBe('wav');
    });

    test('should handle case insensitive MIME types', () => {
      const result = extractFileExtension(null, 'AUDIO/MPEG');
      expect(result).toBe('mp3');
    });
  });

  describe('generateSafeFileName', () => {
    test('should generate safe filename from title', () => {
      const result = generateSafeFileName('My Amazing Podcast Episode', 'mp3');
      expect(result).toBe('My Amazing Podcast Episode.mp3');
    });

    test('should sanitize dangerous characters', () => {
      const result = generateSafeFileName('Episode <script>alert("xss")</script>', 'mp3');
      expect(result).not.toContain('<script>');
      expect(result).toMatch(/\.mp3$/);
    });

    test('should truncate long titles', () => {
      const longTitle = 'A'.repeat(150);
      const result = generateSafeFileName(longTitle, 'mp3', { maxLength: 50 });
      expect(result.length).toBeLessThanOrEqual(54); // 50 + '.mp3'
    });

    test('should use fallback name for empty title', () => {
      const result = generateSafeFileName('', 'mp3');
      expect(result).toBe('episode.mp3');
      
      const result2 = generateSafeFileName(null, 'mp3');
      expect(result2).toBe('episode.mp3');
    });

    test('should use custom fallback name', () => {
      const result = generateSafeFileName('', 'wav', { fallbackName: 'audio' });
      expect(result).toBe('audio.wav');
    });

    test('should use custom replacement character', () => {
      const result = generateSafeFileName('file/with\\bad:chars', 'mp3', { replacement: '-' });
      expect(result).not.toContain('/');
      expect(result).not.toContain('\\');
      expect(result).not.toContain(':');
    });

    test('should trim whitespace from title', () => {
      const result = generateSafeFileName('  Episode Title  ', 'mp3');
      expect(result).toBe('Episode Title.mp3');
    });
  });

  describe('validateAudioUrl', () => {
    test('should validate valid audio URLs', () => {
      expect(validateAudioUrl('https://example.com/audio.mp3')).toBe(true);
      expect(validateAudioUrl('http://example.com/audio.wav')).toBe(true);
      expect(validateAudioUrl('https://example.com/path/to/audio.m4a')).toBe(true);
    });

    test('should reject invalid URLs', () => {
      expect(validateAudioUrl('not-a-url')).toBe(false);
      expect(validateAudioUrl('')).toBe(false);
      expect(validateAudioUrl(null)).toBe(false);
      expect(validateAudioUrl(undefined)).toBe(false);
    });

    test('should reject URLs without audio extensions', () => {
      expect(validateAudioUrl('https://example.com/document.pdf')).toBe(false);
      expect(validateAudioUrl('https://example.com/image.jpg')).toBe(false);
    });

    test('should work with custom allowed extensions', () => {
      const customExtensions = ['flac', 'opus'];
      expect(validateAudioUrl('https://example.com/audio.flac', customExtensions)).toBe(true);
      expect(validateAudioUrl('https://example.com/audio.mp3', customExtensions)).toBe(false);
    });

    test('should handle URLs with query parameters', () => {
      expect(validateAudioUrl('https://example.com/audio.mp3?v=1&format=high')).toBe(true);
    });
  });

  describe('getMimeTypeFromExtension', () => {
    test('should return correct MIME type for known extensions', () => {
      expect(getMimeTypeFromExtension('mp3')).toBe('audio/mpeg');
      expect(getMimeTypeFromExtension('wav')).toBe('audio/wav');
      expect(getMimeTypeFromExtension('m4a')).toBe('audio/mp4');
    });

    test('should handle extensions with dots', () => {
      expect(getMimeTypeFromExtension('.mp3')).toBe('audio/mpeg');
      expect(getMimeTypeFromExtension('.wav')).toBe('audio/wav');
    });

    test('should be case insensitive', () => {
      expect(getMimeTypeFromExtension('MP3')).toBe('audio/mpeg');
      expect(getMimeTypeFromExtension('WAV')).toBe('audio/wav');
    });

    test('should return null for unknown extensions', () => {
      expect(getMimeTypeFromExtension('unknown')).toBe(null);
      expect(getMimeTypeFromExtension('txt')).toBe(null);
    });

    test('should handle null/undefined input', () => {
      expect(getMimeTypeFromExtension(null)).toBe(null);
      expect(getMimeTypeFromExtension(undefined)).toBe(null);
      expect(getMimeTypeFromExtension('')).toBe(null);
    });
  });

  describe('parseContentLength', () => {
    test('should parse valid content length strings', () => {
      expect(parseContentLength('1024')).toBe(1024);
      expect(parseContentLength('0')).toBe(0);
      expect(parseContentLength('999999')).toBe(999999);
    });

    test('should parse numeric content length', () => {
      expect(parseContentLength(1024)).toBe(1024);
      expect(parseContentLength(0)).toBe(0); // Zero is a valid content length (empty file)
    });

    test('should return null for invalid input', () => {
      expect(parseContentLength('not-a-number')).toBe(null);
      expect(parseContentLength('')).toBe(null);
      expect(parseContentLength(null)).toBe(null);
      expect(parseContentLength(undefined)).toBe(null);
    });

    test('should handle string numbers with whitespace', () => {
      expect(parseContentLength(' 1024 ')).toBe(1024);
    });
  });

  describe('validateFileSize', () => {
    test('should validate sizes within default limits', () => {
      expect(validateFileSize(1024)).toBe(true); // 1KB (minimum)
      expect(validateFileSize(1024 * 1024)).toBe(true); // 1MB
      expect(validateFileSize(100 * 1024 * 1024)).toBe(true); // 100MB
    });

    test('should reject sizes below minimum', () => {
      expect(validateFileSize(512)).toBe(false); // Below 1KB default
      expect(validateFileSize(0)).toBe(false);
    });

    test('should reject sizes above maximum', () => {
      expect(validateFileSize(600 * 1024 * 1024)).toBe(false); // Above 500MB default
    });

    test('should work with custom limits', () => {
      const limits = { minSize: 2048, maxSize: 10 * 1024 * 1024 }; // 2KB - 10MB
      
      expect(validateFileSize(1024, limits)).toBe(false); // Below min
      expect(validateFileSize(5 * 1024 * 1024, limits)).toBe(true); // Within range
      expect(validateFileSize(15 * 1024 * 1024, limits)).toBe(false); // Above max
    });

    test('should handle null/undefined/invalid sizes', () => {
      expect(validateFileSize(null)).toBe(false);
      expect(validateFileSize(undefined)).toBe(false);
      expect(validateFileSize(NaN)).toBe(false);
    });

    test('should handle edge cases at boundaries', () => {
      const limits = { minSize: 1000, maxSize: 2000 };
      
      expect(validateFileSize(1000, limits)).toBe(true); // Exactly min
      expect(validateFileSize(2000, limits)).toBe(true); // Exactly max
      expect(validateFileSize(999, limits)).toBe(false); // Just below min
      expect(validateFileSize(2001, limits)).toBe(false); // Just above max
    });
  });
}); 