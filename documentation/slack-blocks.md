# Slack Block Kit Utilities

Comprehensive utility library for creating Slack Block Kit messages with validation, safety features, and easy composition helpers. Prevents common issues like invalid field values and provides a clean API for building complex Slack messages.

## Import Options

```javascript
// Individual function imports
const { 
  createHeader, 
  createSection, 
  createButton, 
  BUTTON_STYLES, 
  TEXT_TYPES 
} = require('sww-n8n-helpers');

// Module namespace
const { slackBlocks } = require('sww-n8n-helpers');
// Then use: slackBlocks.createHeader(), slackBlocks.BUTTON_STYLES.PRIMARY, etc.
```

## Constants and Validation

The module exports validated constants based on the official Slack Block Kit API to prevent invalid field values:

### Block Types
```javascript
const { BLOCK_TYPES } = require('sww-n8n-helpers');

BLOCK_TYPES.SECTION     // 'section'
BLOCK_TYPES.HEADER      // 'header'  
BLOCK_TYPES.DIVIDER     // 'divider'
BLOCK_TYPES.ACTIONS     // 'actions'
BLOCK_TYPES.CONTEXT     // 'context'
BLOCK_TYPES.RICH_TEXT   // 'rich_text'
```

### Text Types
```javascript
const { TEXT_TYPES } = require('sww-n8n-helpers');

TEXT_TYPES.PLAIN_TEXT   // 'plain_text'
TEXT_TYPES.MRKDWN       // 'mrkdwn'
```

### Button Styles
```javascript
const { BUTTON_STYLES } = require('sww-n8n-helpers');

BUTTON_STYLES.DEFAULT   // 'default'
BUTTON_STYLES.PRIMARY   // 'primary'
BUTTON_STYLES.DANGER    // 'danger'
```

### Element Types
```javascript
const { ELEMENT_TYPES } = require('sww-n8n-helpers');

ELEMENT_TYPES.BUTTON    // 'button'
ELEMENT_TYPES.IMAGE     // 'image'
ELEMENT_TYPES.TEXT      // 'text'
ELEMENT_TYPES.LINK      // 'link'
```

## Core Functions

### Text Processing

#### `escapeSlackText(text, maxLength)`
Safely escape text for Slack message formatting.

```javascript
const { escapeSlackText } = require('sww-n8n-helpers');

escapeSlackText("Hello & <world>", 10);
// Returns: "Hello &amp; &lt;world&gt;"

escapeSlackText("Very long text that needs truncation", 15);
// Returns: "Very long t..."
```

#### `createTextObject(text, type, options)`
Create properly formatted text objects for Slack blocks.

```javascript
const { createTextObject, TEXT_TYPES } = require('sww-n8n-helpers');

// Plain text with emoji support
createTextObject("Hello 👋", TEXT_TYPES.PLAIN_TEXT, { emoji: true });
// Returns: { type: "plain_text", text: "Hello 👋", emoji: true }

// Markdown text with length limit
createTextObject("*Bold text* with formatting", TEXT_TYPES.MRKDWN, { maxLength: 20 });
// Returns: { type: "mrkdwn", text: "*Bold text* with..." }
```

## Block Builders

### `createHeader(text, blockId)`
Create header blocks for message titles.

```javascript
const { createHeader } = require('sww-n8n-helpers');

createHeader("🎧 New Podcast Episode");
// Returns: {
//   type: "header",
//   text: { type: "plain_text", text: "🎧 New Podcast Episode", emoji: true }
// }
```

### `createSection(text, options)`
Create section blocks with text content and optional accessories.

```javascript
const { createSection, TEXT_TYPES } = require('sww-n8n-helpers');

// Basic section with markdown
createSection("*Episode Title*\nThis is the description");

// Section with accessory
createSection("Main content", {
  textType: TEXT_TYPES.MRKDWN,
  accessory: createButton("Listen", "https://podcast.com/episode1")
});

// Section with fields layout
createSection(null, {
  fields: [
    createTextObject("Duration", TEXT_TYPES.PLAIN_TEXT),
    createTextObject("45 minutes", TEXT_TYPES.PLAIN_TEXT)
  ]
});
```

