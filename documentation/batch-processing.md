# Batch Processing Module

The batch processing module provides robust N8N-optimized utilities for processing arrays of items with node accessor functions, error handling, item pairing, and defensive node data access.

## Import Options

**Individual function imports:**
```javascript
const { processItemsWithPairing } = require('sww-n8n-helpers');
```

**Namespace imports:**
```javascript
const { batch } = require('sww-n8n-helpers');
// Then use: batch.processItemsWithPairing
```

## Core Function: `processItemsWithPairing(items, processor, nodeAccessors, options)`

This function processes n8n items with node accessor functions to preserve itemMatching behavior and ensure reliable data access.

**Parameters:**
- `items` (Array): N8N items from `$input.all()` or `$('NodeName').all()`
- `processor` (Function): Processing function that receives: `($item, $json, $itemIndex, ...nodeData)`
  - `$item`: Full n8n item object
  - `$json`: Item's json data
  - `$itemIndex`: Current item index
  - `...nodeData`: Individual node data from accessor functions in order they're defined
- `nodeAccessors` (Object): Object with node names as keys and accessor functions as values
  - Example: `{ 'Ingestion Sources': (itemIndex) => $('Ingestion Sources').itemMatching(itemIndex)?.json }`
- `options` (Object): Processing options
  - `maintainPairing` (Boolean): Maintain n8n item pairing structure (default: true)
  - `logErrors` (Boolean): Log processing errors (default: true)
  - `stopOnError` (Boolean): Stop processing on first error (default: false)

**Returns:** Object with `{ results, errors, stats }`

**Node Accessor Pattern:**
Node accessors allow you to define exactly how to retrieve data from upstream nodes:
- `'Ingestion Sources': (itemIndex) => $('Ingestion Sources').itemMatching(itemIndex)?.json`
- `'User Settings': (itemIndex) => $('User Settings').item?.json`
- `'API Config': (itemIndex) => $('API Config').all()[0]?.json`

## Code Node Examples

### Basic Item Processing 

```javascript
// Import the function
const { processItemsWithPairing } = require('sww-n8n-helpers');

// Get input items
const inputData = $input.all();

// Process with no additional node data
const result = await processItemsWithPairing(
  inputData,
  // Processor receives: $item, $json, $itemIndex, ...nodeData
  ($item, $json, $itemIndex) => {
    return {
      id: $json.id,
      processedTitle: $json.title.toUpperCase(),
      itemIndex: $itemIndex,
      timestamp: new Date().toISOString()
    };
  },
  {}, // No node accessors needed
  { maintainPairing: true }
);

// Return results (maintains n8n item pairing)
return result.results;
```

### Processing with Data from Other Nodes

```javascript
const { processItemsWithPairing } = require('sww-n8n-helpers');

const inputData = $input.all();

// Define node accessors for reliable data access
const nodeAccessors = {
  'User Settings': (itemIndex) => $('User Settings').itemMatching(itemIndex)?.json,
  'API Config': (itemIndex) => $('API Config').item?.json // Single config for all items
};

const result = await processItemsWithPairing(
  inputData,
  // Processor receives context + data from accessor functions
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
  nodeAccessors,
  {
    maintainPairing: true,
    logErrors: true
  }
);

return result.results;
```

### Async Processing with External APIs

```javascript
const { processItemsWithPairing } = require('sww-n8n-helpers');

const inputData = $input.all();

const result = await processItemsWithPairing(
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
  {}, // No node accessors needed
  {
    maintainPairing: true,
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
const { processItemsWithPairing } = require('sww-n8n-helpers');

const inputData = $input.all();

// Define multiple node accessors
const nodeAccessors = {
  'Knowledge Source': (itemIndex) => $('Knowledge Source').itemMatching(itemIndex)?.json,
  'Processing Config': (itemIndex) => $('Processing Config').item?.json,
  'User Settings': (itemIndex) => $('User Settings').item?.json
};

const result = await processItemsWithPairing(
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
  nodeAccessors,
  {
    maintainPairing: true,
    logErrors: true
  }
);

console.log(`Processed ${result.stats.successful}/${result.stats.total} items`);
return result.results;
```

### Error Handling and Recovery

```javascript
const { processItemsWithPairing } = require('sww-n8n-helpers');

const inputData = $input.all();

const result = await processItemsWithPairing(
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
  {}, // No node accessors needed
  {
    maintainPairing: true,
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
const result = await processItemsWithPairing(/* ... */);

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

### Node Accessor Pattern
- Explicit accessor functions give you full control over how node data is retrieved
- Preserves n8n's `itemMatching()` behavior for proper item pairing
- No magic - you define exactly how to access each node's data
- Supports different access patterns per node (itemMatching, item, all()[index], etc.)

### Flexible Item Pairing
- `maintainPairing: true` (default) returns standard n8n item structure with `pairedItem`
- `maintainPairing: false` returns raw results for simpler data processing
- Error items always maintain pairing information for debugging

## Best Practices

1. **Use explicit node accessors** to define exactly how each node's data should be accessed
2. **Leverage automatic context injection** - processor functions receive `$item`, `$json`, `$itemIndex` automatically
3. **Use `itemMatching()` for proper item pairing** when items need to correspond across nodes
4. **Use `item` access for single/global config** that applies to all items
5. **Enable error logging** during development to debug data access issues
6. **Don't stop on errors** unless critical - let failed items flow through with `$error`
7. **Monitor statistics** to track processing health and data access patterns
8. **Handle null node data gracefully** - use optional chaining and fallbacks in your processor

## Node Accessor Examples

The accessor pattern gives you complete control over how node data is retrieved:

```javascript
const nodeAccessors = {
  // Use itemMatching for item-to-item correspondence
  'Podcast Episodes': (itemIndex) => $('Podcast Episodes').itemMatching(itemIndex)?.json,
  
  // Use item for single/global configuration
  'API Config': (itemIndex) => $('API Config').item?.json,
  
  // Use all() with safe indexing for fallback patterns  
  'Ingestion Sources': (itemIndex) => {
    const items = $('Ingestion Sources').all();
    const safeIndex = Math.min(itemIndex, items.length - 1);
    return items[safeIndex]?.json;
  },
  
  // Custom access patterns for special cases
  'User Settings': (itemIndex) => {
    // Try itemMatching first, fallback to first item
    return $('User Settings').itemMatching(itemIndex)?.json || 
           $('User Settings').all()[0]?.json;
  }
};

const result = await processItemsWithPairing(
  inputItems,
  ($item, $json, $itemIndex, podcastEpisode, apiConfig, ingestionSource, userSettings) => {
    // All node data is retrieved using your custom accessors
    // Use defensive access for optional properties
    return {
      episodeId: podcastEpisode?.guid || 'unknown',
      apiEndpoint: apiConfig?.endpoint || 'https://default.api.com',
      sourceId: ingestionSource?.knowledgeSourceId || null,
      notifications: userSettings?.enableNotifications || false
    };
  },
  nodeAccessors
);
```

## Migration from Legacy Functions

**Note**: The legacy `processItemsWithN8N` function has been removed. All batch processing now uses `processItemsWithPairing` with explicit node accessors for better control and reliability. 