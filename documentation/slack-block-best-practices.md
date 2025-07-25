# Slack Block Kit Best Practices Guide

## Overview
This guide outlines best practices for creating robust, visually appealing, and reliable Slack Block Kit messages based on real-world experience and common pitfalls.

## Core Principles

### 1. Always Include Fallback Text
**Essential for accessibility and notification previews**

```javascript
const slackPayload = {
  // ALWAYS include top-level text for fallback
  text: "Workflow 'Example' failed - Execution #231",
  blocks: [...] // Your rich blocks
};
```

**Why it matters:**
- Screen readers default to this text
- Notification previews use this text
- Some clients fall back to this when blocks fail
- Search functionality indexes this text

### 2. Text Sanitization and Length Limits
**Use JSON.stringify() for safe text injection and respect Slack's limits**

```javascript
// Safe text handling function
function safeSlackText(text, maxLength = 150) {
  if (!text) return "N/A";
  if (typeof text !== 'string') text = String(text);
  
  // Truncate first
  const truncated = text.length <= maxLength ? text : text.substring(0, maxLength - 3) + "...";
  
  // Basic escaping for special characters
  return truncated
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Usage in blocks
{
  "type": "header",
  "text": {
    "type": "plain_text",
    "text": JSON.stringify(safeSlackText(dynamicText, 150)),
    "emoji": true
  }
}
```

**Critical Length Limits:**
- Header text: 150 characters max
- Section text: 3000 characters max
- Button text: 75 characters max
- Context text: 2000 characters max
- Alt text: 2000 characters max

### 3. Block Structure Best Practices

#### Use Headers for Primary Information
```javascript
// Good: Clear hierarchy with header
{
  "type": "header",
  "text": {
    "type": "plain_text", 
    "text": JSON.stringify(`🔴 ${workflowName}`),
    "emoji": true
  }
}
```

#### Use Rich Text for Structured Key-Value Pairs
```javascript
// Good: Consistent formatting with rich text
{
  "type": "rich_text",
  "elements": [
    {
      "type": "rich_text_section", 
      "elements": [
        {
          "type": "text",
          "text": "Status: ",
          "style": { "bold": true }
        },
        {
          "type": "text",
          "text": JSON.stringify(status)
        }
      ]
    }
  ]
}
```

#### Use Sections for Longer Content
```javascript
// Good: mrkdwn for formatted content
{
  "type": "section",
  "text": {
    "type": "mrkdwn",
    "text": JSON.stringify(`*Error:* \`\`\`${errorMessage}\`\`\``)
  }
}
```

#### Use Context for Supplementary Information
```javascript
// Good: Non-critical metadata
{
  "type": "context",
  "elements": [
    {
      "type": "mrkdwn", 
      "text": JSON.stringify(`🏷️ ID: ${id} | ⏰ ${timestamp}`)
    }
  ]
}
```

## Visual Design Principles

### 1. Establish Clear Visual Hierarchy
```javascript
// Structure from most to least important:
const blocks = [
  // 1. Header - Primary subject/title
  { type: "header", ... },
  
  // 2. Critical information - Status, key metrics
  { type: "rich_text", ... }, // or section
  
  // 3. Supporting details - Secondary information  
  { type: "rich_text", ... },
  
  // 4. Divider - Visual separation
  { type: "divider" },
  
  // 5. Actions - What user can do
  { type: "actions", ... },
  
  // 6. Context - Metadata and timestamps
  { type: "context", ... }
];
```

### 2. Use Emojis Strategically
```javascript
// Status indicators
const statusEmojis = {
  success: "✅",
  error: "🔴", 
  warning: "⚠️",
  info: "ℹ️",
  retry: "🔄"
};

// Category indicators
const categoryEmojis = {
  workflow: "⚙️",
  execution: "▶️", 
  time: "⏰",
  user: "👤",
  location: "📍",
  link: "🔗",
  id: "🏷️"
};
```

### 3. Consistent Text Formatting
```javascript
// Use consistent mrkdwn patterns
const formatting = {
  bold: "*text*",
  italic: "_text_", 
  code: "`text`",
  codeBlock: "```text```",
  link: "<url|text>",
  userMention: "<@userid>",
  channelMention: "<#channelid>"
};
```

## Code Construction Patterns

### 1. Defensive Block Building
```javascript
// Always use defensive programming
const blocks = [
  // Required blocks
  {
    "type": "header",
    "text": {
      "type": "plain_text",
      "text": JSON.stringify(safeSlackText(title || 'Unknown', 150)),
      "emoji": true
    }
  }
];

// Conditionally add blocks
if (hasStatus) {
  blocks.push({
    "type": "section",
    "text": {
      "type": "mrkdwn", 
      "text": JSON.stringify(`*Status:* ${status}`)
    }
  });
}

// Always validate before adding
if (errorMessage && errorMessage.trim()) {
  blocks.push({
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": JSON.stringify(`*Error:* \`\`\`${safeSlackText(errorMessage, 500)}\`\`\``)
    }
  });
}
```

### 2. Modular Block Functions
```javascript
// Create reusable block builders
function createHeaderBlock(title, emoji = true) {
  return {
    "type": "header",
    "text": {
      "type": "plain_text",
      "text": JSON.stringify(safeSlackText(title, 150)),
      "emoji": emoji
    }
  };
}

