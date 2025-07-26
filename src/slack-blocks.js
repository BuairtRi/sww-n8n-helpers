// src/slack-blocks.js
// Slack Block Kit utilities for easy block composition and message construction
// Provides helpers for creating individual blocks and composing complex messages

const { validateAndExtractUrl } = require('./validation');

// Slack Block Kit Constants
// Based on https://api.slack.com/reference/block-kit/block-elements

/**
 * Valid block types
 */
const BLOCK_TYPES = {
  SECTION: 'section',
  HEADER: 'header',
  DIVIDER: 'divider',
  ACTIONS: 'actions',
  CONTEXT: 'context',
  RICH_TEXT: 'rich_text'
};

/**
 * Valid text object types
 */
const TEXT_TYPES = {
  PLAIN_TEXT: 'plain_text',
  MRKDWN: 'mrkdwn'
};

/**
 * Valid button styles
 */
const BUTTON_STYLES = {
  DEFAULT: 'default',
  PRIMARY: 'primary',
  DANGER: 'danger'
};

/**
 * Valid element types
 */
const ELEMENT_TYPES = {
  BUTTON: 'button',
  IMAGE: 'image',
  TEXT: 'text',
  LINK: 'link'
};

/**
 * Valid rich text element types
 */
const RICH_TEXT_TYPES = {
  SECTION: 'rich_text_section',
  LIST: 'rich_text_list',
  QUOTE: 'rich_text_quote',
  PREFORMATTED: 'rich_text_preformatted'
};

/**
 * Validate that a value is one of the allowed constants
 * @param {string} value - Value to validate
 * @param {Object} allowedValues - Object containing allowed values
 * @param {string} fieldName - Name of the field for error messages
 * @param {string} defaultValue - Default value if invalid
 * @returns {string} Valid value or default
 */
function validateConstant(value, allowedValues, fieldName, defaultValue = null) {
  const allowed = Object.values(allowedValues);
  
  if (value && allowed.includes(value)) {
    return value;
  }
  
  if (value && !allowed.includes(value)) {
    console.warn(`Invalid ${fieldName}: "${value}". Allowed values: ${allowed.join(', ')}. Using default: ${defaultValue}`);
  }
  
  return defaultValue;
}

/**
 * Escape text for Slack message formatting
 * @param {string} text - Text to escape
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Escaped and optionally truncated text
 */
