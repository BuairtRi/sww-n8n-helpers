# n8n Code Node Best Practices for Data Normalization

## Overview
This guide outlines best practices for creating robust data normalization code nodes in n8n workflows, based on real-world podcast RSS feed processing experience.

## Core Principles

### 1. Item Linking and Pairing
**Always maintain item relationships throughout the workflow**

```javascript
// Good: Preserve item pairing
outputItems.push({
  json: normalizedData,
  pairedItem: itemIndex
});

// Bad: Breaking the chain
return normalizedData; // Loses pairing information
```

**Why it matters:**
- Enables proper error tracking through the workflow
- Allows downstream nodes to reference original data
- Critical for debugging failed items

### 2. Graceful Error Handling
**Never let one bad item break the entire workflow**

```javascript
try {
  // Process item
  const normalized = processItem(item);
  outputItems.push({ json: normalized, pairedItem: index });
} catch (error) {
  // Still output an error item to maintain pairing
  outputItems.push({
    json: {
      _error: {
        type: 'processing_error',
        message: error.message,
        originalData: { id: item.id, title: item.title }
      },
      // Include minimal identifying data
      id: item.id || null,
      title: item.title || 'Unknown'
    },
    pairedItem: index
  });
}
```

### 3. Data Source Management
**Be explicit about where data comes from**

```javascript
// When placed after a specific node
const items = $input.all();  // Gets from previous node

// When needing data from a specific named node
const sourceItems = $('Node Name').all();

// Don't assume data structure - check first
console.log(`Processing ${items.length} items`);
if (items.length > 0) {
  console.log('First item structure:', JSON.stringify(items[0].json, null, 2));
}
```

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

### 4. SQL Safety
**Always provide SQL-safe versions of text fields**

```javascript
function sanitizeForSQL(text) {
  if (!text) return null;
  return text
    .replace(/'/g, "''")      // Escape single quotes
    .replace(/\\/g, "\\\\")   // Escape backslashes
    .replace(/\0/g, "")       // Remove null characters
    .trim();
}

// Provide both versions
const normalized = {
  title: episode.title,
  titleSanitized: sanitizeForSQL(episode.title),
  
  description: cleanDescription,
  descriptionSanitized: sanitizeForSQL(cleanDescription)
};
```

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

## Complete Example Structure

```javascript
// n8n Code Node: Data Normalization Template
const inputItems = $input.all();
const outputItems = [];

// Helper functions
function safeGet(obj, path, defaultValue = null) { /* ... */ }
function truncateText(text, maxLength) { /* ... */ }
function sanitizeForSQL(text) { /* ... */ }

// Process items
for (let i = 0; i < inputItems.length; i++) {
  const item = inputItems[i];
  
  try {
    const normalized = {
      // Core fields
      id: item.json.id || null,
      title: truncateText(item.json.title, 250),
      titleSanitized: sanitizeForSQL(item.json.title),
      
      // Multiple formats
      date: new Date(item.json.date).toISOString(),
      dateFriendly: formatDate(item.json.date),
      
      // Metadata
      _original: { id: item.json.id },
      processingMetadata: {
        normalizedAt: new Date().toISOString(),
        itemIndex: i
      }
    };
    
    // Validate
    if (!normalized.id) {
      normalized._error = { type: 'missing_id' };
    }
    
    outputItems.push({
      json: normalized,
      pairedItem: i
    });
    
  } catch (error) {
    // Error item maintains pairing
    outputItems.push({
      json: {
        _error: {
          type: 'processing_error',
          message: error.message
        },
        id: item.json.id || null
      },
      pairedItem: i
    });
  }
}

return outputItems;
```

## Key Takeaways

1. **Always maintain item pairing** - Critical for n8n's error handling
2. **Handle errors gracefully** - Don't let bad data break the workflow
3. **Provide multiple data formats** - Optimize for different use cases
4. **Sanitize for SQL** - Prevent injection issues
5. **Include debugging metadata** - Makes troubleshooting easier
6. **Use helper functions** - Keep code DRY and maintainable
7. **Validate but don't drop** - Mark invalid items instead of removing them

Following these patterns ensures your normalization nodes are robust, debuggable, and maintain data integrity throughout your n8n workflows.