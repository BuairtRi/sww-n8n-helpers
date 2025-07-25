# File Utilities Module

Comprehensive file and media handling utilities for generating safe filenames, validating URLs, and working with MIME types in n8n workflows.

## Import Options

The module supports both individual function imports and module namespace imports:

**Individual Function Imports:**

```javascript
const { generateSafeFileName, extractFileExtension, formatFileSize } = require('sww-n8n-helpers');
```

**Module Namespace Imports:**

```javascript
const { file } = require('sww-n8n-helpers');
// Now use: file.generateSafeFileName(), file.extractFileExtension(), file.formatFileSize(), etc.
```

**Full Module Import:**

```javascript
const utils = require('sww-n8n-helpers');
// Individual functions: utils.generateSafeFileName()
// Module namespaces: utils.file.generateSafeFileName()
```

## Key Functions

### `generateSafeFileName(title, fileExtension, options)`

Generate safe, cross-platform filenames from titles.

**Parameters:**

- `title` (String): Title to convert to filename
- `fileExtension` (String): File extension without dot
- `options` (Object): Generation options
  - `maxLength` (Number): Maximum filename length (default: 100)
  - `replacement` (String): Character to replace invalid chars (default: '_')
  - `fallbackName` (String): Name to use if title is empty (default: 'episode')

**Example: Generate Safe Filenames**

```javascript
const { generateSafeFileName, extractFileExtension } = require('sww-n8n-helpers');

const title = "My Podcast: Episode #1 (2024/01/15)";
const safeFilename = generateSafeFileName(title, 'mp3');
// Returns: "My_Podcast__Episode__1__2024_01_15_.mp3" (invalid chars replaced)

const url = "https://example.com/audio.mp3";
const extension = extractFileExtension(url, 'audio/mpeg', 'mp3');
// Returns: "mp3" (extracted from URL)

const mimeExtension = extractFileExtension(null, 'audio/wav', 'mp3');
// Returns: "wav" (determined from MIME type)

const truncated = generateSafeFileName("Very long title...", 'mp3', { maxLength: 20 });
// Returns: "Very_long_tit....mp3" (truncated to fit length limit)
```

**Example: Filename Variations**

```javascript
const { generateSafeFileName } = require('sww-n8n-helpers');

const title = "My Important Document: Final Version!";

const standard = generateSafeFileName(title, 'pdf');
// Returns: "My_Important_Document__Final_Version_.pdf"

const short = generateSafeFileName(title, 'pdf', { maxLength: 20 });
// Returns: "My_Important_Do....pdf"

const timestamped = generateSafeFileName(`${title}_2024-01-15`, 'pdf');
// Returns: "My_Important_Document__Final_Version__2024-01-15.pdf"
```

### `extractFileExtension(audioUrl, mimeType, defaultExtension)`

Extract file extension from URL or determine from MIME type.

**Parameters:**

- `audioUrl` (String): File URL
- `mimeType` (String): MIME type of the file
- `defaultExtension` (String): Default extension if none found (default: 'mp3')

**Example: URL and File Validation**

```javascript
const { validateAudioUrl, parseContentLength, validateFileSize } = require('sww-n8n-helpers');

const validUrl = validateAudioUrl("https://example.com/song.mp3");
// Returns: true (URL points to audio file)

const invalidUrl = validateAudioUrl("https://example.com/document.pdf");
// Returns: false (not an audio file)

const customFormats = validateAudioUrl("https://example.com/song.flac", ['mp3', 'flac', 'wav']);
// Returns: true (flac is in allowed extensions)

const sizeBytes = parseContentLength("1048576");
// Returns: 1048576 (parsed from string)

const validSize = validateFileSize(1048576, { minSize: 1024, maxSize: 10485760 });
// Returns: true (1MB is within 1KB-10MB range)
```

### `validateAudioUrl(url, allowedExtensions)`

Validate if URL points to an audio/media file.

