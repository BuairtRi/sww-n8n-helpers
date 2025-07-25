# n8n Built-in Utility Functions

## Overview

n8n provides a comprehensive set of utility functions for common operations, advanced JSON querying, HTTP handling, metadata access, and specialized date/time operations.

## Convenience Functions

### UUID and ID Generation
- `$uuid()` - Generate UUID v4
- `$randomString(length)` - Generate random string
- `$hash(data, algorithm)` - Generate hash (MD5, SHA1, SHA256, etc.)
- `$base64(data)` - Base64 encode
- `$base64Decode(data)` - Base64 decode

### URL and Encoding
- `$urlEncode(string)` - URL encode string
- `$urlDecode(string)` - URL decode string
- `$encodeURIComponent(string)` - Encode URI component
- `$decodeURIComponent(string)` - Decode URI component

### JSON Operations
- `$json(string)` - Parse JSON string
- `$stringify(object)` - Convert object to JSON string
- `$jsonParse(string)` - Safe JSON parsing with error handling
- `$jsonStringify(object, replacer, space)` - Advanced JSON stringification

### Type Checking and Conversion
- `$typeOf(value)` - Get value type
- `$isArray(value)` - Check if array
- `$isObject(value)` - Check if object
- `$isString(value)` - Check if string
- `$toString(value)` - Convert to string

### Utility Examples
```javascript
// Generate unique identifier
{{ $uuid() }}

// Hash sensitive data
{{ $hash($input.json.password, 'sha256') }}

// Encode URL parameters
{{ $urlEncode($input.json.searchQuery) }}

// Safe JSON parsing
{{ $jsonParse($input.json.rawData) || {} }}
```

## JMESPath Functions

### Basic JMESPath
- `$jmespath(data, expression)` - Query JSON data
- `$jp(data, expression)` - Short alias for jmespath

### JMESPath Expressions
```javascript
// Basic property access
{{ $jmespath($input.json, 'user.name') }}

// Array filtering
{{ $jmespath($input.json, 'users[?age > `18`].name') }}

// Array projection
{{ $jmespath($input.json, 'products[*].{name: name, price: price}') }}

// Length and functions
{{ $jmespath($input.json, 'length(items)') }}
```

### Advanced JMESPath Patterns
```javascript
// Conditional selection
{{ $jmespath($input.json, 'users[?status == `active`] | [0]') }}

// Sorting
{{ $jmespath($input.json, 'sort_by(products, &price)') }}

// Grouping with map
{{ $jmespath($input.json, 'group_by(orders, &customer_id)') }}

// Multi-level filtering
{{ $jmespath($input.json, 'orders[?total > `100`].items[?category == `electronics`]') }}
```

### JMESPath Functions
- `length()` - Get array/object length
- `keys()` - Get object keys
- `values()` - Get object values
- `sort()` - Sort array
- `sort_by()` - Sort by expression
- `group_by()` - Group by expression
- `max()` / `min()` - Find maximum/minimum
- `sum()` / `avg()` - Calculate sum/average

## HTTP Node Variables

### Request Information
- `$request.method` - HTTP method (GET, POST, etc.)
- `$request.url` - Full request URL
- `$request.headers` - Request headers object
- `$request.params` - URL parameters
- `$request.query` - Query string parameters
- `$request.body` - Request body

### Response Information
- `$response.statusCode` - HTTP status code
- `$response.headers` - Response headers
- `$response.body` - Response body
- `$response.size` - Response size in bytes

### HTTP Examples
```javascript
// Access specific header
{{ $request.headers['content-type'] }}

// Get query parameter
{{ $request.query.page || 1 }}

// Check response status
{{ $response.statusCode === 200 ? 'Success' : 'Error' }}

// Extract response data
{{ $response.body.data || [] }}
```

### HTTP Error Handling
```javascript
// Handle different status codes
{{ $response.statusCode >= 200 && $response.statusCode < 300 ? 
   $response.body : 
   { error: 'HTTP Error', status: $response.statusCode } }}

// Check for specific headers
{{ $response.headers['content-type']?.includes('application/json') ? 
   $json($response.body) : 
   $response.body }}
```

## n8n Metadata

### Workflow Information
- `$workflow.id` - Workflow identifier
- `$workflow.name` - Workflow name
- `$workflow.active` - Workflow active status
- `$workflow.mode` - Execution mode

### Execution Information
- `$execution.id` - Execution identifier
- `$execution.mode` - Execution mode (manual, trigger, etc.)
- `$execution.startedAt` - Execution start time
- `$execution.resumeUrl` - Resume URL for wait nodes

