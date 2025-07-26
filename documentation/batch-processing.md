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

This factory function takes n8n's `$` function and returns helper methods optimized for n8n workflows with automatic context injection and defensive node data access.

### `processItems(items, processor, nodeNames, options)`

Process an array of n8n items with automatic context injection and safe node data retrieval with retry logic.

**Parameters:**
- `items` (Array): N8N items from `$input.all()` or `$('NodeName').all()`
- `processor` (Function): Processing function that receives: `($item, $json, $itemIndex, ...nodeData)`
  - `$item`: Full n8n item object
  - `$json`: Item's json data
  - `$itemIndex`: Current item index
  - `...nodeData`: Individual node data in nodeNames array order with camelCase parameter names
- `nodeNames` (Array): Array of node names to extract data for each item (can contain spaces/special chars)
- `options` (Object): Processing options
  - `logErrors` (Boolean): Log processing errors (default: true)
  - `stopOnError` (Boolean): Stop processing on first error (default: false)

**Returns:** Object with `{ results, errors, stats }`

**Node Name to Parameter Mapping:**
Node names are automatically converted to camelCase parameters:
- `'Ingestion Sources'` → `ingestionSources`
- `'User Settings'` → `userSettings`
- `'API_Config'` → `apiConfig`

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
      timestamp: new Date().toISOString()
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
  // Processor receives context + data from specified nodes (camelCase params)
  ($item, $json, $itemIndex, userSettings, apiConfig) => {
    return {
      userId: $json.id,
      email: $json.email,
      // Use data from other nodes with defensive access
      notifications: userSettings?.notifications || true,
      apiEndpoint: apiConfig?.endpoint || 'https://api.default.com',
      processedAt: new Date().toISOString()
    };
  },
  ['User Settings', 'API Config'], // Node names - automatically converted to camelCase
  {
    logErrors: true
  }
);

return result.results;
```

### Async Processing with External APIs

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
        processed: true,
        processedAt: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`API call failed for user ${$json.id}: ${error.message}`);
    }
  },
  [], // No additional nodes needed
  {
    logErrors: true
  }
);

// Check processing statistics
console.log(`Processed: ${result.stats.successful}/${result.stats.total}`);
console.log(`Success rate: ${(result.stats.successRate * 100).toFixed(1)}%`);

return result.results;
```

### Processing with Node Data from Multiple Sources

```javascript
const { processItemsWithN8N } = require('sww-n8n-helpers');
const { processItems } = processItemsWithN8N($);

const inputData = $input.all();

// Extract data from multiple nodes with automatic retry and defensive access
const result = await processItems(
  inputData,
  ($item, $json, $itemIndex, knowledgeSource, processingConfig, userSettings) => {
    return {
      id: $json.id,
      title: $json.title,
      // Defensive access to node data with fallbacks
      sourceId: knowledgeSource?.knowledgeSourceId || null,
      sourceName: knowledgeSource?.Name || 'Unknown Source',
      maxLength: processingConfig?.maxTextLength || 4000,
      userNotifications: userSettings?.enableNotifications || false,
      processedAt: new Date().toISOString()
    };
  },
  ['Knowledge Source', 'Processing Config', 'User Settings'], // Multiple node sources
  {
    logErrors: true
  }
);

console.log(`Processed ${result.stats.successful}/${result.stats.total} items`);
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
      validatedAt: new Date().toISOString()
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

## Key Features

### Automatic Context Injection
- Every processor function receives `$item`, `$json`, and `$itemIndex` automatically
- No need to manually extract these from the item parameter
- Consistent interface across all processing functions

### Defensive Node Data Access
- Automatic retry logic for node data access with exponential backoff
- Handles n8n race conditions when accessing upstream node data
- Validation of node data before passing to processor functions
- Graceful fallback when node data is unavailable

### Smart Parameter Naming
- Node names with spaces/special characters converted to camelCase parameters
- `'Ingestion Sources'` becomes `ingestionSources` parameter
- `'API_Config'` becomes `apiConfig` parameter
- Predictable parameter naming for easy function signatures

## Best Practices

1. **Always use the factory pattern** with `processItemsWithN8N($)`
2. **Leverage automatic context injection** - processor functions receive `$item`, `$json`, `$itemIndex` automatically
3. **Use defensive access for node data** - the framework handles retries and validation
4. **Use descriptive node names** - they become readable parameter names
5. **Enable error logging** during development to see retry attempts and failures
6. **Don't stop on errors** unless critical - let failed items flow through with `$error`
7. **Monitor statistics** to track processing health and node data access issues
8. **Handle null node data gracefully** - use optional chaining and fallbacks

## Defensive Node Access Features

### Automatic Retry Logic
- 3 retry attempts with exponential backoff (50ms, 100ms, 200ms)
- Handles temporary n8n state inconsistencies during workflow execution
- Automatic validation of retrieved node data

### Smart Data Validation
- Validates that node data contains expected structure
- Special validation for source nodes requiring `knowledgeSourceId`
- Logs validation failures and retry attempts when `logErrors: true`

### Multiple Access Methods
- Tries `itemMatching(itemIndex)` first for proper item pairing
- Falls back to `item` for current item access
- Uses `all()[index]` as final fallback with index bounds checking
- Handles missing nodes gracefully

### Example: Node Data Access Patterns

```javascript
// The framework automatically handles these access patterns:
// 1. nodeRef.itemMatching(itemIndex)?.json
// 2. nodeRef.item?.json  
// 3. nodeRef.all()[safeIndex]?.json
// 4. Retry with exponential backoff on failures
// 5. Validation of retrieved data

const result = await processItems(
  inputItems,
  ($item, $json, $itemIndex, sourceNode, configNode) => {
    // sourceNode and configNode are already validated and retried
    // Use defensive access for optional properties
    return {
      sourceId: sourceNode?.knowledgeSourceId || 'unknown',
      maxLength: configNode?.textLimit || 4000,
      hasValidSource: !!sourceNode
    };
  },
  ['Source Node', 'Config Node']
);
```

## Legacy Function (Removed)

**Note**: The legacy `processItemsWithPairing` function has been completely removed from the codebase. All batch processing should now use `processItemsWithN8N($).processItems` for automatic context injection, defensive node access, and better n8n integration. 