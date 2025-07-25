# Text Processing Module

Clean, manipulate, and extract information from text content including HTML cleaning, markdown processing, and text normalization for n8n workflows.

## Import Options

This module supports two import patterns for maximum flexibility in n8n workflows:

**Individual Function Import (Destructuring):**
```javascript
const { cleanHtml, stripMarkdown, countWords } = require('@rin8n/content-processing-utils');
```

**Module Object Import (Organized Access):**
```javascript
const { text } = require('@rin8n/content-processing-utils');
// Then use: text.cleanHtml(...), text.stripMarkdown(...), text.countWords(...)
```

**Mixed Approach:**
```javascript
const { text, validateEmail } = require('@rin8n/content-processing-utils');
// Use text module: text.cleanHtml(...)
// Use individual function: validateEmail(...)
```

## Key Functions

### `cleanHtml(html, options)`

Clean HTML content and extract plain text using Cheerio.

**Parameters:**
- `html` (String): HTML content to clean
- `options` (Object): Cleaning options
  - `removeElements` (Array): Elements to remove (default: ['script', 'style', 'iframe', 'object', 'embed'])
  - `normalizeWhitespace` (Boolean): Normalize whitespace (default: true)

**Example: Clean HTML Content**
```javascript
const { cleanHtml, stripMarkdown, truncateWithSeparator } = require('@rin8n/content-processing-utils');

const html = '<p>Hello <strong>world</strong>!</p><script>alert("bad")</script>';
const cleaned = cleanHtml(html);
// Returns: "Hello world!" (HTML tags removed, script eliminated)

const markdown = '# Title\n\nThis is **bold** text with [link](url).';
const plainText = stripMarkdown(markdown);
// Returns: "Title This is bold text with link." (markdown syntax removed)

const longText = "This is a very long sentence that needs to be shortened.";
const truncated = truncateWithSeparator(longText, 30, { omission: '...' });
// Returns: "This is a very long..." (truncated at word boundary)
```

**Example: Email Processing**
```javascript
const { cleanHtml, truncateWithSeparator } = require('@rin8n/content-processing-utils');

const htmlEmail = '<p>Hello <b>customer</b>!</p><style>body{color:red}</style>';
const plainText = cleanHtml(htmlEmail, { removeElements: ['style', 'script'] });
// Returns: "Hello customer!"

const preview = truncateWithSeparator(plainText, 50, { omission: '...' });
// Returns: "Hello customer!" (or truncated if longer)
```

**Example: Email Processing (Module Object Pattern)**
```javascript
const { text } = require('@rin8n/content-processing-utils');

const htmlEmail = '<p>Hello <b>customer</b>!</p><style>body{color:red}</style>';
const plainText = text.cleanHtml(htmlEmail, { removeElements: ['style', 'script'] });
// Returns: "Hello customer!"

const preview = text.truncateWithSeparator(plainText, 50, { omission: '...' });
// Returns: "Hello customer!" (or truncated if longer)
```

### `stripMarkdown(markdown, options)`

Extract plain text from markdown content.

**Parameters:**
- `markdown` (String): Markdown content
- `options` (Object): Processing options
  - `preserveLineBreaks` (Boolean): Keep line breaks (default: false)

**Example: Markdown Processing**
```javascript
const { stripMarkdown, countWords } = require('@rin8n/content-processing-utils');

const markdown = '# Heading\n\nThis is **bold** and *italic* text.';

const plainText = stripMarkdown(markdown, { preserveLineBreaks: false });
// Returns: "Heading This is bold and italic text."

const withBreaks = stripMarkdown(markdown, { preserveLineBreaks: true });
// Returns: "Heading\n\nThis is bold and italic text."

const readingTime = Math.ceil(countWords(plainText) / 200);
// Returns: 1 (minute for ~200 WPM)
```

### `truncateWithSeparator(text, maxLength, options)`

Intelligently truncate text respecting word boundaries.

**Parameters:**
- `text` (String): Text to truncate
- `maxLength` (Number): Maximum length
- `options` (Object): Truncation options
  - `separator` (String): Word separator to respect (default: ' ')
  - `omission` (String): String to append when truncated (default: '...')

**Example: Social Media Content**
```javascript
const { truncateWithSeparator } = require('@rin8n/content-processing-utils');

const longText = "This is a very long article that needs to be adapted for different social media platforms with varying character limits.";

const twitter = truncateWithSeparator(longText, 280, { omission: '...' });
const linkedin = truncateWithSeparator(longText, 1300, { separator: '. ', omission: '... [continued]' });
const facebook = truncateWithSeparator(longText, 500, { omission: ' [read more]' });

// Each platform gets appropriately truncated content
```

### `generateExcerpt(text, maxLength, options)`

Generate intelligent excerpts from text content.

**Parameters:**
- `text` (String): Text to excerpt
- `maxLength` (Number): Maximum excerpt length (default: 200)
- `options` (Object): Excerpt options
  - `completeSentences` (Boolean): End on complete sentences (default: true)

