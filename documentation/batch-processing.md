# Batch Processing Module

The batch processing module provides robust N8N-optimized utilities for processing arrays of items with automatic context injection, error handling, item pairing, and parallel processing capabilities.

## Import Options

**Individual function imports:**
```javascript
const { processItemsWithN8N } = require('sww-n8n-helpers');
```

**Namespace imports:**
```javascript
const { batch } = require('sww-n8n-helpers');
// Then use: batch.processItemsWithN8N($)
```

## Core Function: `processItemsWithN8N($)`

This factory function takes n8n's `$` function and returns helper methods optimized for n8n workflows.

### `processItems(items, processor, nodeNames, options)`

Process an array of n8n items with automatic context injection and node data retrieval.

**Parameters:**
- `items` (Array): N8N items from `$input.all()` or `$('NodeName').all()`
- `processor` (Function): Processing function that receives context variables
- `nodeNames` (Array): Array of node names to extract data for each item (optional)
- `options` (Object): Processing options
  - `batchSize` (Number): Process in batches of this size (default: null)
  - `logErrors` (Boolean): Log processing errors (default: true)
  - `stopOnError` (Boolean): Stop processing on first error (default: false)
  - `concurrency` (Number): For parallel processing (default: 1 = sequential)

**Returns:** Object with `{ results, errors, stats }`

### `filterAndProcess(items, filterFn, processor, nodeNames, options)`

Filter items based on conditions and process only the matching ones with the same context injection.

## Code Node Examples

### Basic Item Processing with Context Injection

```javascript
// Import the factory function
const { processItemsWithN8N } = require('sww-n8n-helpers');

// Create helpers with bound $ function
const { processItems } = processItemsWithN8N($);

// Get input items
const inputData = $input.all();

// Process with automatic context injection
const result = await processItems(
  inputData,
  // Processor receives: $item, $json, $itemIndex, ...nodeData
  ($item, $json, $itemIndex) => {
    return {
      id: $json.id,
      processedTitle: $json.title.toUpperCase(),
      itemIndex: $itemIndex,
      timestamp: $now()
    };
  }
);

// Return results (maintains n8n item pairing)
return result.results;
```

### Processing with Data from Other Nodes

```javascript
const { processItemsWithN8N } = require('sww-n8n-helpers');
const { processItems } = processItemsWithN8N($);

const inputData = $input.all();

// Extract data from "User Settings" and "API Config" nodes for each item
const result = await processItems(
  inputData,
  // Processor receives context + data from specified nodes
  ($item, $json, $itemIndex, userSettings, apiConfig) => {
    return {
      userId: $json.id,
      email: $json.email,
      // Use data from other nodes
      notifications: userSettings?.notifications || true,
      apiEndpoint: apiConfig?.endpoint || 'https://api.default.com',
      processedAt: $now()
    };
  },
  ['User Settings', 'API Config'], // Node names to extract data from
  {
    logErrors: true,
    batchSize: 50 // Process in batches of 50
  }
);

return result.results;
```

### Parallel Processing for I/O Operations

```javascript
const { processItemsWithN8N } = require('sww-n8n-helpers');
const { processItems } = processItemsWithN8N($);

const inputData = $input.all();

const result = await processItems(
  inputData,
  // Async processor for API calls
  async ($item, $json, $itemIndex) => {
    try {
      const response = await fetch(`https://api.example.com/users/${$json.id}`);
      const userData = await response.json();
      
      return {
        id: $json.id,
        enrichedData: userData,
        processed: true
      };
    } catch (error) {
      throw new Error(`API call failed for user ${$json.id}: ${error.message}`);
    }
  },
  [], // No additional nodes needed
  {
    concurrency: 3, // Process 3 items in parallel
    logErrors: true
  }
);

// Check processing statistics
console.log(`Processed: ${result.stats.successful}/${result.stats.total}`);
console.log(`Success rate: ${(result.stats.successRate * 100).toFixed(1)}%`);

return result.results;
```

### Filter and Process Pattern

```javascript
const { processItemsWithN8N } = require('sww-n8n-helpers');
const { filterAndProcess } = processItemsWithN8N($);

const inputData = $input.all();

const result = await filterAndProcess(
  inputData,
  // Filter function with context injection
  ($item, $json, $itemIndex) => {
    return $json.email && $json.email.includes('@') && $json.active === true;
  },
  // Processor function for filtered items
  ($item, $json, $itemIndex) => {
    return {
      id: $json.id,
      email: $json.email.toLowerCase(),
      welcomeMessage: `Hello ${$json.name || 'User'}!`,
      processedAt: $now()
    };
  },
  [], // No additional nodes
  {
    logErrors: true
  }
);

// Log filter statistics
console.log(`Filtered ${result.filterStats.filteredCount} from ${result.filterStats.totalItems} items`);
console.log(`Filter rate: ${(result.filterStats.filterRate * 100).toFixed(1)}%`);

return result.results;
```

### Error Handling and Recovery

```javascript
const { processItemsWithN8N } = require('sww-n8n-helpers');
const { processItems } = processItemsWithN8N($);

const inputData = $input.all();

const result = await processItems(
  inputData,
  ($item, $json, $itemIndex) => {
    // Validate required fields
    if (!$json.id) {
      throw new Error('Missing required ID field');
    }
    
    if (!$json.email || !$json.email.includes('@')) {
      throw new Error('Invalid email format');
    }
    
    return {
      id: $json.id,
      email: $json.email.toLowerCase(),
      validated: true,
      validatedAt: $now()
    };
  },
  [],
  {
    logErrors: true,
    stopOnError: false // Continue processing other items
  }
);

// Separate successful and failed items
const successful = result.results.filter(item => !item.json.$error);
const failed = result.results.filter(item => item.json.$error);

console.log(`Processing completed: ${successful.length} successful, ${failed.length} failed`);

// Return all results (errors will have $error property)
return result.results;
```

## Processing Statistics

Every processing operation returns detailed statistics:

```javascript
const result = await processItems(/* ... */);

// Access statistics
console.log(result.stats);
// {
//   total: 100,
//   successful: 95,
//   failed: 5,
//   successRate: 0.95,
//   failureRate: 0.05,
//   errorBreakdown: {
//     'validation_error': 3,
//     'processing_error': 2
//   },
//   sampleErrors: [
//     { type: 'validation_error', message: 'Missing ID', itemIndex: 5 }
//   ]
// }
```

## Error Structure

Failed items include structured error information:

```javascript
{
  json: {
    // Original item data
    id: 123,
    // Error details
    $error: {
      type: "processing_error",
      message: "Detailed error message",
      timestamp: "2024-01-15T10:30:00.000Z",
      context: {
        itemIndex: 5,
        originalData: { id: 123, name: "Item 5" },
        stack: "Error stack trace..."
      }
    }
  },
  pairedItem: 5 // Maintains n8n item pairing
}
```

## Best Practices

1. **Always use the factory pattern** with `processItemsWithN8N($)`
2. **Leverage context injection** - use `$item`, `$json`, `$itemIndex` parameters
3. **Extract node data** when you need data from other nodes for processing
4. **Use parallel processing** for I/O-heavy operations with appropriate concurrency
5. **Enable error logging** during development
6. **Don't stop on errors** unless critical - let failed items flow through with `$error`
7. **Monitor statistics** to track processing health
8. **Use batch processing** for large datasets to manage memory

## Legacy Function (Deprecated)

The module also exports `processItemsWithPairing` for backward compatibility, but it's deprecated. Use `processItemsWithN8N($).processItems` instead for better functionality and n8n integration. 