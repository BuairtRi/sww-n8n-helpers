# Import Examples for N8N

This document shows practical examples of how to import and use the sww-n8n-helpers package in your N8N code nodes.

## Individual Function Imports (Recommended for Simple Use Cases)

When you only need a few specific functions:

```javascript
// Import only what you need
const { processItemsWithPairing, sanitizeForSQL, validateEmail } = require('sww-n8n-helpers');

// Use directly in your n8n node
const results = processItemsWithPairing($input.all(), (item, index) => {
  return {
    id: item.json.id,
    email: validateEmail(item.json.email) ? item.json.email : null,
    safe_title: sanitizeForSQL(item.json.title)
  };
});

return results;
```

## Namespace Imports (Recommended for Organized Code)

When you're using multiple functions from the same module:

```javascript
// Import entire modules as namespaces
const { batch, validation, sqlSanitization } = require('sww-n8n-helpers');

// More organized code
const items = $input.all();

// Validate first
const validatedItems = batch.filterAndProcess(
  items,
  (item) => validation.validateRequiredFields(item.json, ['id', 'email']).isValid,
  (item) => item
);

// Then process
const results = batch.processItemsWithPairing(validatedItems.processed, (item) => ({
  id: item.json.id,
  email: item.json.email.toLowerCase(),
  safe_content: sqlSanitization.sanitizeForSQL(item.json.content)
}));

return results;
```

## Mixed Approach (Recommended for Complex Workflows)

Combine both approaches for frequently used functions and organized modules:

```javascript
// Frequently used functions + organized modules
const { 
  processItemsWithPairing,  // Direct import for common function
  batch,                    // Namespace for other batch functions
  validation,               // Namespace for validation functions
  text                      // Namespace for text processing
} = require('sww-n8n-helpers');

const items = $input.all();

// Use direct import for main processing
const results = processItemsWithPairing(items, (item, index) => {
  const data = item.json;
  
  // Use namespaced functions for specific operations
  const isValid = validation.validateRequiredFields(data, ['title', 'content']).isValid;
  
  if (!isValid) {
    throw new Error('Missing required fields');
  }
  
  return {
    id: data.id,
    title: text.cleanHtml(data.title),
    summary: text.truncateWithSeparator(data.content, 200, '...'),
    processedAt: new Date().toISOString()
  };
});

// Use namespace for aggregation
const stats = batch.aggregateResults(results, { includeErrorDetails: true });

// Return both results and stats for monitoring
return [
  ...results,
  { json: { processingStats: stats }, pairedItem: -1 }
];
```

## Error Handling Pattern

Best practice for error handling in n8n nodes:

```javascript
const { batch, validation } = require('sww-n8n-helpers');

const items = $input.all();

try {
  // Process with built-in error handling
  const results = batch.processItemsWithPairing(items, (item, index) => {
    // Validate each item
    const validationResult = validation.validateRequiredFields(item.json, ['id']);
    
    if (!validationResult.isValid) {
      throw new Error(`Item ${index}: ${validationResult.errors.join(', ')}`);
    }
    
    // Process valid items
    return {
      id: item.json.id,
      processed: true,
      timestamp: new Date().toISOString()
    };
  }, {
    logErrors: true,      // Log errors for debugging
    stopOnError: false    // Continue processing other items
  });
  
  // Check for processing errors
  const stats = batch.aggregateResults(results);
  
  if (stats.failed > 0) {
    console.warn(`Processing completed with ${stats.failed} errors out of ${stats.total} items`);
  }
  
  return results;
  
} catch (error) {
  // Handle unexpected errors
  console.error('Batch processing failed:', error.message);
  throw error;
}
```

## Performance Optimization

For large datasets, use parallel processing:

```javascript
const { batch } = require('sww-n8n-helpers');

const items = $input.all();

// For I/O heavy operations (API calls, database queries)
const results = await batch.processItemsParallel(items, async (item) => {
  const response = await $http.get(`/api/enrich/${item.json.id}`);
  return {
    ...item.json,
    enrichedData: response.data
  };
}, {
  concurrency: 3,       // Process 3 items simultaneously
  maintainOrder: true   // Keep original order for n8n pairing
});

return results;
```

## Memory Management

For very large datasets, use batch processing:

```javascript
const { batch } = require('sww-n8n-helpers');

const items = $input.all();

// Process in smaller chunks to manage memory
const results = batch.processItemsWithPairing(items, (item) => {
  // Heavy processing logic here
  return processHeavyOperation(item.json);
}, {
  batchSize: 100,       // Process 100 items at a time
  logErrors: true
});

return results;
```

## New Features - N8N Utilities and Enhanced SQL

### N8N Node Data Extraction