**Example: Generate Smart Excerpts**
```javascript
const { generateExcerpt, countWords, normalizeText } = require('@rin8n/content-processing-utils');

const article = "This is the first sentence. This is the second sentence. This continues for much longer.";

const shortExcerpt = generateExcerpt(article, 30, { completeSentences: true });
// Returns: "This is the first sentence." (stops at complete sentence)

const longExcerpt = generateExcerpt(article, 100, { completeSentences: false });
// Returns: "This is the first sentence. This is the second sentence. This continues for much..." (truncated)

const wordCount = countWords(article);
// Returns: 16 (counts all words)

const normalized = normalizeText("Weird   spacing  and "curly" quotes");
// Returns: "Weird spacing and \"curly\" quotes" (normalized spacing and quotes)
```

### `countWords(text, options)` and `extractSentences(text, options)`

Analyze text structure and content.

**Example: Text Analysis**
```javascript
const { countWords, extractSentences } = require('@rin8n/content-processing-utils');

const text = "This is sentence one. This is sentence two. Here's a third sentence.";

const wordCount = countWords(text);
// Returns: 14

const sentences = extractSentences(text, { minLength: 10 });
// Returns: ["This is sentence one", "This is sentence two", "Here's a third sentence"]

const readingTime = Math.ceil(wordCount / 200); // Assuming 200 WPM
// Returns: 1 (minute)
```

### `normalizeText(text, options)`

Normalize text by fixing common formatting issues.

**Example: Text Normalization**
```javascript
const { normalizeText, basicSanitizeForSQL } = require('@rin8n/content-processing-utils');

const messy = "Weird   spacing  and "curly" quotes";
const normalized = normalizeText(messy, { removeExtraSpaces: true, normalizeQuotes: true });
// Returns: "Weird spacing and \"curly\" quotes"

const sqlSafe = basicSanitizeForSQL("O'Reilly's book");
// Returns: "O''Reilly''s book" (quotes escaped for SQL)
```

## Usage Patterns

### Multi-format Content Processing
```javascript
// Handle different content formats
const htmlContent = "<p>Hello <b>world</b>!</p>";
const markdownContent = "# Title\n**Bold** text";

const fromHtml = cleanHtml(htmlContent);        // "Hello world!"
const fromMarkdown = stripMarkdown(markdownContent); // "Title Bold text"
```

### Organized n8n Workflow Processing
```javascript
// Using module objects for cleaner n8n node organization
const { text, validation } = require('@rin8n/content-processing-utils');

// Text processing pipeline
const processContent = (rawContent) => {
  const cleaned = text.cleanHtml(rawContent);
  const normalized = text.normalizeText(cleaned);
  const excerpt = text.generateExcerpt(normalized, 200);
  const wordCount = text.countWords(normalized);
  
  return { excerpt, wordCount, fullText: normalized };
};

// Content validation and processing in one workflow
const content = processContent('<p>Your HTML content here</p>');
// Returns organized object with processed text metrics
```

### Web Scraping Cleanup
```javascript
const { cleanHtml, normalizeText, extractSentences } = require('@rin8n/content-processing-utils');

const scrapedHtml = '<nav>Menu</nav><article><h1>Title</h1><p>Content here.</p></article>';

const cleanContent = cleanHtml(scrapedHtml, {
  removeElements: ['nav', 'footer', 'aside', 'script']
});
// Returns: "Title Content here."

const sentences = extractSentences(cleanContent);
// Returns: ["Title Content here"] (extracts sentences for analysis)
```

### Content Format Conversion
```javascript
const { cleanHtml, stripMarkdown, generateExcerpt } = require('@rin8n/content-processing-utils');

// Auto-detect and convert different content formats
function convertToPlainText(content) {
  if (content.includes('<')) {
    return cleanHtml(content);                    // HTML → Plain text
  } else if (content.includes('#')) {
    return stripMarkdown(content);                // Markdown → Plain text  
  } else {
    return content;                               // Already plain text
  }
}

const htmlContent = "<h1>Title</h1><p>Content</p>";
const plainText = convertToPlainText(htmlContent);    // "Title Content"
const excerpt = generateExcerpt(plainText, 100);      // Smart excerpt
```

## Best Practices

1. **Always clean HTML** before text processing to remove unwanted elements
2. **Use appropriate truncation** methods for different platforms and use cases
3. **Normalize text** before database storage to ensure consistency
4. **Generate excerpts intelligently** using sentence boundaries when possible
5. **Combine functions** for comprehensive text processing pipelines
6. **Handle null/empty content** gracefully in your workflows
7. **Consider reading time** when generating content for different audiences

## Common Text Processing Workflows

### Content Preparation for Database
```javascript
const { cleanHtml, normalizeText, basicSanitizeForSQL } = require('@rin8n/content-processing-utils');

// Clean → Normalize → Sanitize pipeline
const content = cleanHtml(rawHtml);
const normalized = normalizeText(content);
const sqlSafe = basicSanitizeForSQL(normalized);
```

### Social Media Content Creation
```javascript
const { truncateWithSeparator, generateExcerpt } = require('@rin8n/content-processing-utils');

// Different platforms, different requirements
const twitterPost = truncateWithSeparator(content, 280);
const linkedinPost = truncateWithSeparator(content, 1300);
const excerpt = generateExcerpt(content, 200);
```

### Content Analysis and Metrics
```javascript
const { countWords, extractSentences } = require('@rin8n/content-processing-utils');

// Analyze content quality and structure
const wordCount = countWords(content);
const sentences = extractSentences(content);
const readingTime = Math.ceil(wordCount / 200);
```

All functions handle edge cases gracefully and return null for invalid input, making them safe to use in production n8n workflows. 