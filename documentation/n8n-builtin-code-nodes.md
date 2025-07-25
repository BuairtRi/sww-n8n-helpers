# n8n Code Nodes and Expressions

## Overview

This document covers the specific usage of n8n built-in functions within Code nodes and expressions, including syntax patterns, execution context, and advanced features like LangChain integration for self-hosted n8n instances.

## Expression Syntax

### Basic Expression Structure
```javascript
// Single expression
{{ $input.json.name }}

// Complex expression with operations
{{ $upper($trim($input.json.firstName + ' ' + $input.json.lastName)) }}

// Multi-line expressions
{{
  $map($input.all(), item => ({
    id: item.json.id,
    name: $upper(item.json.name),
    timestamp: $now()
  }))
}}
```

### Expression Context Rules
- Expressions are wrapped in `{{ }}` 
- Use JavaScript syntax within expressions
- All n8n built-in functions are available
- Access to `$input`, `$node`, and context variables
- Return values are automatically handled

### Conditional Expressions
```javascript
// Ternary operators
{{ $input.json.age >= 18 ? 'adult' : 'minor' }}

// Null coalescing
{{ $input.json.email || 'no-email@example.com' }}

// Complex conditions
{{ 
  $input.json.type === 'premium' && $input.json.verified ? 
    $input.json.premiumFeatures : 
    $input.json.basicFeatures 
}}
```

## Code Node Environment

### Available Variables
```javascript
// Input data access
const inputData = $input.all();
const firstItem = $input.first();
const currentItem = $input.item;

// Node output access
const previousData = $node["Previous Node"].all();
const specificNode = $('Node Name').json;

// Execution context
const executionId = $executionId;
const workflowId = $workflowId;
const nodeId = $nodeId;
```

### Return Patterns
```javascript
// Return single item
return { 
  json: { 
    processedData: transformedData,
    timestamp: $now()
  } 
};

// Return multiple items
return $input.all().map(item => ({
  json: {
    ...item.json,
    processed: true,
    processedAt: $now()
  }
}));

// Return with binary data
return {
  json: { status: 'success' },
  binary: {
    data: {
      data: Buffer.from(csvData),
      mimeType: 'text/csv',
      fileName: 'export.csv'
    }
  }
};
```

### Error Handling in Code Nodes
```javascript
try {
  const result = $risky_operation($input.json);
  return { json: { success: true, result } };
} catch (error) {
  return { 
    json: { 
      success: false, 
      error: error.message,
      timestamp: $now()
    } 
  };
}
```

## Advanced Code Node Patterns

### Async Operations
```javascript
// Async function support
return new Promise(async (resolve) => {
  try {
    const results = await Promise.all(
      $input.all().map(async (item) => {
        const processed = await someAsyncOperation(item.json);
        return { json: processed };
      })
    );
    resolve(results);
  } catch (error) {
    resolve([{ json: { error: error.message } }]);
  }
});
```

### Batch Processing
```javascript
// Process items in batches
const batchSize = 10;
const items = $input.all();
const results = [];

for (let i = 0; i < items.length; i += batchSize) {
  const batch = items.slice(i, i + batchSize);
  const batchResults = batch.map(item => ({
    json: {
      ...item.json,
      batchNumber: Math.floor(i / batchSize) + 1,
      processed: true
    }
  }));
  results.push(...batchResults);
}

return results;
```

### Data Validation
```javascript
// Input validation schema
const requiredFields = ['name', 'email', 'id'];
const validItems = [];
const invalidItems = [];

$input.all().forEach(item => {
  const missingFields = requiredFields.filter(field => !item.json[field]);
  
  if (missingFields.length === 0) {
    validItems.push({ json: { ...item.json, status: 'valid' } });
  } else {
    invalidItems.push({ 
      json: { 
        ...item.json, 
        status: 'invalid', 
        missingFields 
      } 
    });
  }
});

return [...validItems, ...invalidItems];
```

## LangChain Methods

### Document Processing
```javascript
// LangChain document operations
const documents = $input.all().map(item => ({
  pageContent: item.json.content,
  metadata: {
    source: item.json.source,
    timestamp: $now(),
    id: item.json.id
  }
}));

// Text splitting
const splitDocuments = $langchain.textSplitter.split(documents, {
  chunkSize: 1000,
  chunkOverlap: 200
});

return splitDocuments.map(doc => ({ json: doc }));
```

### Vector Operations
```javascript
// Vector embeddings
const texts = $input.all().map(item => item.json.text);
const embeddings = await $langchain.embeddings.embed(texts);

return texts.map((text, index) => ({
  json: {
    text: text,
    embedding: embeddings[index],
    dimensions: embeddings[index].length
  }
}));
```