### `createDivider(blockId)`
Create divider blocks for visual separation.

```javascript
const { createDivider } = require('sww-n8n-helpers');

createDivider();
// Returns: { type: "divider" }
```

### `createActions(elements, blockId)`
Create action blocks containing interactive elements.

```javascript
const { createActions, createButton, BUTTON_STYLES } = require('sww-n8n-helpers');

const buttons = [
  createButton("Listen", "https://podcast.com/ep1", { style: BUTTON_STYLES.PRIMARY }),
  createButton("Download", "https://podcast.com/ep1/download")
];

createActions(buttons);
// Returns: { type: "actions", elements: [...] }
```

### `createContext(elements, blockId)`
Create context blocks for metadata and supplementary information.

```javascript
const { createContext, createTextObject, TEXT_TYPES } = require('sww-n8n-helpers');

createContext([
  createTextObject("📅 Published: Jan 15, 2024 | ⏱️ 45 minutes", TEXT_TYPES.MRKDWN)
]);
```

## Interactive Elements

### `createButton(text, url, options)`
Create button elements with proper validation.

```javascript
const { createButton, BUTTON_STYLES } = require('sww-n8n-helpers');

// URL button with primary styling
createButton("🎧 Listen to Episode", "https://podcast.com/episode1", {
  style: BUTTON_STYLES.PRIMARY
});

// Interactive button with action
createButton("Mark as Read", null, {
  actionId: "mark_read",
  value: "episode_123",
  style: BUTTON_STYLES.DANGER
});

// Invalid style gets validated and warned
createButton("Invalid", "https://example.com", {
  style: "invalid_style"  // Will log warning and use null
});
```

### `createImage(imageUrl, altText, options)`
Create image elements with URL validation.

```javascript
const { createImage } = require('sww-n8n-helpers');

createImage(
  "https://podcast.com/artwork.jpg", 
  "Podcast artwork",
  { title: "Episode Artwork" }
);
// Returns: {
//   type: "image",
//   image_url: "https://podcast.com/artwork.jpg",
//   alt_text: "Podcast artwork",
//   title: { type: "plain_text", text: "Episode Artwork", emoji: true }
// }

// Invalid URLs return null
createImage("not-a-url", "Alt text");
// Returns: null
```

## Rich Text Elements

### `createRichText(elements, blockId)`
Create rich text blocks with formatted content.

```javascript
const { createRichText, createRichTextSection, createRichTextElement } = require('sww-n8n-helpers');

const richSection = createRichTextSection([
  createRichTextElement("Host: ", { bold: true }),
  createRichTextElement("John Smith"),
  createRichTextElement("\nDuration: ", { bold: true }),
  createRichTextElement("45 minutes")
]);

createRichText([richSection]);
```

### `createRichTextElement(text, style)`
Create formatted text elements within rich text.

```javascript
const { createRichTextElement } = require('sww-n8n-helpers');

// Bold text
createRichTextElement("Important!", { bold: true });

// Code formatting
createRichTextElement("npm install", { code: true });

// Multiple styles
createRichTextElement("Bold italic text", { bold: true, italic: true });
```

### `createRichTextLink(url, text, style)`
Create links within rich text blocks.

```javascript
const { createRichTextLink } = require('sww-n8n-helpers');

createRichTextLink("https://example.com", "Visit our website", { bold: true });
// Returns: {
//   type: "link",
//   url: "https://example.com", 
//   text: "Visit our website",
//   style: { bold: true }
// }
```

## High-Level Composition Helpers

### `createKeyValueBlock(key, value, options)`
Create key-value display blocks using rich text.

```javascript
const { createKeyValueBlock } = require('sww-n8n-helpers');

createKeyValueBlock("Duration", "45 minutes");
createKeyValueBlock("Author", "John Smith", { maxLength: 100, boldKey: true });

// Returns null for empty values
createKeyValueBlock("Empty", null);  // Returns: null
createKeyValueBlock("Unknown", "N/A");  // Returns: null
```

