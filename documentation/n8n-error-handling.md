# n8n Node Error Handling Documentation

## Overview

This document summarizes n8n's built-in error handling capabilities for nodes and workflows, compiled from official documentation and known issues as of 2024.

## Node-Level Error Handling Options

### 1. Error Handling Settings

Each n8n node can be configured with the following error handling options:

#### **On Error**
- **Stop Workflow** (default) - Stops execution when an error occurs
- **Continue** - Continues execution, passing error item to next node
- **Continue (using error output)** - Routes errors to a separate output path

#### **Continue on Fail** 
- When enabled, allows workflow to continue even if the node encounters an error
- Useful for non-critical operations or when handling errors downstream

#### **Always Output Data**
- Ensures the node outputs data even when no results are found
- Prevents workflow stoppage due to empty results
- Already implemented in some nodes (e.g., SQL query nodes)

### 2. Retry Configuration

#### **Retry on Fail**
- Automatically retries failed operations
- Configurable number of attempts
- Configurable delay between attempts

#### **Max Tries**
- Number of retry attempts (default: 5)
- Only applies when "Retry on Fail" is enabled

#### **Wait Between Tries (ms)**
- Delay in milliseconds between retry attempts
- Can be used for exponential backoff strategies

### Important Known Issues (2024)

1. **Retry on Fail + Continue Compatibility Issue**
   - "Retry on Fail" only works properly when "On Error" is set to "Stop Workflow"
   - Using with "Continue" or "Continue (using error output)" causes unexpected behavior:
     - Node returns error even after successful retry
     - Retries continue until max attempts regardless of success
     - All input items are retried instead of just failed ones

2. **HTTP Request Node Specific Issues**
   - When retry fails, it may retry all items instead of just the failed one
   - May execute maximum retries even when requests succeed

## Workflow-Level Error Handling

### 1. Error Workflows

```json
{
  "settings": {
    "errorWorkflow": "workflowId"
  }
}
```

- Triggered when a workflow execution fails
- Must contain an Error Trigger node
- Cannot be tested with manual execution
- Receives error context including:
  - Workflow ID
  - Execution ID
  - Error message
  - Node that failed

### 2. Error Trigger Node

- Special trigger that activates when workflows fail
- Workflow containing Error Trigger doesn't need to be activated
- By default, workflow uses itself as error workflow if it contains Error Trigger

### 3. Stop and Error Node

- Manually causes workflow to fail with custom error message
- Useful for validation and business logic errors
- Can trigger error workflows

## Best Practices

### 1. Node Configuration Strategy

```json
// External service nodes (APIs, RSS feeds)
{
  "continueOnFail": true,
  "retryOnFail": true,
  "maxTries": 3,
  "waitBetweenTries": 2000
}

// Database operations
{
  "retryOnFail": true,
  "maxTries": 3,
  "waitBetweenTries": 1000,
  "onError": "stopWorkflow",  // Required for retry to work
  "alwaysOutputData": true
}

// Critical operations
{
  "onError": "stopWorkflow",
  "retryOnFail": true,
  "maxTries": 5
}

// Non-critical operations
{
  "continueOnFail": true,
  "onError": "continue"
}
```

### 2. Error Output Routing

Use separate paths for error handling:

```
┌─────────────┐     Success    ┌──────────────┐
│   API Call  ├───────────────►│ Process Data │
└──────┬──────┘                └──────────────┘
       │
       │ Error Output
       ▼
┌─────────────┐
│ Log Error   │
└─────────────┘
```

### 3. Error Context Enrichment

Use Set nodes to add context before error-prone operations:

```javascript
// Before risky operation
{
  "operation": "podcast_fetch",
  "feedUrl": "...",
  "timestamp": new Date().toISOString(),
  "attemptNumber": 1
}
```

## Common Patterns

### 1. Retry with Backoff

Since n8n doesn't support exponential backoff natively, implement in Code node:

```javascript
const maxRetries = 3;
let lastError;

for (let i = 0; i < maxRetries; i++) {
  try {
    // Attempt operation
    return await performOperation();
  } catch (error) {
    lastError = error;
    if (i < maxRetries - 1) {
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, i) * 1000)
      );
    }
  }
}
throw lastError;
```

### 2. Circuit Breaker Pattern

Track failures and stop attempting operations:

```javascript
const circuitBreaker = {
  failures: 0,
  threshold: 5,
  timeout: 60000,
  lastFailure: null
};

if (circuitBreaker.failures >= circuitBreaker.threshold) {
  const timeSinceLastFailure = Date.now() - circuitBreaker.lastFailure;
  if (timeSinceLastFailure < circuitBreaker.timeout) {
    throw new Error('Circuit breaker open');
  }
  // Reset after timeout
  circuitBreaker.failures = 0;
}
```

### 3. Batch Error Handling

For batch operations with partial failures:

```javascript
const results = {
  successful: [],
  failed: []
};

for (const item of items) {
  try {
    const result = await processItem(item);
    results.successful.push(result);
  } catch (error) {
    results.failed.push({
      item,
      error: error.message
    });
  }
}

// Continue with successful items
return results.successful;
```

## Error Workflow Design

### Basic Error Workflow Structure

1. **Error Trigger** - Receives error information
2. **Set Node** - Format error data
3. **Switch Node** - Route based on error type
4. **Database Logger** - Store error in database
5. **Notification** - Send alerts (Slack/Email)
6. **Recovery Actions** - Attempt to fix issues

### Error Data Available

```javascript
{
  "execution": {
    "id": "123",
    "retryOf": "122", // If this is a retry
    "error": {
      "message": "Connection timeout",
      "name": "RequestError",
      "stack": "..."
    },
    "lastNodeExecuted": "HTTP Request",
    "mode": "webhook"
  },
  "workflow": {
    "id": "abc123",
    "name": "Podcast Ingestion"
  }
}
```

## Limitations and Workarounds

### 1. No Native Transaction Support
- **Limitation**: No built-in database transaction support
- **Workaround**: Use stored procedures or implement compensating transactions

### 2. Limited Retry Strategies
- **Limitation**: No exponential backoff or jitter
- **Workaround**: Implement custom retry logic in Code nodes

### 3. Error Testing Challenges
- **Limitation**: Error workflows don't trigger in manual mode
- **Workaround**: Create test workflows that simulate errors

### 4. Batch Processing Complexity
- **Limitation**: Retry affects all items, not just failed ones
- **Workaround**: Process items individually when retry is critical

## References

- [n8n Error Handling Documentation](https://docs.n8n.io/flow-logic/error-handling/)
- [Error Trigger Node Documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.errortrigger/)
- [GitHub Issue #10763](https://github.com/n8n-io/n8n/issues/10763) - Retry/Continue compatibility
- [Community Discussion](https://community.n8n.io/t/retry-on-fail-and-on-error-compatibility/123694) - Error handling patterns