### Chain Execution
```javascript
// LangChain chain operations
const chain = $langchain.createChain({
  type: 'sequential',
  steps: [
    { type: 'prompt', template: $input.json.promptTemplate },
    { type: 'llm', model: 'gpt-3.5-turbo' },
    { type: 'parser', format: 'json' }
  ]
});

const result = await chain.invoke({
  input: $input.json.userInput,
  context: $node["Context"].json
});

return { json: result };
```

### Memory Management
```javascript
// LangChain memory operations
const memory = $langchain.memory.get($executionId);

// Add to memory
memory.add({
  role: 'user',
  content: $input.json.message,
  timestamp: $now()
});

// Retrieve conversation history
const history = memory.getMessages(10); // Last 10 messages

return { 
  json: { 
    response: processedResponse,
    conversationHistory: history
  } 
};
```

## Performance Optimization

### Efficient Data Access
```javascript
// Cache node outputs when used multiple times
const userData = $node["User Data"].all();
const settingsData = $node["Settings"].json;

// Use specific property access
const userIds = userData.map(user => user.json.id);
const activeUsers = userData.filter(user => user.json.active);

// Avoid repeated expensive operations
const processedData = $input.all().map(item => {
  const enrichedData = enrichFunction(item.json); // Call once per item
  return { json: enrichedData };
});
```

### Memory Management
```javascript
// Efficient array processing
const results = [];
const inputItems = $input.all();

// Process items one at a time for large datasets
inputItems.forEach(item => {
  const processed = processItem(item.json);
  results.push({ json: processed });
  
  // Clear references for garbage collection
  item = null;
});

return results;
```

### Streaming for Large Data
```javascript
// Handle large datasets with streaming
const CHUNK_SIZE = 1000;
const allItems = $input.all();

if (allItems.length > CHUNK_SIZE) {
  // Process in chunks
  const chunks = [];
  for (let i = 0; i < allItems.length; i += CHUNK_SIZE) {
    const chunk = allItems.slice(i, i + CHUNK_SIZE);
    chunks.push(processChunk(chunk));
  }
  return chunks.flat();
} else {
  return processAllItems(allItems);
}
```

## Debugging and Development

### Debug Utilities
```javascript
// Debug information
const debugInfo = {
  nodeId: $nodeId,
  executionId: $executionId,
  inputCount: $input.all().length,
  timestamp: $now(),
  memory: process.memoryUsage?.() || 'N/A'
};

console.log('Debug Info:', debugInfo);

// Add debug data to output
return $input.all().map(item => ({
  json: {
    ...item.json,
    debug: debugInfo
  }
}));
```

### Error Tracking
```javascript
// Comprehensive error handling
const errors = [];
const results = [];

$input.all().forEach((item, index) => {
  try {
    const processed = complexOperation(item.json);
    results.push({ json: processed });
  } catch (error) {
    errors.push({
      index,
      item: item.json,
      error: error.message,
      stack: error.stack
    });
    
    // Add error item to results
    results.push({
      json: {
        ...item.json,
        processingError: error.message,
        timestamp: $now()
      }
    });
  }
});

// Log errors for monitoring
if (errors.length > 0) {
  console.error('Processing errors:', errors);
}

return results;
```

### Performance Monitoring
```javascript
// Execution time tracking
const startTime = Date.now();
const performanceMarks = {};

// Mark start of expensive operation
performanceMarks.dataFetch = Date.now();
const data = fetchExpensiveData();
performanceMarks.dataFetchEnd = Date.now();

// Mark processing phase
performanceMarks.processing = Date.now();
const results = processData(data);
performanceMarks.processingEnd = Date.now();

const totalTime = Date.now() - startTime;
const timing = {
  total: totalTime,
  dataFetch: performanceMarks.dataFetchEnd - performanceMarks.dataFetch,
  processing: performanceMarks.processingEnd - performanceMarks.processing
};

return results.map(result => ({
  json: {
    ...result,
    performance: timing
  }
}));
```

## Best Practices for Self-Hosted n8n

### Resource Management
- Monitor memory usage in long-running workflows
- Use streaming for large data processing
- Implement proper error boundaries
- Cache expensive operations appropriately

### Security Considerations
- Validate all external inputs
- Sanitize data before processing
- Use environment variables for sensitive configuration
- Implement rate limiting for external API calls

### Scalability Patterns
- Design for horizontal scaling
- Use queue-based processing for high-volume workflows
- Implement circuit breakers for external dependencies
- Monitor and alert on performance metrics

### Maintenance and Monitoring
```javascript
// Health check pattern
const healthCheck = {
  timestamp: $now(),
  workflowId: $workflowId,
  executionId: $executionId,
  status: 'healthy',
  metrics: {
    itemsProcessed: $input.all().length,
    processingTime: 0, // Set during processing
    memoryUsage: process.memoryUsage?.()
  }
};

// Include health data in output
return results.map(item => ({
  ...item,
  healthCheck: healthCheck
}));
``` 