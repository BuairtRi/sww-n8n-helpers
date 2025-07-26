# Claude Development Context

## Project Overview
This is the `sww-n8n-helpers` project - a comprehensive n8n workflow automation system with:
1. **Helper Library** - NPM package providing utilities for text processing, file handling, SQL sanitization, validation, and batch processing
2. **Workflow Architecture** - Three-layer architecture for data ingestion, processing, and presentation
3. **Supporting Infrastructure** - Core utilities, error handling, API endpoints, and common database queries

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

## Helper Library Overview

The `sww-n8n-helpers` NPM package provides comprehensive utilities for n8n workflows. For detailed documentation, see `documentation/README.md`.

### Available Modules

1. **Batch Processing** (`src/batch.js`)
   - `processItemsWithPairing()` - Process arrays while maintaining n8n item pairing
   - `processItemsWithAccessors()` - Advanced batch processing with node data access
   - See: `documentation/batch-processing.md`

2. **Data Transform** (`src/data-transform.js`)
   - `normalizeData()` - Business logic data normalization
   - `normalizeField()` - Field-level transformations
   - `COMMON_FIELD_CONFIGS` - Pre-configured field types
   - See: `documentation/data-transform.md`

3. **SQL Utilities** (`src/sql.js`)
   - `generateInsert()` - Safe INSERT statement generation
   - `generateUpdate()` - Safe UPDATE statement generation
   - `escape()`, `escapeId()`, `format()` - SQL escaping utilities
   - See: `documentation/sql-utilities.md`

4. **Text Processing** (`src/text.js`)
   - `cleanHtml()` - Remove HTML tags and clean text
   - `truncateWithSeparator()` - Intelligent text truncation
   - `createFallbackChain()` - Nested property access with fallbacks
   - See: `documentation/text-processing.md`

5. **File Operations** (`src/file.js`)
   - `generateSafeFileName()` - Cross-platform safe filenames
   - `extractFileExtension()` - Extension detection from URLs/MIME
   - `formatFileSize()` - Human-readable file sizes
   - See: `documentation/file-utilities.md`

6. **Duration Utilities** (`src/duration.js`)
   - `parseDurationToSeconds()` - Parse HH:MM:SS and human formats
   - `formatFriendlyDuration()` - Convert seconds to readable format
   - See: `documentation/duration-utilities.md`

7. **Validation** (`src/validation.js`)
   - `validateAndExtractUrl()` - URL validation and extraction
   - `validateEmail()` - Email address validation
   - `validateRequiredFields()` - Object field validation
   - See: `documentation/validation-utilities.md`

8. **N8N Utilities** (`src/n8n.js`)
   - `createN8NHelpers()` - Node data extraction helpers
   - `extractNodeData()` - Multi-node data access
   - See: `documentation/n8n-utilities.md`

9. **Slack Blocks** (`src/slack-blocks.js`)
   - Complete Slack Block Kit utilities
   - `createHeader()`, `createSection()`, `createButton()`, etc.
   - See: `documentation/slack-blocks.md`

10. **Error Utilities** (`src/error.js`)
    - Consistent error object creation
    - Error categorization and tracking

### Deprecated Modules
- **SQL Sanitization** (`src/sql-sanitization.js`) - Use `data-transform.js` + `sql.js` instead
  - Legacy compatibility maintained but not recommended for new code

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

## Workflow Architecture

### Primary Layers

1. **Ingestion Layer** (`workflows/ingestion/`)
   - Identifies and imports new KnowledgeSourceInstances
   - RSS feed readers, API integrations, file importers
   - Example: Podcast ingestion workflow

2. **Processing Layer** (`workflows/processing/`)
   - Applies KnowledgeOperations to KnowledgeSourceInstances
   - Transcription, summarization, enrichment, analysis
   - Links instances with operations via KnowledgeSourceInstanceOperations

3. **Presentation Layer** (`workflows/presentation/`)
   - Delivers processed data to end users
   - Slack notifications, email distribution, feed generation
   - Dashboard updates and external API responses

### Supporting Layers

1. **Core** (`workflows/core/`)
   - Reusable sub-workflows for common operations
   - Database connections, authentication, data transformations

2. **Error Handling** (`workflows/error-handling/`)
   - Centralized error capture and logging
   - Recovery mechanisms and notification escalation
   - Database error persistence

3. **API** (`workflows/api/`)
   - Webhook endpoints for external applications
   - AppSmith integrations and REST APIs
   - External service callbacks

4. **Common Queries** (`workflows/common-queries/`)
   - Standardized database operations
   - Knowledge Source and Instance queries
   - Batch processing and reporting queries

## Project Directory Structure

```
sww-n8n-helpers/
├── src/                        # Helper library source code
│   ├── batch.js               # Batch processing with n8n pairing
│   ├── duration.js            # Duration parsing/formatting
│   ├── file.js                # File handling utilities
│   ├── sql-sanitization.js    # SQL injection prevention
│   ├── text.js                # Text processing/HTML cleaning
│   └── validation.js          # Data validation utilities
├── workflows/                  # n8n workflow definitions
│   ├── ingestion/             # Data ingestion workflows
│   │   └── podcast/           # Podcast RSS ingestion
│   ├── processing/            # Data processing workflows
│   ├── presentation/          # User-facing outputs
│   ├── core/                  # Reusable sub-workflows
│   ├── error-handling/        # Error management
│   ├── api/                   # External API endpoints
│   └── common-queries/        # Database query workflows
├── documentation/             # Project documentation
│   └── n8n-error-handling.md  # n8n error handling guide
├── tests/                     # Unit tests for utilities
├── index.js                   # Main package entry point
├── package.json               # NPM package configuration
├── README.md                  # Project overview and architecture
└── CLAUDE.md                  # This file - AI context

### Workflow Folder Convention
Each workflow folder contains:
- `workflow.json` - The n8n workflow definition
- `*.js` - Code node implementations
- `*.sql` - SQL query files
- `README.md` - Workflow documentation
- `CODE_REVIEW_ANALYSIS.md` - Production readiness analysis (when applicable)
```

## Common Workflow Patterns

### Podcast Ingestion Example
Located in `workflows/ingestion/podcast/`:
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

#### n8n Node Error Configuration
Refer to `documentation/n8n-error-handling.md` for detailed guidance. Key points:
- Use "Retry on Fail" with "Stop Workflow" for proper retry behavior
- Enable "Continue on Fail" for non-critical operations
- Add "Always Output Data" to SQL nodes to handle empty results
- Known issue: Retry doesn't work properly with Continue settings

#### Database Transaction Integrity
- Use stored procedures for atomic operations when possible
- Implement compensating transactions for rollback scenarios
- Create cleanup workflows for orphaned records
- Always consider: "What if the second operation fails?"

## Testing
Run tests with: `npm test`
Test files are located in the `tests/` directory.

## Documentation
- `documentation/` - Comprehensive project documentation
  - `README.md` - Documentation overview and module index
  - `n8n-error-handling.md` - n8n error handling capabilities and best practices
  - Module-specific docs: `batch-processing.md`, `data-transform.md`, `sql-utilities.md`, etc.
  - n8n built-in function references
  - Best practices guides: `code-node-best-practices.md`, `slack-block-best-practices.md`
  - Database schema documentation and scripts
- `README.md` - Project overview and architecture
- Individual function JSDoc documentation in source files

---

*This file helps Claude understand the project context and coding conventions for consistent development.*