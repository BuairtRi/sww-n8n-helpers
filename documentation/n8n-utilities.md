# N8N Utilities

N8N-specific helper functions for extracting and managing node data within N8N workflows. These utilities handle the N8N execution context properly and provide robust error handling for node data operations.

## Overview

The N8N utilities are designed to work **within N8N Code nodes** and require the N8N `$` function to be passed as a parameter. This ensures proper access to node data while maintaining clean separation between utility logic and N8N-specific functionality.

## Core Functions

### `extractNodeData($fn, nodeNames, currentItem, itemIndex)`

Extract data from one or more N8N nodes with proper item indexing and error handling.

**Parameters:**

- `$fn` (Function): N8N's `$` function from Code node context
- `nodeNames` (string|Array|Object): Node name(s) to extract data from
- `currentItem` (Object, optional): Current item context
- `itemIndex` (number, optional): Index for item matching (default: 0)

**Returns:** Object with extracted node data

```javascript
const { createN8NHelpers } = require('sww-n8n-helpers');
const { extractNodeData } = createN8NHelpers($);

// Extract from multiple nodes
const nodeData = extractNodeData({
  episodes: 'Podcast Episodes',
  sources: 'Data Sources'
}, item, index);

// Access extracted data
const episode = nodeData.episodes;
const source = nodeData.sources;
```

### `extractAllNodeData($fn, nodeNames, options)`

Extract all items from specified N8N nodes with optional metadata.

**Parameters:**

- `$fn` (Function): N8N's `$` function
- `nodeNames` (string|Array|Object): Node name(s) to extract from
- `options` (Object): Extraction options
  - `includeMetadata` (boolean): Include count and status metadata

```javascript
const { extractAllNodeData } = createN8NHelpers($);

// Get all items with metadata
const allData = extractAllNodeData(['Episodes', 'Sources'], {
  includeMetadata: true
});

console.log(`Found ${allData.Episodes_metadata.count} episodes`);
```

### `getNodeValue($fn, nodeName, path, fallback, itemIndex)`

Safely extract a specific value from a node using dot notation paths.

**Parameters:**

- `$fn` (Function): N8N's `$` function
- `nodeName` (string): Name of the node
- `path` (string): Dot notation path (default: 'json')
- `fallback` (any): Fallback value if path not found
- `itemIndex` (number): Index for item matching

```javascript
const { getNodeValue } = createN8NHelpers($);

// Get specific values with fallbacks
const title = getNodeValue('Episodes', 'json.title', 'Untitled', index);
const duration = getNodeValue('Episodes', 'json.duration', 0, index);
```

### `checkNodeAvailability($fn, nodeNames)`

Check if nodes exist and contain data.

```javascript
const { checkNodeAvailability } = createN8NHelpers($);

const status = checkNodeAvailability(['Episodes', 'Sources']);

if (!status.hasData.Episodes) {
  console.warn('No episode data available');
}
```

## Helper Function: `createN8NHelpers($fn)`

Creates N8N-ready helper functions with the `$` function pre-bound for convenience.

```javascript
const { createN8NHelpers } = require('sww-n8n-helpers');

// Create helpers at the start of your N8N Code node
const n8nHelpers = createN8NHelpers($);
const { 
  extractNodeData, 
  extractAllNodeData, 
  getNodeValue, 
  checkNodeAvailability 
} = n8nHelpers;

// Now use without passing $ repeatedly
const data = extractNodeData(['Node1', 'Node2'], item, index);
```

## Usage Patterns

### Basic Node Data Extraction

```javascript
const { createN8NHelpers } = require('sww-n8n-helpers');
const { extractNodeData } = createN8NHelpers($);

const results = $input.all().map((item, index) => {
  const nodeData = extractNodeData({
    podcast: 'Podcast Data',
    metadata: 'Episode Metadata'
  }, item, index);
  
  return {
    title: nodeData.podcast?.title || 'Unknown',
    duration: nodeData.metadata?.duration || 0
  };
});
```

