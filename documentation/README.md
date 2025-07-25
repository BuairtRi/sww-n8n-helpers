# SWW n8n Helpers Documentation

A comprehensive collection of utility functions designed specifically for n8n workflows, providing robust data processing, validation, and sanitization capabilities.

## Modules Overview

| Module | Purpose | Key Features |
|--------|---------|--------------|
| [Batch Processing](./batch-processing.md) | Process arrays with error handling | Item pairing, parallel processing, retry logic |
| [Duration Utilities](./duration-utilities.md) | Parse and format time durations | Human-readable formats, HH:MM:SS conversion |
| [File Utilities](./file-utilities.md) | File and media handling | Safe filename generation, MIME type detection, file size formatting |
| [N8N Utilities](./n8n-utilities.md) | N8N workflow node data extraction | Node data access, item indexing, error handling |
| [SQL Sanitization](./sql-sanitization.md) | Prevent SQL injection attacks | T-SQL support, field-specific sanitization |
| [Text Processing](./text-processing.md) | Clean and manipulate text | HTML cleaning, markdown processing |
| [Validation](./validation-utilities.md) | Data validation and error handling | Fallback chains, type validation |

## Installation & Setup

In your n8n Code node, import the utilities:

```javascript
// Import specific modules
const { processItemsWithPairing, sanitizeForSQL, validateEmail } = require('sww-n8n-helpers');

// Or import the entire library
const utils = require('sww-n8n-helpers');
```

## Quick Start Examples

### Basic Batch Processing

```javascript
const items = [{ json: { title: 'hello' } }, { json: { title: 'world' } }];
const results = processItemsWithPairing(items, (item) => {
  return { processedTitle: item.json.title.toUpperCase() };
});
// Returns: [{ json: { processedTitle: 'HELLO' }, pairedItem: 0 }, ...]
```

### SQL-Safe Data Processing

```javascript
const userInput = "O'Reilly's \"Book\"";
const safe = sanitizeForSQL(userInput);
// Returns: "O''Reilly''s \"Book\"" (quotes escaped for SQL)
```

### Combined Processing

```javascript
const title = "My Article: Special \"Chars\"";
const email = "USER@EXAMPLE.COM";

const safeTitle = sanitizeForSQL(title, { maxLength: 50 });
const validEmail = validateEmail(email) ? email.toLowerCase() : null;
const filename = generateSafeFileName(title, 'txt');

// Results: "My Article: Special \"Chars\"", "user@example.com", "My_Article__Special__Chars_.txt"
```

### N8N Node Data Extraction

```javascript
const { createN8NHelpers } = require('sww-n8n-helpers');
const { extractNodeData } = createN8NHelpers($);

// Extract data from multiple nodes with proper item indexing
const nodeData = extractNodeData({
  episodes: 'Podcast Episodes',
  sources: 'Data Sources'
}, item, index);

const title = nodeData.episodes?.title || 'Untitled';
const sourceUrl = nodeData.sources?.url || null;
```

### Enhanced SQL Generation

```javascript
const { generateInsertStatement, formatFileSize } = require('sww-n8n-helpers');

const insertData = {
  title: "New Episode",
  fileSize: 15728640,  // 15MB
  publishDate: new Date()
};

const sql = generateInsertStatement('Episodes', insertData, {
  outputClause: 'OUTPUT INSERTED.EpisodeId',
  specialValues: { EpisodeId: 'NEWID()' },
  fieldMappings: {
    title: { type: 'title', maxLength: 250 },
    fileSize: { type: 'int' },
    publishDate: { type: 'datetime' }
  }
});

const readableSize = formatFileSize(insertData.fileSize); // "15.0 MB"
```

## Common Usage Patterns

### SQL Sanitization

```javascript
const title = sanitizeByFieldType("Breaking News!", 'title');
const content = sanitizeByFieldType("<p>Content</p>", 'content');
// Use directly in SQL node: INSERT INTO posts (title, content) VALUES ('{{ $json.title }}', '{{ $json.content }}')
```

### Data Processing

```javascript
const duration = parseDurationToSeconds("1:30:45"); // Returns: 5445
const filename = generateSafeFileName("My File: Special/Chars", 'mp3'); // Returns: "My_File__Special_Chars.mp3"
const cleaned = cleanHtml("<p>Hello <b>world</b>!</p>"); // Returns: "Hello world!"
```

## Error Handling Strategy

All modules follow consistent error handling patterns:

- Failed items return `_error` objects with details
- Item pairing is maintained for traceability
- Processing continues despite individual failures
- Comprehensive logging for debugging

See individual module documentation for detailed usage examples and API references.