### User and Environment
- `$user.id` - Current user identifier
- `$user.email` - Current user email
- `$instanceId` - n8n instance identifier
- `$version` - n8n version information

### Metadata Examples
```javascript
// Add workflow context to data
{{ {
  ...data,
  meta: {
    workflowId: $workflow.id,
    executionId: $execution.id,
    processedAt: $now(),
    version: $version
  }
} }}

// Conditional logic based on execution mode
{{ $execution.mode === 'manual' ? 'test-data' : 'production-data' }}
```

## Date/Time Utilities

### Current Time Functions
- `$now()` - Current timestamp
- `$today()` - Today's date at midnight
- `$timestamp()` - Current Unix timestamp
- `$utc()` - Current UTC time

### Timezone Functions
- `$timezone(date, timezone)` - Convert to timezone
- `$utcOffset(date)` - Get UTC offset
- `$isDST(date, timezone)` - Check if daylight saving time

### Date Parsing and Formatting
```javascript
// Parse various date formats
{{ $dateFromFormat('2024-01-15', 'YYYY-MM-DD') }}
{{ $dateFromFormat('15/01/2024', 'DD/MM/YYYY') }}

// Format for different locales
{{ $dateFormat($now(), 'MMMM Do, YYYY', 'en') }}
{{ $dateFormat($now(), 'DD.MM.YYYY', 'de') }}
```

### Business Date Functions
- `$workingDays(startDate, endDate)` - Calculate working days
- `$addWorkingDays(date, days)` - Add working days
- `$nextWorkingDay(date)` - Get next working day
- `$isWorkingDay(date)` - Check if working day
- `$isWeekend(date)` - Check if weekend

### Advanced Date Operations
```javascript
// Calculate age
{{ $dateDiff($now(), $dateFromFormat($input.json.birthDate, 'YYYY-MM-DD'), 'years') }}

// Get quarter
{{ Math.ceil($month($now()) / 3) }}

// Find next occurrence of weekday
{{ $dateAdd($dateStartOf($now(), 'week'), $dayOfWeek === 1 ? 7 : (1 - $dayOfWeek + 7) % 7, 'days') }}

// Business hours check
{{ $hour($now()) >= 9 && $hour($now()) < 17 && $isWorkingDay($now()) }}
```

## Data Validation Utilities

### Validation Functions
- `$validate(data, schema)` - Validate against JSON schema
- `$isEmail(string)` - Validate email format
- `$isUrl(string)` - Validate URL format
- `$isIpAddress(string)` - Validate IP address
- `$isCreditCard(string)` - Validate credit card number

### Custom Validation Patterns
```javascript
// Email validation
{{ /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($input.json.email) }}

// Phone number validation
{{ /^\+?[\d\s\-\(\)]+$/.test($input.json.phone) }}

// Strong password validation
{{ /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test($input.json.password) }}
```

## Crypto and Security

### Hashing Functions
- `$md5(data)` - MD5 hash
- `$sha1(data)` - SHA1 hash
- `$sha256(data)` - SHA256 hash
- `$sha512(data)` - SHA512 hash

### Encryption/Decryption
- `$encrypt(data, key, algorithm)` - Encrypt data
- `$decrypt(data, key, algorithm)` - Decrypt data
- `$hmac(data, key, algorithm)` - HMAC generation

### Security Examples
```javascript
// Generate API signature
{{ $hmac($request.body, $credentials.apiSecret, 'sha256') }}

// Hash sensitive data for storage
{{ $sha256($input.json.userId + $input.json.timestamp) }}

// Generate secure token
{{ $base64($hash($uuid() + $now(), 'sha256')) }}
```

## Performance and Debugging

### Timing Functions
- `$timer()` - Start/stop timer
- `$benchmark(function)` - Benchmark function execution
- `$sleep(milliseconds)` - Pause execution

### Debug Utilities
```javascript
// Performance monitoring
{{ (() => {
  const start = Date.now();
  const result = $expensiveOperation();
  const duration = Date.now() - start;
  return { result, duration };
})() }}

// Memory usage tracking
{{ {
  data: $processData(),
  memory: process.memoryUsage(),
  timestamp: $now()
} }}
```

## Best Practices

### Error Handling
- Always validate data before processing
- Use try-catch blocks for potentially failing operations
- Provide meaningful fallback values

### Performance
- Cache expensive operations
- Use JMESPath for complex JSON queries instead of multiple property accesses
- Minimize data copying and transformation

### Security
- Hash sensitive data before logging
- Validate all external inputs
- Use secure random generation for tokens and IDs

### Maintainability
- Use descriptive variable names in complex expressions
- Break complex operations into smaller, testable parts
- Document complex JMESPath expressions with comments 