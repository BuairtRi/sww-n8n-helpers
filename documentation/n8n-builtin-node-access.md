# n8n Built-in Node Access Functions

## Overview

n8n provides powerful functions to access data from the current node's input and from other nodes in the workflow. These functions enable seamless data flow and transformation between workflow steps.

## Current Node Input Access

### Primary Input Functions
- `$input` - Access the complete input data object
- `$input.all()` - Get all input items as array
- `$input.first()` - Get first input item
- `$input.last()` - Get last input item
- `$input.item` - Get current item being processed
- `$input.params` - Access node parameters

### Input Data Properties
- `$input.json` - JSON data from input
- `$input.binary` - Binary data from input
- `$input.context` - Input context information
- `$input.meta` - Metadata about input

### Input Filtering and Selection
```javascript
// Get specific item by index
$input.all()[0]

// Filter input items
$input.all().filter(item => item.json.status === 'active')

// Map over input items
$input.all().map(item => item.json.name)

// Get item property safely
$input.item.json?.user?.email || 'no-email'
```

### Working with Multiple Input Items
```javascript
// Process all input items
{{ $input.all().map(item => ({
  id: item.json.id,
  name: item.json.name,
  processed: true
})) }}

// Aggregate input data
{{ {
  total: $input.all().length,
  sum: $input.all().reduce((acc, item) => acc + item.json.amount, 0)
} }}
```

## Output from Other Nodes

### Node Reference Functions
- `$node["NodeName"]` - Access specific node output
- `$('NodeName')` - Alternative syntax for node access
- `$runIndex` - Current execution run index
- `$itemIndex` - Current item index being processed

### Node Output Properties
- `$node["NodeName"].json` - JSON output from node
- `$node["NodeName"].binary` - Binary output from node
- `$node["NodeName"].context` - Node context
- `$node["NodeName"].params` - Node parameters used

### Multiple Items from Nodes
```javascript
// Get all items from a node
$node["HTTP Request"].all()

// Get first item from a node
$node["HTTP Request"].first()

// Get last item from a node
$node["HTTP Request"].last()

// Get specific item by index
$node["HTTP Request"].all()[2]
```

### Working with Node Collections
```javascript
// Map over node output
{{ $node["API Call"].all().map(item => item.json.result) }}

// Filter node output
{{ $node["Database"].all().filter(item => item.json.active === true) }}

// Combine outputs from multiple nodes
{{ [
  ...$node["Source1"].all(),
  ...$node["Source2"].all()
] }}
```

## Advanced Node Access Patterns

### Conditional Node Access
```javascript
// Access node conditionally
{{ $node["Conditional Node"]?.json || $node["Fallback Node"].json }}

// Check if node has output
{{ $node["Optional Node"].all().length > 0 ? 
   $node["Optional Node"].first().json : 
   null }}
```

### Cross-Node Data Correlation
```javascript
// Correlate data between nodes
{{ $node["Users"].all().map(user => ({
  ...user.json,
  orders: $node["Orders"].all()
    .filter(order => order.json.userId === user.json.id)
    .map(order => order.json)
})) }}
```

### Node Output Aggregation
```javascript
// Aggregate data from multiple nodes
{{
  total: $node["Sales"].all().reduce((sum, item) => sum + item.json.amount, 0),
  count: $node["Sales"].all().length,
  average: $node["Sales"].all().reduce((sum, item) => sum + item.json.amount, 0) / $node["Sales"].all().length
}}
```

## Expression Context Variables

### Execution Context
- `$executionId` - Unique execution identifier
- `$workflowId` - Current workflow identifier
- `$runIndex` - Current run index (0-based)
- `$itemIndex` - Current item index (0-based)
- `$prevNode` - Previous node information

### Node Context
- `$nodeId` - Current node identifier
- `$nodeName` - Current node name
- `$mode` - Execution mode (manual, trigger, etc.)
- `$resumeUrl` - Resume URL for wait nodes

### Environment Context
```javascript
// Check execution mode
{{ $mode === 'manual' ? 'Test data' : 'Production data' }}

// Use execution ID for tracking
{{ `Processing execution: ${$executionId}` }}

// Item-specific processing
{{ `Processing item ${$itemIndex + 1} of ${$input.all().length}` }}
```

## Error Handling and Safety

### Safe Property Access
```javascript
// Safe navigation for nested properties
{{ $node["API"]?.json?.data?.user?.name || 'Unknown' }}

// Check if node exists before access
{{ $node["Optional Node"] ? $node["Optional Node"].json : null }}

// Fallback for missing data
{{ $input.json.email || $node["Default"].json.fallbackEmail }}
```

### Validation Patterns
```javascript
// Validate input before processing
{{ $input.json && $input.json.id ? 
   $input.json : 
   { error: 'Invalid input data' } }}

// Check for required fields
{{ ['name', 'email'].every(field => $input.json[field]) ? 
   'Valid' : 'Missing required fields' }}
```

## Data Flow Examples

### Simple Data Passing
```javascript
// Pass specific fields between nodes
{{ {
  userId: $node["User Lookup"].json.id,
  productId: $input.json.productId,
  timestamp: $now()
} }}
```

### Data Enrichment
```javascript
// Enrich input with data from other nodes
{{ {
  ...$input.json,
  userDetails: $node["User Details"].json,
  preferences: $node["User Preferences"].all()
} }}
```

### Data Transformation Pipeline
```javascript
// Transform data through multiple steps
{{ $node["Raw Data"].all()
   .map(item => item.json)
   .filter(data => data.active === true)
   .map(data => ({
     id: data.id,
     name: data.name.toUpperCase(),
     processed: true,
     processedAt: $now()
   }))
}}
```

## Best Practices

### Performance Considerations
- Cache node outputs in variables when used multiple times
- Use specific property access instead of loading entire objects
- Filter data early in the pipeline to reduce processing overhead

### Data Consistency
- Always check for data existence before accessing properties
- Use consistent data structures across nodes
- Implement fallback values for optional data

### Debugging and Monitoring
```javascript
// Add debug information
{{ {
  data: $input.json,
  debug: {
    nodeId: $nodeId,
    executionId: $executionId,
    itemIndex: $itemIndex,
    inputCount: $input.all().length
  }
} }}
```

### Memory Management
- Avoid loading large datasets unnecessarily
- Use streaming approaches for large data sets
- Clean up temporary variables and unused references 