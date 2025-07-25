# Batch Processing Module

The batch processing module provides robust utilities for processing arrays of items in n8n workflows with error handling, item pairing, and parallel processing capabilities.

## Import Options

You can import batch functions using either approach:

**Individual function imports:**
```javascript
const { processItemsWithPairing, filterAndProcess } = require('sww-n8n-helpers');
```

**Namespace imports:**
```javascript
const { batch } = require('sww-n8n-helpers');
// Then use: batch.processItemsWithPairing(), batch.filterAndProcess(), etc.
```

## Key Functions

### `processItemsWithPairing(items, processor, options)`

Process an array of items with automatic error handling and n8n item pairing maintenance.

**Parameters:**
- `items` (Array): Items to process
- `processor` (Function): Processing function `(item, index) => result`
- `options` (Object): Processing options
  - `maintainPairing` (Boolean): Maintain n8n item pairing (default: true)
  - `logErrors` (Boolean): Log processing errors (default: true)
  - `stopOnError` (Boolean): Stop on first error (default: false)
  - `batchSize` (Number): Process in batches (default: null)

**Example: Basic Item Processing**
```javascript
const { processItemsWithPairing } = require('sww-n8n-helpers');

const items = [{ json: { id: 1, title: 'Hello' } }, { json: { id: 2, title: 'World' } }];

const results = processItemsWithPairing(items, (item, index) => {
  return {
    id: item.json.id,
    processedTitle: item.json.title.toUpperCase(), // 'HELLO', 'WORLD'
    itemIndex: index
  };
});
// Returns: [{ json: { id: 1, processedTitle: 'HELLO', itemIndex: 0 }, pairedItem: 0 }, ...]
```

**Example: Batch Processing for Large Datasets**
```javascript
const results = processItemsWithPairing(largeItemArray, (item, index) => {
  return expensiveOperation(item.json); // Process item
}, {
  batchSize: 50, // Process 50 items at a time to manage memory
  stopOnError: false // Continue processing even if some items fail
});
```

### `filterAndProcess(items, filterFn, processor, options)`

Filter items based on conditions and process only the matching ones.

**Example: Conditional Processing**
```javascript
const { filterAndProcess } = require('sww-n8n-helpers');

const items = [
  { json: { id: 1, email: 'user@test.com' } },
  { json: { id: 2, email: 'invalid' } },
  { json: { id: 3, email: 'admin@test.com' } }
];

const result = filterAndProcess(
  items,
  (item) => item.json.email.includes('@'), // Filter: only valid emails
  (item, originalIndex) => ({ id: item.json.id, email: item.json.email.toLowerCase() })
);

// result.processed: [{ id: 1, email: 'user@test.com' }, { id: 3, email: 'admin@test.com' }]
// result.filteredCount: 2, result.totalItems: 3
```

### `processItemsParallel(items, processor, options)`

Process items in parallel for improved performance.

**Example: Parallel Processing**
```javascript
const { processItemsParallel } = require('sww-n8n-helpers');

const items = [{ json: { id: 1 } }, { json: { id: 2 } }, { json: { id: 3 } }];

const results = await processItemsParallel(
  items,
  async (item) => {
    const response = await fetch(`/api/${item.json.id}`);
    return { id: item.json.id, data: await response.json() };
  },
  { concurrency: 2 } // Process 2 items simultaneously
);
```

### `aggregateResults(processedItems, options)`

Generate statistics from processed results.

**Example: Processing Statistics**
```javascript
const { aggregateResults } = require('sww-n8n-helpers');

const processedItems = [
  { json: { id: 1, result: 'success' }, pairedItem: 0 },
  { json: { _error: { type: 'validation_error' } }, pairedItem: 1 },
  { json: { id: 3, result: 'success' }, pairedItem: 2 }
];

const stats = aggregateResults(processedItems);
// Returns: { total: 3, successful: 2, failed: 1, successRate: 0.67, failureRate: 0.33 }
```

### `retryFailedItems(processedItems, originalItems, processor, options)`

Retry processing for failed items.

**Example: Retry Failed Items**
```javascript
const { retryFailedItems } = require('sww-n8n-helpers');

const processedItems = [
  { json: { id: 1, success: true }, pairedItem: 0 },
  { json: { _error: { type: 'temp_failure' } }, pairedItem: 1 }
];
const originalItems = [{ json: { id: 1 } }, { json: { id: 2 } }];

const retried = retryFailedItems(
  processedItems,
  originalItems,
  (item) => ({ id: item.json.id, success: true, retried: true }),
  { maxRetries: 1 }
);
// Retries only the failed item (index 1)
```

## Common Patterns

### Data Validation Pipeline
```javascript
const { processItemsWithPairing, validateEmail } = require('sww-n8n-helpers');

const items = [{ json: { id: 1, email: 'user@test.com' } }];

const validated = processItemsWithPairing(items, (item, index) => {
  const data = item.json;
  
  if (!data.id) throw new Error('Missing required ID');
  
  return {
    id: data.id,
    email: validateEmail(data.email) ? data.email : null,
    valid: true
  };
});
// Returns: [{ json: { id: 1, email: 'user@test.com', valid: true }, pairedItem: 0 }]
```

### SQL Node Integration
```javascript
const { processItemsWithPairing, sanitizeForSQL } = require('sww-n8n-helpers');

const items = [{ json: { id: 1, title: "O'Reilly Book" } }];

const sqlReady = processItemsWithPairing(items, (item) => ({
  id: item.json.id,
  title: sanitizeForSQL(item.json.title),  // Escapes quotes: "O''Reilly Book"
  created_at: new Date().toISOString()
}));
// Ready for SQL node with safe data
```

### Error Recovery
```javascript
const { processItemsWithPairing } = require('sww-n8n-helpers');

const items = [{ json: { data: 'test' } }];

const results = processItemsWithPairing(items, (item) => {
  try {
    return { result: primaryProcessor(item.json) };
  } catch (primaryError) {
    try {
      return { result: fallbackProcessor(item.json), fallback: true };
    } catch (fallbackError) {
      throw new Error(`Both processors failed: ${fallbackError.message}`);
    }
  }
}, { logErrors: true });
// Graceful fallback handling
```

## Best Practices

1. **Always use `maintainPairing: true`** for n8n compatibility
2. **Enable error logging** during development with `logErrors: true`
3. **Use batch processing** for large datasets to manage memory
4. **Implement graceful degradation** with try-catch in processors
5. **Leverage parallel processing** for I/O-heavy operations
6. **Monitor statistics** with `aggregateResults()` for workflow health
7. **Implement retry logic** for transient failures

## Error Handling

Failed items return structured error objects:
```javascript
{
  json: {
    _error: {
      type: "processing_error",
      message: "Detailed error message",
      timestamp: "2024-01-15T10:30:00.000Z",
      itemIndex: 5,
      originalData: { id: "item_5" }
    }
  },
  pairedItem: 5
}
```

This allows downstream nodes to handle errors appropriately while maintaining data flow integrity. 