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