**Parameters:**

- `url` (String): URL to validate
- `allowedExtensions` (Array): Allowed file extensions (default: ['mp3', 'm4a', 'wav', 'ogg', 'aac'])

**Example: Content Validation**

```javascript
const { validateAudioUrl, validateFileSize } = require('sww-n8n-helpers');

const audioUrl = "https://example.com/song.mp3";
const contentLength = "5242880"; // 5MB

const isValidAudio = validateAudioUrl(audioUrl, ['mp3', 'wav', 'flac']);
// Returns: true

const isValidSize = validateFileSize(parseInt(contentLength), {
  minSize: 1024,        // 1KB minimum  
  maxSize: 10 * 1024 * 1024  // 10MB maximum
});
// Returns: true (5MB is within limits)
```

### `getMimeTypeFromExtension(extension)`

Get MIME type from file extension.

**Example: HTTP Headers**

```javascript
const { getMimeTypeFromExtension } = require('sww-n8n-helpers');

const filename = "audio-file.mp3";
const extension = filename.split('.').pop(); // "mp3"
const mimeType = getMimeTypeFromExtension(extension); // "audio/mpeg"

const httpHeaders = {
  'Content-Type': mimeType || 'application/octet-stream',
  'Content-Disposition': `attachment; filename="${filename}"`
};
// Ready for HTTP response headers
```

### `parseContentLength(contentLength)` and `validateFileSize(sizeInBytes, limits)`

Handle file size validation and parsing.

**Note**: `parseContentLength(0)` returns `0` (not `null`) as zero is a valid content length for empty files.

**Example: Download Decisions**

```javascript
const { parseContentLength, validateFileSize } = require('sww-n8n-helpers');

const contentLength = "5242880"; // 5MB
const filename = "podcast.mp3";

const sizeInBytes = parseContentLength(contentLength); // 5242880

// Different limits based on file type  
const limits = filename.endsWith('.mp3') ? 
  { maxSize: 50 * 1024 * 1024 } :  // 50MB for MP3
  { maxSize: 10 * 1024 * 1024 };   // 10MB for others

const shouldDownload = validateFileSize(sizeInBytes, limits);
// Returns: true (5MB MP3 is within 50MB limit)
```

### `formatFileSize(bytes, options)`

Format file size in bytes to human-readable format.

**Parameters:**

- `bytes` (Number): File size in bytes
- `options` (Object): Formatting options
  - `precision` (Number): Decimal places (default: 1)
  - `units` (Array): Array of unit names (default: ['B', 'KB', 'MB', 'GB', 'TB'])

**Returns:** String with formatted file size (empty string for 0 or invalid input)

**Example: Display File Sizes**

```javascript
const { formatFileSize, parseContentLength } = require('sww-n8n-helpers');

// Parse and format content lengths
const sizes = ['1024', '1536000', '52428800', '0', null];

sizes.forEach(size => {
  const bytes = parseContentLength(size);
  const formatted = formatFileSize(bytes);
  console.log(`${size} -> ${bytes} bytes -> ${formatted}`);
});

// Output:
// 1024 -> 1024 bytes -> 1.0 KB
// 1536000 -> 1536000 bytes -> 1.5 MB
// 52428800 -> 52428800 bytes -> 50.0 MB
// 0 -> 0 bytes -> (empty string)
// null -> null bytes -> (empty string)
```

**Example: Custom Formatting**

```javascript
// Custom precision and units
const fileSize = 1536000; // 1.5MB

const detailed = formatFileSize(fileSize, { precision: 2 });
// "1.46 MB"

const simple = formatFileSize(fileSize, { precision: 0 });
// "1 MB"

const customUnits = formatFileSize(fileSize, { 
  units: ['bytes', 'kilobytes', 'megabytes'] 
});
// "1.5 megabytes"
```

## Usage Patterns

### File Processing Pipeline (Individual Functions)