### `createMessageHeader(title, emoji, options)`
Create standardized message headers.

```javascript
const { createMessageHeader } = require('sww-n8n-helpers');

createMessageHeader("New Episode Available", "🎧");
createMessageHeader("System Alert", "⚠️", { maxLength: 100 });
```

### `createActionButtons(urls, options)`
Create action button groups from URL mappings.

```javascript
const { createActionButtons, BUTTON_STYLES } = require('sww-n8n-helpers');

const urls = {
  "🎧 Listen": "https://podcast.com/episode1",
  "📥 Download": "https://podcast.com/episode1/download",
  "📖 Show Notes": "https://podcast.com/episode1/notes"
};

createActionButtons(urls, { primaryButton: "🎧 Listen" });
// Creates actions block with first button styled as primary
```

### `createContextFooter(items, separator)`
Create context footers with metadata.

```javascript
const { createContextFooter } = require('sww-n8n-helpers');

const metadata = [
  "📅 Jan 15, 2024",
  "⏱️ 45 minutes", 
  "📁 MP3 • 42.3 MB"
];

createContextFooter(metadata);
createContextFooter(metadata, " • ");  // Custom separator
```

## Complete Message Creation

### `createSlackMessage(options)`
Create complete Slack message payloads.

```javascript
const { 
  createSlackMessage, 
  createHeader, 
  createSection, 
  createDivider,
  createActionButtons 
} = require('sww-n8n-helpers');

const blocks = [
  createHeader("🎧 New Podcast Episode"),
  createSection("*Episode 42: The Future of AI*\nIn this episode, we explore..."),
  createDivider(),
  createActionButtons({
    "🎧 Listen": "https://podcast.com/ep42",
    "📥 Download": "https://podcast.com/ep42/download"
  }, { primaryButton: "🎧 Listen" })
];

const message = createSlackMessage({
  text: "New episode: Episode 42",  // Fallback text
  blocks: blocks,
  metadata: {
    episodeId: "ep42",
    podcastName: "Tech Talk"
  }
});
```

## Message Templates

### `createContentNotification(content, options)`
Pre-built template for content notifications.

```javascript
const { createContentNotification } = require('sww-n8n-helpers');

const episodeData = {
  title: "Episode 42: The Future of AI",
  source: "Tech Talk Podcast", 
  summary: "In this episode, we explore the cutting-edge developments...",
  urls: {
    "🎧 Listen": "https://podcast.com/ep42",
    "📥 Download": "https://podcast.com/ep42/download"
  },
  metadata: {
    publishDate: "Jan 15, 2024",
    duration: "45 minutes",
    fileInfo: "MP3 • 42.3 MB"
  }
};

const message = createContentNotification(episodeData, {
  emoji: "🎧",
  type: "Podcast Episode"
});

// Returns complete Slack message with header, content, metadata, and actions
```

## Validation and Error Handling

### Input Validation
All functions validate inputs and provide helpful warnings:

```javascript
const { createButton, BUTTON_STYLES, validateConstant } = require('sww-n8n-helpers');

// Invalid button style
createButton("Test", "https://example.com", { style: "invalid" });
// Console: "Invalid button style: 'invalid'. Allowed values: default, primary, danger. Using default: null"

// Manual validation
const validStyle = validateConstant("invalid", BUTTON_STYLES, "button style", BUTTON_STYLES.PRIMARY);
// Returns: "primary" (the default)
```

### URL Validation
URLs are automatically validated and sanitized:

```javascript
const { createButton, createImage } = require('sww-n8n-helpers');

// Valid URLs are preserved
createButton("Test", "https://example.com");  // Works

// Invalid URLs return null
createButton("Test", "not-a-url");  // Returns: null
createImage("invalid-url", "Alt text");  // Returns: null
```

### Null Safety
Functions gracefully handle null/empty inputs:

```javascript
const { createKeyValueBlock, createActionButtons } = require('sww-n8n-helpers');

// Empty values return null
createKeyValueBlock("Key", null);  // Returns: null
createKeyValueBlock("Key", "");    // Returns: null

// Empty URL objects return null
createActionButtons({});  // Returns: null

// Filters out null elements automatically
createActions([null, createButton("Valid", "https://example.com"), null]);
// Only includes the valid button
```

## Integration Examples

### With Batch Processing
```javascript
const { 
  processItemsWithPairing, 
  createContentNotification 
} = require('sww-n8n-helpers');

const result = await processItemsWithPairing(
  $input.all(),
  ($item, $json, $itemIndex) => {
    // Create Slack notification for each podcast episode
    return createContentNotification({
      title: $json.title,
      source: $json.podcastName,
      summary: $json.description,
      urls: {
        "🎧 Listen": $json.episodeUrl,
        "📥 Download": $json.audioUrl
      },
      metadata: {
        publishDate: $json.publishDate,
        duration: $json.duration,
        fileInfo: `${$json.fileType} • ${$json.fileSize}`
      }
    }, {
      emoji: "🎧",
      type: "Podcast Episode"
    });
  },
  {},
  { maintainPairing: true }
);

return result.results;
```

### Custom Block Composition
```javascript
const { 
  createHeader,
  createSection, 
  createKeyValueBlock,
  createDivider,
  createActionButtons,
  createContextFooter,
  createSlackMessage,
  TEXT_TYPES,
  BUTTON_STYLES
} = require('sww-n8n-helpers');

// Build custom message step by step
const blocks = [];

// Header
blocks.push(createHeader("📊 Weekly Report"));

// Main content
blocks.push(createSection("*Analytics Summary*\nThis week's key metrics:", {
  textType: TEXT_TYPES.MRKDWN
}));

// Metrics as key-value pairs
["Downloads", "1,234", "New Subscribers", "89", "Average Rating", "4.8"]
  .reduce((acc, curr, i) => {
    if (i % 2 === 0) acc.push([curr]);
    else acc[acc.length - 1].push(curr);
    return acc;
  }, [])
  .forEach(([key, value]) => {
    const kvBlock = createKeyValueBlock(key, value);
    if (kvBlock) blocks.push(kvBlock);
  });

// Separator
blocks.push(createDivider());

// Actions
const actionBlock = createActionButtons({
  "📊 View Dashboard": "https://analytics.example.com",
  "📧 Email Report": "mailto:team@example.com"
}, { primaryButton: "📊 View Dashboard" });

if (actionBlock) blocks.push(actionBlock);

// Footer
const footerBlock = createContextFooter([
  `📅 ${new Date().toLocaleDateString()}`,
  "📈 Generated automatically"
]);

if (footerBlock) blocks.push(footerBlock);

// Complete message
const message = createSlackMessage({
  text: "Weekly Analytics Report",
  blocks: blocks,
  metadata: {
    reportType: "weekly",
    generatedAt: new Date().toISOString()
  }
});

return message;
```

## Best Practices

1. **Use Constants**: Always use the provided constants (`BUTTON_STYLES.PRIMARY`) instead of magic strings (`'primary'`)

2. **Validate Inputs**: The library validates inputs automatically, but check return values for null when URLs might be invalid

3. **Handle Null Returns**: Many functions return null for invalid inputs - filter these out or handle gracefully

4. **Leverage Templates**: Use `createContentNotification()` for common patterns before building custom layouts

5. **Compose Incrementally**: Build complex messages by combining simple blocks rather than trying to create everything at once

6. **Test with Edge Cases**: Verify behavior with null values, invalid URLs, and empty content

7. **Monitor Warnings**: Pay attention to console warnings about invalid field values

8. **Use Rich Text for Formatting**: Prefer rich text blocks over plain markdown for complex formatting needs

## Error Handling

The library is designed to fail gracefully:

- **Invalid inputs**: Generate console warnings and use sensible defaults
- **Invalid URLs**: Return null instead of creating broken elements  
- **Empty content**: Return null for blocks that would be meaningless
- **Invalid field values**: Validate against Slack API constants and warn about problems

This ensures your Slack messages are always valid and functional, even when input data has issues.