function createKeyValueBlock(key, value) {
  return {
    "type": "rich_text",
    "elements": [
      {
        "type": "rich_text_section",
        "elements": [
          {
            "type": "text", 
            "text": `${key}: `,
            "style": { "bold": true }
          },
          {
            "type": "text",
            "text": JSON.stringify(safeSlackText(value, 200))
          }
        ]
      }
    ]
  };
}

function createActionButton(text, url, style = "primary") {
  return {
    "type": "button",
    "text": {
      "type": "plain_text",
      "text": JSON.stringify(safeSlackText(text, 75))
    },
    "style": style,
    "url": url
  };
}
```

### 3. Error Handling and Fallbacks
```javascript
try {
  // Build complex blocks
  const blocks = buildComplexBlocks(data);
  
  return {
    text: generateFallbackText(data),
    blocks: blocks
  };
  
} catch (error) {
  console.error('Block generation failed:', error);
  
  // Always provide a working fallback
  return {
    text: `Error: ${data.title || 'Unknown'} - ${data.status || 'Unknown'}`,
    blocks: [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": JSON.stringify(`❌ *Message Generation Error*\n\nPlease check the logs for details.\n\nFallback: ${safeSlackText(data.title || 'Unknown action')}`)
        }
      }
    ]
  };
}
```

## Testing and Validation

### 1. Use Block Kit Builder for Testing
- Always test blocks in https://app.slack.com/block-kit-builder
- Copy generated JSON directly from n8n output
- Test with edge cases (long text, special characters, emojis)

### 2. Validation Checklist
```javascript
// Pre-send validation
function validateSlackBlocks(blocks) {
  const issues = [];
  
  blocks.forEach((block, index) => {
    // Check required fields
    if (!block.type) {
      issues.push(`Block ${index}: Missing type field`);
    }
    
    // Check text length limits
    if (block.type === 'header' && block.text?.text) {
      const textLength = JSON.parse(block.text.text).length;
      if (textLength > 150) {
        issues.push(`Block ${index}: Header text too long (${textLength} chars)`);
      }
    }
    
    // Check for empty blocks
    if (block.type === 'section' && !block.text?.text) {
      issues.push(`Block ${index}: Section block missing text`);
    }
  });
  
  return issues;
}
```

### 3. Common Failure Points
- **JSON syntax errors** - Use JSON.stringify() consistently
- **Text length violations** - Always truncate before inserting
- **Missing required fields** - Validate block structure
- **Invalid URLs** - Validate URLs before using in buttons
- **Empty blocks** - Check for null/undefined content

## Performance Considerations

### 1. Block Count Limits
- Maximum 50 blocks per message
- Prefer fewer, richer blocks over many simple blocks
- Combine related information into single blocks

### 2. Efficient Text Processing
```javascript
// Good: Process once, use many times
const processedData = {
  title: safeSlackText(raw.title, 150),
  description: safeSlackText(raw.description, 500),
  timestamp: formatFriendlyDate(raw.date)
};

// Use processed data in multiple blocks
```

### 3. Lazy Block Generation
```javascript
// Only generate blocks that will be used
const blocks = [
  createHeaderBlock(data.title)
];

// Conditionally add expensive blocks
if (needsDetailedView) {
  blocks.push(...generateDetailBlocks(data));
}
```

## Accessibility Best Practices

### 1. Meaningful Fallback Text
```javascript
// Good: Descriptive fallback
{
  text: "Workflow 'Data Processing' failed at step 'Validate Input' - Execution #231 - View details",
  blocks: [...]
}

// Bad: Generic fallback  
{
  text: "Notification",
  blocks: [...]
}
```

### 2. Descriptive Button Text
```javascript
// Good: Action is clear
{
  "type": "button",
  "text": { "type": "plain_text", "text": "View Execution Details" },
  "url": executionUrl
}

// Bad: Ambiguous action
{
  "type": "button", 
  "text": { "type": "plain_text", "text": "Click Here" },
  "url": executionUrl
}
```

### 3. Alt Text for Images
```javascript
// Always provide meaningful alt text
{
  "type": "image",
  "image_url": "https://example.com/chart.png",
  "alt_text": JSON.stringify(`Performance chart showing 85% success rate for ${workflowName} over last 24 hours`)
}
```

## Key Takeaways

1. **Always include fallback text** - Critical for accessibility and reliability
2. **Use JSON.stringify() for all dynamic content** - Prevents injection and JSON breaks
3. **Respect length limits** - Truncate text appropriately for each block type
4. **Build defensively** - Check for null/undefined values before using
5. **Test in Block Kit Builder** - Validate structure before deployment
6. **Create modular builders** - Reusable functions for consistent formatting
7. **Provide meaningful fallbacks** - Always have a working simple version
8. **Use appropriate block types** - Headers for titles, sections for content, context for metadata
9. **Maintain visual hierarchy** - Structure blocks from most to least important
10. **Handle errors gracefully** - Never let block generation failures break workflows

Following these patterns ensures your Slack messages are reliable, accessible, visually appealing, and maintainable across different use cases and data scenarios.