```javascript
const { extractFileExtension, generateSafeFileName, validateAudioUrl, parseContentLength, formatFileSize } = require('sww-n8n-helpers');

const url = "https://example.com/podcast.mp3";
const title = "My Podcast: Episode #1";
const contentLength = "15728640"; // 15MB

const extension = extractFileExtension(url, 'audio/mpeg', 'mp3'); // "mp3"
const filename = generateSafeFileName(title, extension);          // "My_Podcast__Episode__1.mp3"
const isValid = validateAudioUrl(url);                            // true
const sizeBytes = parseContentLength(contentLength);             // 15728640
const readableSize = formatFileSize(sizeBytes);                  // "15.0 MB"
```

### File Processing Pipeline (Module Namespaces)

```javascript
const { file } = require('sww-n8n-helpers');

const url = "https://example.com/podcast.mp3";
const title = "My Podcast: Episode #1";
const contentLength = "15728640";

const extension = file.extractFileExtension(url, 'audio/mpeg', 'mp3'); // "mp3"
const filename = file.generateSafeFileName(title, extension);          // "My_Podcast__Episode__1.mp3"
const isValid = file.validateAudioUrl(url);                            // true
const sizeBytes = file.parseContentLength(contentLength);             // 15728640
const readableSize = file.formatFileSize(sizeBytes);                  // "15.0 MB"
```

### Download Organization

```javascript
const title = "My Document (2024)";
const filename = generateSafeFileName(title, 'pdf');
const date = new Date();
const path = `documents/${date.getFullYear()}/${filename}`;
// Result: "documents/2024/My_Document__2024_.pdf"
      localPath: `${category}/${yearMonth}/${filename}`,
      directory: `${category}/${yearMonth}`,
      metadata: {
        title: content.title,
        publishedDate: content.publishedDate,
        category: category,
        originalUrl: content.downloadUrl
      }
    },
    pairedItem: index
  };
});

return downloadQueue;
```

### File Organization

```javascript
const filename = "My Song.mp3";
const extension = filename.split('.').pop(); // "mp3"
const mimeType = getMimeTypeFromExtension(extension); // "audio/mpeg"
const newName = generateSafeFileName("Artist - Song Title", extension);
// Returns: "Artist_-_Song_Title.mp3"
```

## Available MIME Types

The module includes comprehensive MIME type mappings for audio files:

```javascript
const AUDIO_MIME_TYPES = {
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
  'audio/wav': 'wav',
  'audio/flac': 'flac',
  'audio/ogg': 'ogg',
  'audio/opus': 'opus',
  'audio/webm': 'webm',
  'audio/wma': 'wma',
  'audio/aiff': 'aiff',
  'audio/3gpp': '3gp',
  'audio/amr': 'amr'
  // ... and more
};
```

## Best Practices

1. **Always validate URLs** before attempting downloads
2. **Use fallback extensions** when detection fails
3. **Sanitize filenames** to prevent file system issues
4. **Check file sizes** to avoid resource exhaustion
5. **Organize files systematically** using categories and dates
6. **Handle edge cases** like missing extensions or invalid URLs
7. **Log validation results** for debugging and monitoring

## Common Issues and Solutions

### Invalid Characters in Filenames

```javascript
// BAD: Direct use of title
const filename = `${episode.title}.mp3`; // May contain invalid chars

// GOOD: Use generateSafeFileName
const filename = generateSafeFileName(episode.title, 'mp3');
```

### Missing File Extensions

```javascript
// Extract extension with fallbacks
const extension = extractFileExtension(url, mimeType, 'mp3');
// Always provides a valid extension
```

### File Size Validation

```javascript
// Check size before processing
const sizeInBytes = parseContentLength(contentLength);
const isValidSize = validateFileSize(sizeInBytes, { maxSize: 100 * 1024 * 1024 });

if (!isValidSize) {
  // Handle oversized or invalid files
  return { json: { error: 'File too large', skipDownload: true } };
}
```