### Error-Safe Data Processing

```javascript
const { createN8NHelpers } = require('sww-n8n-helpers');
const { extractNodeData, checkNodeAvailability } = createN8NHelpers($);

// Check availability first
const status = checkNodeAvailability(['Required Node', 'Optional Node']);

if (!status.hasData['Required Node']) {
  throw new Error('Required node has no data');
}

// Process with confidence
const data = extractNodeData(['Required Node', 'Optional Node']);
```

### Batch Processing with Node Data

```javascript
const { 
  processItemsWithPairing, 
  createN8NHelpers 
} = require('sww-n8n-helpers');

const { extractNodeData } = createN8NHelpers($);

const results = processItemsWithPairing($input.all(), (item, index) => {
  const nodeData = extractNodeData({
    source: 'Data Source',
    config: 'Configuration'
  }, item, index);
  
  // Process using extracted data
  return processData(nodeData.source, nodeData.config);
});
```

## Error Handling

All N8N utilities include comprehensive error handling:

- **Missing nodes**: Returns `null` with console warnings
- **Invalid indices**: Falls back to first item or `null`
- **Malformed data**: Returns fallback values
- **Node execution errors**: Catches and logs errors gracefully

```javascript
// Safe extraction - handles all error cases
const data = extractNodeData('Potentially Missing Node', item, index);

if (!data['Potentially Missing Node']) {
  console.log('Node data unavailable, using defaults');
  // Handle gracefully
}
```

## Item Indexing

The utilities properly handle N8N's item indexing using `itemMatching(index)`:

```javascript
// ✅ Correct: Gets item at specific index
extractNodeData('Node Name', item, index);

// ❌ Incorrect: Always gets first item
extractNodeData('Node Name', item, 0);
```

This ensures each loop iteration gets the corresponding item from referenced nodes, not just the first item repeatedly.

## Best Practices

1. **Create helpers once**: Use `createN8NHelpers($)` at the start of your Code node
2. **Pass item index**: Always pass the current `index` to get correct item pairing
3. **Check availability**: Use `checkNodeAvailability()` for critical nodes
4. **Handle nulls**: Always provide fallback values for missing data
5. **Use descriptive aliases**: Use object mapping for clearer code

```javascript
// ✅ Good practices demonstrated
const { createN8NHelpers } = require('sww-n8n-helpers');
const helpers = createN8NHelpers($);

const results = processItemsWithPairing($input.all(), (item, index) => {
  // Check critical nodes first
  const status = helpers.checkNodeAvailability(['Critical Data']);
  if (!status.hasData['Critical Data']) {
    return { _error: 'Missing critical data' };
  }
  
  // Extract with descriptive aliases
  const nodeData = helpers.extractNodeData({
    episode: 'Podcast Episodes',
    metadata: 'Episode Metadata',
    config: 'Processing Config'
  }, item, index);
  
  // Use fallbacks for optional data
  const title = nodeData.episode?.title || 'Untitled Episode';
  const duration = nodeData.metadata?.duration || 0;
  
  return { title, duration, processed: true };
});
```

## Integration with Other Utilities

N8N utilities work seamlessly with other sww-n8n-helpers:

```javascript
const { 
  createN8NHelpers,
  processItemsWithPairing,
  createFallbackChain,
  generateInsertStatement
} = require('sww-n8n-helpers');

const { extractNodeData } = createN8NHelpers($);

const results = processItemsWithPairing($input.all(), (item, index) => {
  const nodeData = extractNodeData(['Episodes', 'Sources'], item, index);
  
  // Use fallback chains on extracted data
  const title = createFallbackChain(nodeData.Episodes, ['title', 'name'], 'Untitled');
  
  // Generate SQL with extracted data
  const sql = generateInsertStatement('episodes', {
    title: title,
    sourceId: nodeData.Sources?.id
  });
  
  return { sql, nodeData };
});
```
