# SWW n8n Helpers Documentation

A comprehensive collection of utility functions designed specifically for n8n workflows, providing robust data processing, validation, and sanitization capabilities.

## Modules Overview

| Module | Purpose | Key Features | Status |
|--------|---------|--------------|--------|
| [Batch Processing](./batch-processing.md) | Process arrays with error handling | Item pairing, parallel processing, retry logic | Active |
| [Data Transform](./data-transform.md) | Business data normalization | Field transformations, null handling, validation | Active |
| [Duration Utilities](./duration-utilities.md) | Parse and format time durations | Human-readable formats, HH:MM:SS conversion | Active |
| [File Utilities](./file-utilities.md) | File and media handling | Safe filename generation, MIME type detection, file size formatting | Active |
| [N8N Utilities](./n8n-utilities.md) | N8N workflow node data extraction | Node data access, item indexing, error handling | Active |
| [Slack Blocks](./slack-blocks.md) | Slack Block Kit message builder | Type-safe block creation, validation, helpers | Active |
| [SQL Utilities](./sql-utilities.md) | Safe SQL generation | INSERT/UPDATE builders, escaping, formatting | Active |
| [Text Processing](./text-processing.md) | Clean and manipulate text | HTML cleaning, markdown processing, truncation | Active |
| [Validation](./validation-utilities.md) | Data validation and error handling | URL/email validation, fallback chains, type checking | Active |
| [SQL Sanitization](./sql-sanitization.md) | **DEPRECATED** - Legacy SQL utilities | Use Data Transform + SQL Utilities instead | Deprecated |

## n8n Built-in Functions Reference

| Documentation | Purpose | Coverage |
|---------------|---------|----------|
| [Overview](./n8n-builtin-overview.md) | Introduction to n8n built-in functions | Function categories, usage contexts |
| [Data Transformation](./n8n-builtin-data-transformation.md) | Array, string, object, number, date functions | Complete function reference with examples |
| [Node Access](./n8n-builtin-node-access.md) | Input/output access between nodes | Current node input, cross-node data access |
| [Utilities](./n8n-builtin-utilities.md) | Convenience, HTTP, metadata functions | JMESPath, validation, crypto, debugging |
| [Code Nodes](./n8n-builtin-code-nodes.md) | Code node patterns and LangChain | Expression syntax, async operations, best practices |

## Installation & Setup

In your n8n Code node, import the utilities:

```javascript
// Import specific functions
const { processItemsWithPairing, normalizeData, validateEmail } = require('sww-n8n-helpers');

// Import module namespaces
const { sql, dataTransform, slackBlocks } = require('sww-n8n-helpers');

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
const { escape, normalizeData } = require('sww-n8n-helpers');

const userInput = "O'Reilly's \"Book\"";
const safe = escape(userInput);
// Returns: "'O''Reilly''s \"Book\"'" (properly quoted and escaped for SQL)

// Or use data normalization for business logic
const normalized = normalizeData({ title: userInput }, {
  title: { type: 'string', maxLength: 250 }
});
// Returns: { title: "O'Reilly's \"Book\"" } (ready for SQL generation)
```

### Combined Processing

```javascript
const { normalizeData, generateSafeFileName, validateEmail } = require('sww-n8n-helpers');

const title = "My Article: Special \"Chars\"";
const email = "USER@EXAMPLE.COM";

// Normalize data with business rules
const normalized = normalizeData({ title }, {
  title: { type: 'string', maxLength: 50 }
});

const validEmail = validateEmail(email) ? email.toLowerCase() : null;
const filename = generateSafeFileName(title, 'txt');

// Results: { title: "My Article: Special \"Chars\"" }, "user@example.com", "My_Article__Special__Chars_.txt"
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
const { generateInsert, normalizeData, formatFileSize } = require('sww-n8n-helpers');

const rawData = {
  title: "New Episode",
  fileSize: 15728640,  // 15MB
  publishDate: new Date()
};

// First normalize the data
const normalized = normalizeData(rawData, {
  title: { type: 'string', maxLength: 250 },
  fileSize: { type: 'integer' },
  publishDate: { type: 'date' }
});

// Then generate SQL
const sql = generateInsert('Episodes', normalized, {
  outputClause: 'OUTPUT INSERTED.EpisodeId',
  specialValues: { EpisodeId: 'NEWID()' }
});

const readableSize = formatFileSize(rawData.fileSize); // "15.0 MB"
```

## Common Usage Patterns

### Data Normalization and SQL Generation

```javascript
const { normalizeData, generateInsert, COMMON_FIELD_CONFIGS } = require('sww-n8n-helpers');

// Normalize with common field configurations
const normalized = normalizeData(
  { title: "Breaking News!", content: "<p>Content</p>" },
  {
    title: COMMON_FIELD_CONFIGS.title,
    content: COMMON_FIELD_CONFIGS.content
  }
);

// Generate SQL with normalized data
const sql = generateInsert('posts', normalized);
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
