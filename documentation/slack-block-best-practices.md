# Slack Block Kit Best Practices Guide

## Overview
This guide outlines best practices for creating robust, visually appealing, and reliable Slack Block Kit messages based on real-world experience and common pitfalls.

**🆕 NEW:** We now provide a comprehensive `slack-blocks.js` utility library with built-in validation and safety features. See the [Slack Blocks Documentation](./slack-blocks.md) for the new recommended approach.

## Quick Start with New Utilities

For new development, use the validated utilities from `sww-n8n-helpers`:

```javascript
const { 
  createContentNotification,
  createHeader,
  createSection,
  createActionButtons,
  BUTTON_STYLES 
} = require('sww-n8n-helpers');

// Simple approach - use the template
const message = createContentNotification({
  title: "Workflow Failed", 
  source: "Data Processing",
  summary: "Validation step encountered an error",
  urls: { "View Details": executionUrl },
  metadata: { timestamp: new Date().toLocaleString() }
}, { emoji: "🔴", type: "Alert" });

// Or compose manually with validated helpers
const blocks = [
  createHeader("🔴 Workflow Alert"),
  createSection("*Data Processing* workflow failed", { textType: TEXT_TYPES.MRKDWN }),
  createActionButtons({ "View Details": executionUrl }, { primaryButton: "View Details" })
];
```

**Benefits of the new approach:**
- ✅ **Automatic validation** - Invalid field values are caught and warned about
- ✅ **URL validation** - Malformed URLs return null instead of breaking messages  
- ✅ **Length limits** - Text is automatically truncated to Slack's limits
- ✅ **Constants** - Use `BUTTON_STYLES.PRIMARY` instead of magic strings
- ✅ **Null safety** - Functions handle null/empty inputs gracefully

## Migration Guide

### From Manual Blocks to Utilities

**Old approach (manual block building):**
```javascript
// Manual, error-prone approach
const blocks = [
  {
    "type": "header",
    "text": {
      "type": "plain_text",
      "text": `🔴 ${title}`, // Could exceed 150 char limit
      "emoji": true
    }
  },
  {
    "type": "actions", 
    "elements": [
      {
        "type": "button",
        "text": { "type": "plain_text", "text": "View Details" },
        "style": "primary", // Magic string - could be invalid
        "url": url // Could be malformed
      }
    ]
  }
];
```

**New approach (with utilities):**
```javascript
const { createHeader, createActionButtons, BUTTON_STYLES } = require('sww-n8n-helpers');

// Validated, safe approach
const blocks = [
  createHeader(`🔴 ${title}`), // Automatically truncates to 150 chars
  createActionButtons(
    { "View Details": url }, // URL automatically validated
    { primaryButton: "View Details" } // Uses BUTTON_STYLES.PRIMARY internally
  )
].filter(block => block !== null); // Remove any null blocks from invalid inputs
```

### Common Patterns Comparison

**Status Messages:**
```javascript
// Old way
const statusBlock = {
  "type": "rich_text",
  "elements": [{
    "type": "rich_text_section",
    "elements": [
      { "type": "text", "text": "Status: ", "style": { "bold": true } },
      { "type": "text", "text": status }
    ]
  }]
};

// New way  
const statusBlock = createKeyValueBlock("Status", status);
```

**Content Notifications:**
```javascript
// Old way - lots of manual work
const blocks = [
  { "type": "header", "text": { "type": "plain_text", "text": `📄 ${source}` } },
  { "type": "section", "text": { "type": "mrkdwn", "text": `*${title}*\n${summary}` } },
  { "type": "divider" },
  { "type": "actions", "elements": [/* manual button building */] }
];

// New way - one function call
const message = createContentNotification({
  title, source, summary,
  urls: { "View": viewUrl, "Download": downloadUrl }
});
```

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

## Best Practices with New Utilities

### 1. Use Constants Instead of Magic Strings
```javascript
// ✅ Good - uses validated constants
const { BUTTON_STYLES, TEXT_TYPES } = require('sww-n8n-helpers');

createButton("Action", url, { style: BUTTON_STYLES.PRIMARY });
createSection(text, { textType: TEXT_TYPES.MRKDWN });

// ❌ Bad - magic strings can be invalid
createButton("Action", url, { style: "primary" }); // Works but not validated
createButton("Action", url, { style: "invalid" }); // Will warn and use default
```

### 2. Handle Null Returns Gracefully
```javascript
// ✅ Good - filter out null blocks
const blocks = [
  createHeader(title),
  createKeyValueBlock("Status", status), // Might return null if status is empty
  createActionButtons(urls) // Might return null if no valid URLs
].filter(block => block !== null);

// ✅ Good - check before adding
const actionBlock = createActionButtons(urls);
if (actionBlock) blocks.push(actionBlock);
```

### 3. Leverage Templates for Common Patterns
```javascript
// ✅ Good - use templates for standard layouts
const message = createContentNotification(episodeData, { 
  emoji: "🎧", 
  type: "Podcast Episode" 
});

// ✅ Good - compose custom layouts when needed
const blocks = [
  createMessageHeader("Custom Layout", "⚙️"),
  createSection("Custom content"),
  createDivider(),
  // ... custom blocks
];
```

### 4. Monitor Console Warnings
The utilities will warn about validation issues:
```javascript
// This will log: "Invalid button style: 'invalid'. Allowed values: default, primary, danger. Using default: null"
createButton("Test", "https://example.com", { style: "invalid" });

// Pay attention to these warnings in your n8n logs
```

### 5. Combine with Batch Processing
```javascript
const { processItemsWithPairing, createContentNotification } = require('sww-n8n-helpers');

const result = await processItemsWithPairing(
  $input.all(),
  ($item, $json, $itemIndex) => {
    // Each item becomes a Slack notification
    return createContentNotification({
      title: $json.title,
      source: $json.podcastName,
      summary: $json.description,
      urls: { "Listen": $json.episodeUrl }
    });
  },
  {},
  { maintainPairing: true }
);
```

## Key Takeaways

### For New Development (Recommended)
1. **Use the slack-blocks utilities** - Built-in validation and safety
2. **Use constants** - `BUTTON_STYLES.PRIMARY` instead of `"primary"`
3. **Handle null returns** - Filter out or check before using
4. **Start with templates** - Use `createContentNotification()` for common patterns
5. **Monitor warnings** - Check console for validation issues

### For Existing Code (Legacy Principles)
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

## Migration Recommendation

**For new Slack message development**: Use the new utilities from `sww-n8n-helpers` with built-in validation.

**For existing code**: Consider migrating to the new utilities during maintenance, but the manual approach documented here will continue to work.

Following these patterns ensures your Slack messages are reliable, accessible, visually appealing, and maintainable across different use cases and data scenarios.