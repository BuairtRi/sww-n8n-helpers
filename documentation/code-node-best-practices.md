# n8n Code Node Best Practices for Data Processing

## Overview
This guide outlines best practices for creating robust data processing code nodes in n8n workflows using modern batch processing patterns with `sww-n8n-helpers`. These patterns provide automatic error handling, context injection, and maintain n8n item pairing.

## Modern Approach: Use sww-n8n-helpers Batch Processing

### 1. Automatic Item Pairing and Error Handling
**Use `processItemsWithN8N($)` for automatic context injection and error handling**

```javascript
const { processItemsWithN8N } = require('sww-n8n-helpers');
const { processItems } = processItemsWithN8N($);

const inputItems = $input.all();

// Automatic item pairing and error handling
const result = await processItems(
  inputItems,
  ($item, $json, $itemIndex) => {
    // Process individual item - errors are automatically handled
    return {
      id: $json.id,
      title: $json.title?.toUpperCase(),
      processedAt: new Date().toISOString(),
      itemIndex: $itemIndex
    };
  }
);

// Returns results with automatic pairing maintained
return result.results;
```

**Benefits:**
- Automatic item pairing maintenance
- Built-in error handling and statistics
- Context injection (`$item`, `$json`, `$itemIndex`)
- No manual try/catch blocks needed
- Defensive node data access with retries

### 2. Multi-Node Data Access
**Use automatic node data injection for accessing multiple data sources**

```javascript
const { processItemsWithN8N } = require('sww-n8n-helpers');
const { processItems } = processItemsWithN8N($);

const inputItems = $input.all();

// Automatic extraction of data from other nodes with retry logic
const result = await processItems(
  inputItems,
  // Node data automatically injected as camelCase parameters
  ($item, $json, $itemIndex, knowledgeSource, userSettings) => {
    return {
      id: $json.id,
      title: $json.title,
      // Defensive access to node data (automatically retried and validated)
      sourceId: knowledgeSource?.knowledgeSourceId || null,
      userNotifications: userSettings?.enableNotifications || false,
      processedAt: new Date().toISOString()
    };
  },
  ['Knowledge Source', 'User Settings'], // Automatically converted to camelCase params
  { logErrors: true }
);

return result.results;
```

**Benefits:**
- Automatic retry logic for node data access
- Node name to camelCase parameter conversion
- Built-in validation and defensive access
- No manual `$('Node Name')` calls needed

## Data Normalization Patterns

### 1. Safe Property Access
**Use helper functions to handle nested/missing data**

```javascript
function safeGet(obj, path, defaultValue = null) {
  return path.split('.').reduce((curr, prop) => 
    (curr && curr[prop] !== undefined) ? curr[prop] : defaultValue, obj);
}

// Usage
const author = safeGet(episode, 'itunes.author') || 
               safeGet(episode, 'dc:creator') || 
               'Unknown';
```

### 2. Multiple Output Formats
**Provide data in formats optimized for different uses**

```javascript
const normalized = {
  // Original format for processing
  publicationDate: date.toISOString(),
  
  // Friendly format for display
  publicationDateFriendly: formatFriendlyDate(date),
  
  // Duration for calculations
  duration: 3750,  // seconds
  
  // Duration for display
  durationFriendly: "1 hour and 2 minutes"
};
```

### 3. Text Processing
**Handle various text lengths and formats appropriately**

```javascript
function truncateText(text, maxLength = 4000) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

function cleanHtml(html) {
  if (!html) return null;
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Different lengths for different purposes
const normalized = {
  description: truncateText(cleanHtml(raw.content), 4000),      // Full storage
  summary: truncateText(raw.contentSnippet, 2000),              // Email digests
  slackSummary: truncateText(raw.contentSnippet, 1000),        // Slack messages
};
```

### 4. SQL Safety with tsqlstring
**Use sww-n8n-helpers SQL sanitization (powered by tsqlstring) for robust SQL injection prevention**

```javascript
const { sanitizeItemsBatch } = require('sww-n8n-helpers');

// Modern approach: Batch sanitization with tsqlstring
const sqlSafeResults = sanitizeItemsBatch(inputItems, {
  fieldsToProcess: ['title', 'description', 'author'],
  includeValidation: true,
  maintainPairing: true
});

// Or individual field sanitization
const { sanitizeForSQL, sanitizeByFieldType } = require('sww-n8n-helpers');

const result = await processItems(
  inputItems,
  ($item, $json, $itemIndex) => {
    return {
      title: $json.title,
      // Uses tsqlstring internally for T-SQL/SQL Server safety
      titleSanitized: sanitizeByFieldType($json.title, 'title'),
      
      description: $json.description,
      descriptionSanitized: sanitizeForSQL($json.description, { maxLength: 4000 })
    };
  }
);
```

**⚠️ CRITICAL**: Manual SQL escaping is dangerous and incomplete. Always use the sww-n8n-helpers SQL functions which rely on `tsqlstring` for proper T-SQL/SQL Server escaping.

## Data Validation Strategies

### 1. Required Field Validation
**Mark invalid items but don't drop them**

```javascript
if (!normalized.title || !normalized.audioUrl) {
  normalized._error = {
    type: 'validation_error',
    message: 'Missing required fields',
    missingFields: {
      title: !normalized.title,
      audioUrl: !normalized.audioUrl
    }
  };
  // Still output the item
  outputItems.push({ json: normalized, pairedItem: index });
  continue;
}
```

### 2. Fallback Chains
**Provide multiple fallback options for important fields**

