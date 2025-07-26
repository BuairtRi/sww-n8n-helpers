# SWW N8N Helpers

A NPM package for use by Scott Web Works containing reusable code functions for use in N8N code nodes.

## Description

This package provides a collection of utility functions and helpers designed to streamline development within N8N workflows, offering common functionality that can be easily imported and used across different N8N code nodes.

## Architecture Overview

The n8n workflows follow a three-layer architecture:

### Primary Layers

1. **Ingestion Layer** - Identifying and importing new KnowledgeSourceInstances
   - RSS feed readers for podcasts
   - API integrations for external content
   - File watchers and importers
   - Scheduled data retrieval workflows

2. **Processing Layer** - Applying transformations via KnowledgeOperations
   - Transcription services
   - Summarization and analysis
   - Content enrichment
   - Data normalization and validation
   - Linking KnowledgeSourceInstances with KnowledgeOperations

3. **Presentation Layer** - Delivering processed data to end users
   - Slack notifications and updates
   - Email distribution
   - Podcast feed generation
   - Dashboard updates
   - API endpoints for external consumption

### Supporting Layers

1. **Core** - Reusable sub-workflows for common operations
   - Database connection management
   - Authentication flows
   - Data transformation utilities
   - Shared business logic

2. **Error Handling** - Centralized error management
   - Error capture and logging workflows
   - Recovery and retry mechanisms
   - Notification escalation
   - Database error persistence

3. **API** - Webhook endpoints for external applications
   - REST API implementations
   - AppSmith application integrations
   - External service callbacks
   - Data synchronization endpoints

4. **Common Queries** - Standardized database operations
   - Knowledge Source queries
   - Knowledge Source Instance operations
   - Batch processing queries
   - Reporting and analytics queries

## Project Structure

The project is organized to match the architectural layers:

```
sww-n8n-helpers/
├── index.js                 # Main entry point - exports all utilities
├── src/                     # Helper package code modules
│   ├── duration.js          # Duration parsing and formatting utilities
│   ├── file.js              # File and media handling utilities
│   ├── text.js              # Text processing and HTML cleaning utilities
│   ├── validation.js        # Data validation and object cleaning utilities
│   ├── batch.js             # Batch processing utilities for n8n workflows
│   └── sql-sanitization.js  # SQL sanitization and escaping utilities
├── workflows/               # n8n workflow definitions and code
│   ├── ingestion/          # Ingestion layer workflows
│   │   ├── podcast/        # Podcast-specific ingestion
│   │   ├── rss/           # General RSS feed ingestion
│   │   └── api/           # API-based ingestion
│   ├── processing/         # Processing layer workflows
│   │   ├── transcription/  # Audio/video transcription
│   │   ├── summarization/  # Content summarization
│   │   └── enrichment/    # Data enrichment operations
│   ├── presentation/       # Presentation layer workflows
│   │   ├── slack/         # Slack notifications
│   │   ├── email/         # Email distribution
│   │   └── feeds/         # Feed generation
│   ├── core/              # Core utility workflows
│   │   ├── auth/          # Authentication flows
│   │   └── database/      # Database utilities
│   ├── error-handling/    # Error management workflows
│   │   ├── capture/       # Error capture workflows
│   │   └── recovery/      # Recovery mechanisms
│   ├── api/               # API endpoint workflows
│   │   ├── webhooks/      # Webhook handlers
│   │   └── rest/          # REST API implementations
│   └── common-queries/    # Reusable query workflows
│       ├── sources/       # Knowledge Source queries
│       └── instances/     # Knowledge Source Instance queries
├── documentation/          # Project documentation
│   └── n8n-error-handling.md  # n8n error handling guide
├── tests/                  # Test files for all modules
├── CLAUDE.md              # AI assistant context
└── package.json
```

### Workflow Folder Structure

Each workflow folder contains:
- `workflow.json` - The n8n workflow definition
- `*.js` - Code node implementations
- `*.sql` - SQL query files
- `README.md` - Workflow-specific documentation
- `CODE_REVIEW_ANALYSIS.md` - Production readiness analysis (where applicable)

## Usage

This package supports two import styles to suit different use cases:

### Individual Function Import (Recommended for single functions)

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

### Module Import (Recommended for multiple functions from the same module)

```javascript
const {
  duration,
  file,
  text,
  validation,
  batch,
  sqlSanitization
} = require('sww-n8n-helpers');

// Use: duration.parseDurationToSeconds(), file.extractFileExtension(), etc.
```

### Mixed Import (Use both styles as needed)

```javascript
const {
  parseDurationToSeconds,  // Individual function
  file,                    // Entire file module
  text                     // Entire text module
} = require('sww-n8n-helpers');
```

## Modules Overview

- **Duration**: Parse and format duration values in various formats
- **File**: Handle file extensions, generate safe filenames, validate URLs
- **Text**: Clean HTML, process markdown, truncate text intelligently
- **Validation**: Validate data, create fallback chains, clean objects
- **Batch**: Process arrays with error handling and n8n pairing
- **SQL Sanitization**: Comprehensive SQL injection prevention and escaping