function escapeSlackText(text, maxLength = null) {
  if (!text) return "N/A";
  
  // Convert to string and trim
  let escaped = String(text).trim();
  
  // Truncate if needed
  if (maxLength && escaped.length > maxLength) {
    escaped = escaped.substring(0, maxLength - 3) + '...';
  }
  
  // Escape special characters for Slack
  return escaped
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Create a text object for Slack blocks
 * @param {string} text - Text content
 * @param {string} type - Text type: TEXT_TYPES.PLAIN_TEXT or TEXT_TYPES.MRKDWN
 * @param {Object} options - Additional options
 * @param {boolean} options.emoji - Allow emoji (plain_text only)
 * @param {number} options.maxLength - Maximum text length
 * @returns {Object} Slack text object
 */
function createTextObject(text, type = TEXT_TYPES.PLAIN_TEXT, options = {}) {
  const { emoji = true, maxLength = null } = options;
  
  // Validate and default type
  const validType = validateConstant(type, TEXT_TYPES, 'text type', TEXT_TYPES.PLAIN_TEXT);
  
  const escapedText = escapeSlackText(text, maxLength);
  
  const textObject = {
    type: validType,
    text: escapedText
  };
  
  if (validType === TEXT_TYPES.PLAIN_TEXT && emoji !== undefined) {
    textObject.emoji = emoji;
  }
  
  return textObject;
}

// Core Block Builders

/**
 * Create a header block
 * @param {string} text - Header text (max 150 characters)
 * @param {string} blockId - Optional block ID
 * @returns {Object} Slack header block
 */
function createHeader(text, blockId = null) {
  const block = {
    type: BLOCK_TYPES.HEADER,
    text: createTextObject(text, TEXT_TYPES.PLAIN_TEXT, { maxLength: 150 })
  };
  
  if (blockId) {
    block.block_id = blockId;
  }
  
  return block;
}

/**
 * Create a section block
 * @param {string} text - Section text content
 * @param {Object} options - Additional options
 * @param {string} options.textType - TEXT_TYPES.PLAIN_TEXT or TEXT_TYPES.MRKDWN
 * @param {Object} options.accessory - Accessory element (button, image, etc.)
 * @param {Array} options.fields - Array of text objects for fields layout
 * @param {string} options.blockId - Optional block ID
 * @param {number} options.maxLength - Maximum text length
 * @returns {Object} Slack section block
 */
function createSection(text, options = {}) {
  const { 
    textType = TEXT_TYPES.MRKDWN, 
    accessory = null, 
    fields = null, 
    blockId = null,
    maxLength = null 
  } = options;
  
  // Validate text type
  const validTextType = validateConstant(textType, TEXT_TYPES, 'section text type', TEXT_TYPES.MRKDWN);
  
  const block = {
    type: BLOCK_TYPES.SECTION
  };
  
  if (fields) {
    block.fields = fields;
  } else {
    block.text = createTextObject(text, validTextType, { maxLength });
  }
  
  if (accessory) {
    block.accessory = accessory;
  }
  
  if (blockId) {
    block.block_id = blockId;
  }
  
  return block;
}

/**
 * Create a divider block
 * @param {string} blockId - Optional block ID
 * @returns {Object} Slack divider block
 */
function createDivider(blockId = null) {
  const block = { type: BLOCK_TYPES.DIVIDER };
  
  if (blockId) {
    block.block_id = blockId;
  }
  
  return block;
}

/**
 * Create an actions block with buttons or other interactive elements
 * @param {Array} elements - Array of action elements (buttons, selects, etc.)
 * @param {string} blockId - Optional block ID
 * @returns {Object} Slack actions block
 */
function createActions(elements, blockId = null) {
  const block = {
    type: BLOCK_TYPES.ACTIONS,
    elements: elements.filter(el => el !== null) // Remove null elements
  };
  
  if (blockId) {
    block.block_id = blockId;
  }
  
  return block;
}

/**
 * Create a context block for metadata and supplementary information
 * @param {Array} elements - Array of text and image elements
 * @param {string} blockId - Optional block ID
 * @returns {Object} Slack context block
 */
function createContext(elements, blockId = null) {
  const block = {
    type: BLOCK_TYPES.CONTEXT,
    elements: elements.filter(el => el !== null) // Remove null elements
  };
  
  if (blockId) {
    block.block_id = blockId;
  }
  
  return block;
}

/**
 * Create a rich text block
 * @param {Array} elements - Array of rich text elements
 * @param {string} blockId - Optional block ID
 * @returns {Object} Slack rich text block
 */
function createRichText(elements, blockId = null) {
  const block = {
    type: BLOCK_TYPES.RICH_TEXT,
    elements: elements.filter(el => el !== null) // Remove null elements
  };
  
  if (blockId) {
    block.block_id = blockId;
  }
  
  return block;
}

// Interactive Element Builders

/**
 * Create a button element
 * @param {string} text - Button text
 * @param {string} url - Button URL (for URL buttons)
 * @param {Object} options - Additional options
 * @param {string} options.style - Button style: BUTTON_STYLES.PRIMARY, BUTTON_STYLES.DANGER, or BUTTON_STYLES.DEFAULT
 * @param {string} options.actionId - Action ID for interactive buttons
 * @param {string} options.value - Button value
 * @param {number} options.maxTextLength - Maximum button text length
 * @returns {Object|null} Slack button element or null if invalid URL
 */
function createButton(text, url = null, options = {}) {
  const { style = null, actionId = null, value = null, maxTextLength = 75 } = options;
  
  // Validate URL if provided
  if (url) {
    const validUrl = validateAndExtractUrl(url);
    if (!validUrl) return null;
    url = validUrl;
  }
  
  // Validate button style
  const validStyle = style ? validateConstant(style, BUTTON_STYLES, 'button style', null) : null;
  
  const button = {
    type: ELEMENT_TYPES.BUTTON,
    text: createTextObject(text, TEXT_TYPES.PLAIN_TEXT, { maxLength: maxTextLength })
  };
  
  if (url) {
    button.url = url;
  }
  
  if (validStyle) {
    button.style = validStyle;
  }
  
  if (actionId) {
    button.action_id = actionId;
  }
  
  if (value) {
    button.value = value;
  }
  
  return button;
}

/**
 * Create an image element
 * @param {string} imageUrl - Image URL
 * @param {string} altText - Alt text for the image
 * @param {Object} options - Additional options
 * @param {string} options.title - Image title
 * @returns {Object|null} Slack image element or null if invalid URL
 */
function createImage(imageUrl, altText, options = {}) {
  const { title = null } = options;
  
  const validUrl = validateAndExtractUrl(imageUrl);
  if (!validUrl) return null;
  
  const image = {
    type: ELEMENT_TYPES.IMAGE,
    image_url: validUrl,
    alt_text: escapeSlackText(altText, 2000)
  };
  
  if (title) {
    image.title = createTextObject(title, TEXT_TYPES.PLAIN_TEXT, { maxLength: 2000 });
  }
  
  return image;
}

// Rich Text Element Builders

/**
 * Create a rich text section
 * @param {Array} elements - Array of rich text elements (text, links, etc.)
 * @returns {Object} Rich text section
 */
function createRichTextSection(elements) {
  return {
    type: RICH_TEXT_TYPES.SECTION,
    elements: elements.filter(el => el !== null)
  };
}

/**
 * Create rich text with bold, italic, or other formatting
 * @param {string} text - Text content
 * @param {Object} style - Style options
 * @param {boolean} style.bold - Make text bold
 * @param {boolean} style.italic - Make text italic
 * @param {boolean} style.strike - Strike through text
 * @param {boolean} style.code - Format as code
 * @returns {Object} Rich text element
 */
function createRichTextElement(text, style = {}) {
  const element = {
    type: ELEMENT_TYPES.TEXT,
    text: escapeSlackText(text)
  };
  
  if (Object.keys(style).length > 0) {
    element.style = style;
  }
  
  return element;
}

/**
 * Create a rich text link
 * @param {string} url - Link URL
 * @param {string} text - Link text (optional, uses URL if not provided)
 * @param {Object} style - Style options
 * @returns {Object|null} Rich text link element or null if invalid URL
 */
function createRichTextLink(url, text = null, style = {}) {
  const validUrl = validateAndExtractUrl(url);
  if (!validUrl) return null;
  
  const link = {
    type: ELEMENT_TYPES.LINK,
    url: validUrl
  };
  
  if (text) {
    link.text = escapeSlackText(text);
  }
  
  if (Object.keys(style).length > 0) {
    link.style = style;
  }
  
  return link;
}

// High-Level Composition Helpers

/**
 * Create a key-value display using rich text
 * @param {string} key - Key/label text
 * @param {string} value - Value text
 * @param {Object} options - Formatting options
 * @param {number} options.maxLength - Maximum value length
 * @param {boolean} options.boldKey - Make key bold (default: true)
 * @returns {Object|null} Rich text block or null if no value
 */
function createKeyValueBlock(key, value, options = {}) {
  const { maxLength = 200, boldKey = true } = options;
  
  if (!value || value === 'N/A' || value === 'Unknown') return null;
  
  const elements = [
    createRichTextElement(`${key}: `, boldKey ? { bold: true } : {}),
    createRichTextElement(escapeSlackText(value, maxLength))
  ];
  
  return createRichText([createRichTextSection(elements)]);
}

/**
 * Create a message header with emoji and title
 * @param {string} title - Main title text
 * @param {string} emoji - Emoji prefix (default: 🎧)
 * @param {Object} options - Additional options
 * @param {number} options.maxLength - Maximum title length
 * @returns {Object} Header block
 */
function createMessageHeader(title, emoji = '🎧', options = {}) {
  const { maxLength = 130 } = options;
  const headerText = `${emoji} ${title}`;
  return createHeader(headerText, { maxLength });
}

/**
 * Create action buttons for common patterns
 * @param {Object} urls - Object with button names as keys and URLs as values
 * @param {Object} options - Button options
 * @param {string} options.primaryButton - Name of primary button for styling
 * @returns {Object|null} Actions block or null if no valid URLs
 */
function createActionButtons(urls, options = {}) {
  const { primaryButton = null } = options;
  
  const buttons = Object.entries(urls)
    .map(([name, url]) => {
      const isPrimary = name === primaryButton;
      return createButton(name, url, { 
        style: isPrimary ? BUTTON_STYLES.PRIMARY : null 
      });
    })
    .filter(button => button !== null);
  
  if (buttons.length === 0) return null;
  
  return createActions(buttons);
}

/**
 * Create a context footer with metadata
 * @param {Array} items - Array of metadata items
 * @param {string} separator - Separator between items (default: ' | ')
 * @returns {Object|null} Context block or null if no items
 */
function createContextFooter(items, separator = ' | ') {
  const validItems = items.filter(item => item && item !== 'N/A');
  if (validItems.length === 0) return null;
  
  const contextText = validItems.join(separator);
  return createContext([createTextObject(contextText, TEXT_TYPES.MRKDWN)]);
}

/**
 * Create a complete Slack message with blocks
 * @param {Object} options - Message options
 * @param {string} options.text - Fallback text for notifications
 * @param {Array} options.blocks - Array of message blocks
 * @param {Object} options.metadata - Optional message metadata
 * @returns {Object} Complete Slack message payload
 */
function createSlackMessage(options = {}) {
  const { text = '', blocks = [], metadata = null } = options;
  
  const message = {
    text: text,
    blocks: blocks.filter(block => block !== null)
  };
  
  if (metadata) {
    message.metadata = metadata;
  }
  
  return message;
}

// Message Template Builders

/**
 * Create a standard content notification message
 * @param {Object} content - Content data
 * @param {string} content.title - Content title
 * @param {string} content.source - Content source name
 * @param {string} content.summary - Content summary/description
 * @param {Object} content.metadata - Additional metadata
 * @param {Object} content.urls - URLs for action buttons
 * @param {Object} options - Message options
 * @param {string} options.emoji - Header emoji
 * @param {string} options.type - Content type for header
 * @returns {Object} Complete Slack message
 */
function createContentNotification(content, options = {}) {
  const { emoji = '📄', type = 'Content' } = options;
  
  const blocks = [];
  
  // Header
  const headerText = `New ${type}: ${content.source || 'Unknown Source'}`;
  blocks.push(createMessageHeader(headerText, emoji));
  
  // Title
  if (content.title) {
    blocks.push(createSection(`*${escapeSlackText(content.title, 500)}*`));
  }
  
  // Metadata blocks
  if (content.metadata) {
    Object.entries(content.metadata).forEach(([key, value]) => {
      const metadataBlock = createKeyValueBlock(key, value);
      if (metadataBlock) blocks.push(metadataBlock);
    });
  }
  
  // Summary/Description
  if (content.summary && content.summary.length > 10) {
    blocks.push(createSection(escapeSlackText(content.summary, 1000)));
  }
  
  // Divider before actions
  blocks.push(createDivider());
  
  // Action buttons
  if (content.urls) {
    const actionBlock = createActionButtons(content.urls, { 
      primaryButton: Object.keys(content.urls)[0] 
    });
    if (actionBlock) blocks.push(actionBlock);
  }
  
  // Context footer
  const contextItems = [];
  if (content.metadata?.publishDate) {
    contextItems.push(`📅 ${content.metadata.publishDate}`);
  }
  if (content.metadata?.duration) {
    contextItems.push(`⏱️ ${content.metadata.duration}`);
  }
  if (content.metadata?.fileInfo) {
    contextItems.push(`📁 ${content.metadata.fileInfo}`);
  }
  
  const contextBlock = createContextFooter(contextItems);
  if (contextBlock) blocks.push(contextBlock);
  
  // Create fallback text
  const fallbackParts = [
    `New ${type.toLowerCase()}: ${content.title || 'Untitled'}`,
    content.source ? `from ${content.source}` : '',
    content.metadata?.duration ? `(${content.metadata.duration})` : ''
  ].filter(part => part.length > 0);
  
  return createSlackMessage({
    text: fallbackParts.join(' '),
    blocks: blocks,
    metadata: {
      generatedAt: new Date().toISOString(),
      messageType: 'content_notification',
      contentType: type.toLowerCase()
    }
  });
}

module.exports = {
  // Constants for validation
  BLOCK_TYPES,
  TEXT_TYPES,
  BUTTON_STYLES,
  ELEMENT_TYPES,
  RICH_TEXT_TYPES,
  
  // Utility functions
  validateConstant,
  escapeSlackText,
  createTextObject,
  
  // Core block builders
  createHeader,
  createSection,
  createDivider,
  createActions,
  createContext,
  createRichText,
  
  // Interactive elements
  createButton,
  createImage,
  
  // Rich text elements
  createRichTextSection,
  createRichTextElement,
  createRichTextLink,
  
  // High-level helpers
  createKeyValueBlock,
  createMessageHeader,
  createActionButtons,
  createContextFooter,
  createSlackMessage,
  
  // Templates
  createContentNotification
};