```javascript
// Import N8N utilities for node data extraction
const { createN8NHelpers, processItemsWithPairing } = require('sww-n8n-helpers');

// Create N8N helpers with $ function bound
const { extractNodeData, checkNodeAvailability } = createN8NHelpers($);

// Check if required nodes have data
const status = checkNodeAvailability(['Podcast Episodes', 'Sources']);
if (!status.hasData['Podcast Episodes']) {
  throw new Error('No podcast episode data available');
}

// Process with node data extraction
const results = processItemsWithPairing($input.all(), (item, index) => {
  // Extract data from multiple nodes with proper item indexing
  const nodeData = extractNodeData({
    episode: 'Podcast Episodes',
    source: 'Sources',
    config: 'Processing Config'
  }, item, index);

  return {
    title: nodeData.episode?.title || 'Untitled',
    sourceUrl: nodeData.source?.url,
    duration: nodeData.episode?.duration || 0,
    configSetting: nodeData.config?.setting || 'default'
  };
});

return results;
```

### Enhanced SQL Generation with Field Mappings

```javascript
// Import enhanced SQL functions and utilities
const { 
  generateInsertStatement, 
  generateEnhancedSQLValue,
  formatFileSize,
  createN8NHelpers 
} = require('sww-n8n-helpers');

const { extractNodeData } = createN8NHelpers($);

// Define field mappings for type-aware SQL generation
const FIELD_MAPPINGS = {
  Title: { type: 'title', maxLength: 250 },
  Description: { type: 'content' },
  AuthorEmail: { type: 'email' },
  PublishDate: { type: 'datetime' },
  FileSize: { type: 'int' },
  IsActive: { type: 'boolean' },
  CategoryId: { type: 'guid' }
};

const results = $input.all().map((item, index) => {
  // Extract data from nodes
  const nodeData = extractNodeData(['Episodes', 'Authors'], item, index);
  
  // Prepare data for SQL insertion
  const insertData = {
    Title: nodeData.Episodes?.title,
    Description: nodeData.Episodes?.description,
    AuthorEmail: nodeData.Authors?.email,
    PublishDate: nodeData.Episodes?.publishDate || new Date().toISOString(),
    FileSize: nodeData.Episodes?.fileSize || 0,
    IsActive: true
  };

  // Generate enhanced SQL with OUTPUT clause and special values
  const sql = generateInsertStatement('Articles', insertData, {
    outputClause: 'OUTPUT INSERTED.ArticleId, INSERTED.Title',
    specialValues: {
      ArticleId: 'NEWID()',
      CreatedAt: 'GETDATE()'
    },
    fieldMappings: FIELD_MAPPINGS
  });

  // Format file size for display
  const readableSize = formatFileSize(insertData.FileSize);

  return {
    sql: sql,
    metadata: {
      title: insertData.Title,
      fileSize: readableSize,
      hasAuthor: !!nodeData.Authors?.email
    }
  };
});

return results;
```

### Type-Aware SQL Value Generation

```javascript
// Import enhanced SQL value generation
const { generateEnhancedSQLValue } = require('sww-n8n-helpers');

// Convert various data types to SQL-safe values
const sqlValues = {
  // String handling
  title: generateEnhancedSQLValue("O'Reilly's Book", 'title'),
  // Returns: "'O''Reilly''s Book'"
  
  // Email normalization
  email: generateEnhancedSQLValue("USER@EXAMPLE.COM", 'email'),
  // Returns: "'user@example.com'"
  
  // Number handling
  price: generateEnhancedSQLValue("99.99", 'decimal'),
  // Returns: "99.99"
  
  // Boolean conversion
  active: generateEnhancedSQLValue(true, 'boolean'),
  // Returns: "1"
  
  // GUID validation
  id: generateEnhancedSQLValue('550e8400-e29b-41d4-a716-446655440000', 'guid'),
  // Returns: "TRY_CONVERT(uniqueidentifier, '550e8400-e29b-41d4-a716-446655440000')"
  
  // Date formatting
  created: generateEnhancedSQLValue(new Date(), 'datetime'),
  // Returns: "'2024-01-15T10:30:00.000Z'"
};

console.log('Generated SQL values:', sqlValues);
```

### File Size Formatting

```javascript
// Import file utilities
const { formatFileSize, parseContentLength, validateFileSize } = require('sww-n8n-helpers');

const results = $input.all().map(item => {
  // Parse file size from various sources
  const sizeInBytes = parseContentLength(item.json.contentLength) || 0;
  
  // Format for display
  const readableSize = formatFileSize(sizeInBytes);
  const detailedSize = formatFileSize(sizeInBytes, { precision: 2 });
  
  // Validate size constraints
  const isValidSize = validateFileSize(sizeInBytes, {
    minSize: 1024,          // 1KB minimum
    maxSize: 100 * 1024 * 1024  // 100MB maximum
  });

  return {
    originalSize: sizeInBytes,
    readableSize: readableSize,      // "15.0 MB"
    detailedSize: detailedSize,      // "15.73 MB"
    isValidSize: isValidSize,
    shouldProcess: isValidSize && sizeInBytes > 0
  };
});

return results;
```