```javascript
const normalized = {
  // Try multiple sources for important data
  author: episode.author || 
          safeGet(episode, 'itunes.author') || 
          episode.creator || 
          safeGet(episode, 'dc:creator') ||
          'Unknown',
          
  // Image from various possible locations
  image: safeGet(episode, 'itunes.image') || 
         safeGet(episode, 'itunes.image.href') ||
         safeGet(episode, 'image.url') ||
         safeGet(episode, 'media:thumbnail.url') ||
         null
};
```

## Metadata and Debugging

### 1. Processing Metadata
**Include metadata to help with debugging and monitoring**

```javascript
const normalized = {
  // ... main data fields ...
  
  processingMetadata: {
    normalizedAt: new Date().toISOString(),
    sourceNode: 'RSS Feed Reader',
    hasDescription: !!episode.description,
    hasSummary: !!episode.summary,
    itemIndex: index,
    validationPassed: !hasErrors
  }
};
```

### 2. Original Data Preservation
**Keep reference to original data for debugging**

```javascript
const normalized = {
  // ... normalized fields ...
  
  _original: {
    id: episode.id,
    title: episode.title,
    link: episode.link
  },
  
  // Store complex metadata as JSON string
  rawMetadata: JSON.stringify({
    originalGuid: episode.guid,
    customFields: episode.customFields || {},
    categories: episode.categories || []
  })
};
```

## Performance Considerations

### 1. Efficient Lookups
**Use Maps for O(1) lookups when matching data**

```javascript
// When you need to match items by ID
const itemsByGuid = new Map();
sourceItems.forEach((item, index) => {
  const guid = item.json.guid;
  if (guid) {
    itemsByGuid.set(guid, { item, index });
  }
});

// Fast lookup
const match = itemsByGuid.get(searchGuid);
```

### 2. Console Logging
**Use strategic logging for debugging without overwhelming output**

```javascript
console.log(`Processing ${items.length} items`);

// Log first item structure for debugging
if (items.length > 0 && process.env.DEBUG) {
  console.log('First item structure:', JSON.stringify(items[0].json, null, 2));
}

// Log errors with context
console.error(`Failed to process item: ${error.message}`, {
  itemId: item.id,
  itemTitle: item.title
});
```

## Modern Complete Example

```javascript
// n8n Code Node: Modern Data Processing with sww-n8n-helpers
const { processItemsWithN8N, truncateWithSeparator, validateAndFormatDate } = require('sww-n8n-helpers');
const { processItems } = processItemsWithN8N($);

const inputItems = $input.all();

// Process with automatic error handling and context injection
const result = await processItems(
  inputItems,
  ($item, $json, $itemIndex, sourceConfig, userSettings) => {
    // Validation with automatic error handling
    if (!$json.id) {
      throw new Error('Missing required ID field');
    }
    
    return {
      // Core fields with helper functions
      id: $json.id,
      title: truncateWithSeparator($json.title, 250, ' '),
      
      // Date handling
      date: validateAndFormatDate($json.date),
      
      // Node data with defensive access
      maxLength: sourceConfig?.textLimit || 4000,
      enableNotifications: userSettings?.notifications || false,
      
      // Processing metadata
      processingMetadata: {
        processedAt: new Date().toISOString(),
        itemIndex: $itemIndex,
        hasSourceConfig: !!sourceConfig
      }
    };
  },
  ['Source Config', 'User Settings'], // Automatic node data injection
  {
    logErrors: true,
    stopOnError: false
  }
);

// Check processing statistics
console.log(`Processed: ${result.stats.successful}/${result.stats.total}`);
if (result.errors.length > 0) {
  console.log(`Errors: ${result.errors.length}`);
  result.errors.forEach(error => {
    console.log(`- Item ${error.itemIndex}: ${error.message}`);
  });
}

return result.results;
```

### SQL-Safe Version

```javascript
// For data going to SQL Server: Use batch sanitization
const { processItemsWithN8N, sanitizeItemsBatch } = require('sww-n8n-helpers');

// First: Process and normalize data
const { processItems } = processItemsWithN8N($);
const normalizedResult = await processItems(
  $input.all(),
  ($item, $json, $itemIndex) => ({
    id: $json.id,
    title: $json.title,
    description: $json.description,
    author: $json.author,
    url: $json.url
  })
);

// Second: SQL sanitization with tsqlstring
const sqlSafeResults = sanitizeItemsBatch(
  normalizedResult.results.map(item => item.json),
  {
    fieldMappings: {
      title: { type: 'title', maxLength: 250 },
      description: { type: 'content', maxLength: 4000 },
      author: { type: 'name', maxLength: 500 },
      url: { type: 'url', maxLength: 2000 }
    },
    includeValidation: true,
    maintainPairing: true
  }
);

return sqlSafeResults;
```

## Key Takeaways

1. **Use `processItemsWithN8N($)`** - Modern batch processing with automatic error handling
2. **Leverage automatic context injection** - Get `$item`, `$json`, `$itemIndex` automatically  
3. **Use multi-node data access** - Let the framework handle defensive node data retrieval
4. **Use sww-n8n-helpers SQL functions** - Critical dependency on `tsqlstring` for SQL Server safety
5. **Rely on automatic item pairing** - No manual pairing management needed
6. **Let errors flow through** - Framework handles error items while maintaining pairing
7. **Monitor processing statistics** - Use `result.stats` and `result.errors` for insights
8. **Use helper functions from sww-n8n-helpers** - Built-in text processing, validation, and formatting

**Migration Path**: Replace manual for-loops and try/catch blocks with `processItemsWithN8N($).processItems()` for automatic error handling, context injection, and defensive node data access.

Following these modern patterns ensures your processing nodes are robust, maintainable, and leverage the full power of the sww-n8n-helpers framework.