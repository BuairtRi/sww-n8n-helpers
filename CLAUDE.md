# Claude Development Context

## Project Overview
This is the `sww-n8n-helpers` project - a utility library for n8n workflow automation. It provides helper functions for common operations like text processing, file handling, SQL sanitization, validation, and batch processing.

## Code Node Development Guidelines

### Default Execution Mode
**IMPORTANT:** When working with n8n Code nodes in this project, the default setting is **"Run Once for All Items"** mode. This means:

- Code nodes receive **multiple items** via `$input.all()` 
- The code must handle **batch processing** of all input items
- Use `processItemsWithPairing()` utility to maintain proper item relationships
- Individual item failures should not stop the entire batch processing

### Code Node Structure Template
```javascript
// Import sww-n8n-helpers utilities
const { 
  processItemsWithPairing,
  sanitizeForSQL,
  // ... other utilities
} = require('sww-n8n-helpers');

// Get all input items for batch processing
const inputItems = $input.all();

console.log(`Processing ${inputItems.length} items`);

// Process items with batch utility
const results = processItemsWithPairing(inputItems, (item, itemIndex) => {
  // Process individual item here
  const data = item.json;
  
  // Return processed result
  return processedData;
}, {
  maintainPairing: true,
  logErrors: true,
  stopOnError: false
});

return results;
```

### Upstream Node Data Access
Access upstream node data using standard n8n syntax:
```javascript
// Single item from upstream node
const upstreamData = $('Node Name').item?.json;

// All items from upstream node
const allUpstreamData = $('Node Name').all();
```

## Available Utilities

### Batch Processing
- `processItemsWithPairing()` - Process multiple items while maintaining n8n item pairing

### SQL Operations
- `sanitizeForSQL()` - Sanitize strings for safe SQL execution
- `sanitizeObject()` - Sanitize entire objects for database operations

### Text Processing
- `cleanHtml()` - Remove HTML tags and clean text
- `truncateWithSeparator()` - Safely truncate text at word boundaries
- `createFallbackChain()` - Access nested object properties with fallbacks

### File Operations
- `generateSafeFileName()` - Create cross-platform safe filenames
- `extractFileExtension()` - Extract file extensions from URLs or MIME types

### Duration & Time
- `parseDurationToSeconds()` - Parse various duration formats to seconds
- `formatFriendlyDuration()` - Convert seconds to human-readable duration
- `validateAndFormatDate()` - Validate and format dates consistently

### Validation
- `validateAndExtractUrl()` - Validate and extract clean URLs

## External npm Packages
The following external packages are available in the n8n environment:
- `lodash` - Data manipulation utilities
- `moment` - Date/time handling
- `cheerio` - HTML parsing (server-side jQuery)
- `validator` - String validation
- `sanitize-filename` - Safe filename generation
- `pretty-bytes` - Human-readable file sizes
- `parse-duration` - Duration parsing
- `tsqlstring` - SQL string sanitization

## Database Schema
The project works with a SQL Server database with these key tables:
- `Topics` - Content organization and workflow configuration
- `KnowledgeSources` - Content source definitions
- `KnowledgeSourceInstances` - Individual content items
- `KnowledgeOperations` - Processing operations
- `KnowledgeSourceInstanceOperations` - Item-operation associations
- `Texts` - Generated text content storage
- `ErrorLogs` - System error tracking

## Common Workflow Patterns

### Podcast Ingestion
Located in `nodes/ingestion/podcast/`:
1. Retrieve podcast knowledge sources
2. Fetch RSS feeds
3. Normalize episode data (`podcast_episodes.js`)
4. Check for duplicates (`podcast_exists.js`)
5. Insert new episodes
6. Create processing operations
7. Send notifications

### Error Handling
- Always use try/catch in processing functions
- Maintain item pairing even on errors
- Log errors with context for debugging
- Don't stop batch processing on individual failures

## Testing
Run tests with: `npm test`
Test files are located in the `tests/` directory.

## Documentation
- `documentation/` - Comprehensive project documentation
- `README.md` - Project overview and setup
- Individual function documentation in source files

---

*This file helps Claude understand the project context and coding conventions for consistent development.*