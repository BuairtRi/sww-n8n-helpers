# SWW N8N Helpers

A NPM package for use by Scott Web Works containing reusable code functions for use in N8N code nodes.

## Description

This package provides a collection of utility functions and helpers designed to streamline development within N8N workflows, offering common functionality that can be easily imported and used across different N8N code nodes.

## Project Structure

The project is organized with a modular structure:

```
sww-n8n-helpers/
├── index.js                 # Main entry point - exports all utilities
├── src/                     # Individual utility modules
│   ├── duration.js          # Duration parsing and formatting utilities
│   ├── file.js              # File and media handling utilities
│   ├── text.js              # Text processing and HTML cleaning utilities
│   ├── validation.js        # Data validation and object cleaning utilities
│   ├── batch.js             # Batch processing utilities for n8n workflows
│   └── sql-sanitization.js  # SQL sanitization and escaping utilities
├── tests/                   # Test files for all modules
└── package.json
```

## Usage

Import utilities from the main package using either approach:

**Individual function imports (flat namespace):**
```javascript
const {
  parseDurationToSeconds,
  formatFriendlyDuration,
  extractFileExtension,
  generateSafeFileName,
  cleanHtml,
  truncateWithSeparator,
  createFallbackChain,
  validateRequiredFields,
  processItemsWithPairing,
  sanitizeForSQL,
  escapeSqlValue
} = require('sww-n8n-helpers');
```

**Namespace imports (organized by module):**
```javascript
const { duration, file, text, validation, batch, sqlSanitization } = require('sww-n8n-helpers');

// Then use:
duration.parseDurationToSeconds('1h 30m');
batch.processItemsWithPairing(items, processor);
validation.validateRequiredFields(data, ['name', 'email']);
```

**Mixed approach (common functions + namespaces):**
```javascript
const { 
  processItemsWithPairing,  // Individual import for frequently used
  batch,                    // Namespace for other batch functions
  validation 
} = require('sww-n8n-helpers');
```

## Modules Overview

- **Duration**: Parse and format duration values in various formats
- **File**: Handle file extensions, generate safe filenames, validate URLs
- **Text**: Clean HTML, process markdown, truncate text intelligently
- **Validation**: Validate data, create fallback chains, clean objects
- **Batch**: Process arrays with error handling and n8n pairing
- **SQL Sanitization**: Comprehensive SQL injection prevention and escaping
