# Data Transform Module

Business data normalization utilities that handle field transformations, null handling, validation, and business rules. This module focuses on preparing data for database operations while maintaining business logic separation from SQL concerns.

## Import Options

```javascript
// Individual function imports
const { normalizeField, normalizeData, createNormalizer, COMMON_FIELD_CONFIGS } = require('sww-n8n-helpers');

// Module namespace
const { dataTransform } = require('sww-n8n-helpers');
// Then use: dataTransform.normalizeData(), etc.
```

## Core Functions

### `normalizeField(value, fieldConfig)`

Normalize a single field value according to business rules.

**Parameters:**
- `value` - The raw value to normalize
- `fieldConfig` - Field configuration object with normalization rules

**Field Configuration Options:**
- `type` - Field type: 'string', 'integer', 'bigint', 'boolean', 'date'
- `maxLength` - Maximum length for strings
- `cleanHtml` - Whether to clean HTML from strings
- `required` - Whether field is required (affects null handling)
- `defaultValue` - Explicit default value
- `trimWhitespace` - Whether to trim whitespace (default: true)
- `customTransform` - Custom transformation function

```javascript
const { normalizeField } = require('sww-n8n-helpers');

// Basic string normalization
normalizeField('  Hello World  ', { type: 'string', trimWhitespace: true });
// Returns: "Hello World"

// String with length limit
normalizeField('Very long text that needs truncation...', { 
  type: 'string', 
  maxLength: 20 
});
// Returns: "Very long text th..."

// HTML cleaning
normalizeField('<p>Rich <strong>text</strong> content</p>', { 
  type: 'string', 
  cleanHtml: true 
});
// Returns: "Rich text content"

// Integer normalization
normalizeField('123.45', { type: 'integer' });
// Returns: 123

normalizeField('not-a-number', { type: 'integer', required: true });
// Returns: 0 (fallback for required field)

normalizeField('not-a-number', { type: 'integer', required: false });
// Returns: null

// Boolean normalization
normalizeField('true', { type: 'boolean' });     // Returns: true
normalizeField('1', { type: 'boolean' });        // Returns: true
normalizeField('yes', { type: 'boolean' });      // Returns: true
normalizeField('false', { type: 'boolean' });    // Returns: false

// Date normalization
normalizeField('2024-01-15', { type: 'date' });
// Returns: "2024-01-15T00:00:00.000Z"

// Default values
normalizeField(null, { type: 'string', defaultValue: 'N/A' });
// Returns: "N/A"

normalizeField('', { type: 'string', required: true });
// Returns: "" (empty string for required string fields)

// Custom transformation
normalizeField('UPPERCASE TEXT', { 
  type: 'string',
  customTransform: (value) => value.toLowerCase()
});
// Returns: "uppercase text"
```

### `normalizeData(data, schema, options)`

Normalize an entire data object according to a schema.

**Parameters:**
- `data` - Raw data object to normalize
- `schema` - Schema object with field configurations
- `options` - Additional options
  - `includeOriginal` - Include original values in output (default: false)
  - `strict` - Only include fields defined in schema (default: false)

```javascript
const { normalizeData } = require('sww-n8n-helpers');

const rawData = {
  title: '  Breaking News: O\'Reilly Book Released  ',
  content: '<p>This is <strong>important</strong> news!</p>',
  publishDate: '2024-01-15',
  isPublished: 'true',
  viewCount: '123.45',
  author: null,
  category: 'tech'  // Not in schema
};

const schema = {
  title: { 
    type: 'string', 
    maxLength: 50, 
    trimWhitespace: true, 
    required: true 
  },
  content: { 
    type: 'string', 
    cleanHtml: true 
  },
  publishDate: { 
    type: 'date' 
  },
  isPublished: { 
    type: 'boolean' 
  },
  viewCount: { 
    type: 'integer' 
  },
  author: { 
    type: 'string', 
    defaultValue: 'Anonymous' 
  }
};

const normalized = normalizeData(rawData, schema);
// Returns: {
//   title: "Breaking News: O'Reilly Book Released",
//   content: "This is important news!",
//   publishDate: "2024-01-15T00:00:00.000Z",
//   isPublished: true,
//   viewCount: 123,
//   author: "Anonymous",
//   category: "tech"  // Included because strict: false (default)
// }

// Strict mode (only schema fields)
const strictNormalized = normalizeData(rawData, schema, { strict: true });
// Returns: Same as above but without 'category' field

// Include original values
const withOriginal = normalizeData(rawData, schema, { includeOriginal: true });
// Returns: Normalized data plus all original fields
```

### `createNormalizer(schema, options)`

Create a reusable normalizer function from a schema.

```javascript
const { createNormalizer } = require('sww-n8n-helpers');

const userNormalizer = createNormalizer({
  name: { type: 'string', maxLength: 100, required: true },
  email: { 
    type: 'string', 
    maxLength: 255, 
    customTransform: (value) => value.toLowerCase() 
  },
  age: { type: 'integer', required: false },
  isActive: { type: 'boolean', defaultValue: true }
});

// Use the normalizer function
const user1 = userNormalizer({
  name: '  John Doe  ',
  email: 'JOHN@EXAMPLE.COM',
  age: '25',
  isActive: 'true'
});

const user2 = userNormalizer({
  name: 'Jane Smith',
  email: 'JANE@EXAMPLE.COM',
  age: null
});

// Both users are normalized consistently using the same schema
```

### `validateNormalizedData(data, schema)`

Validate that normalized data meets requirements.

```javascript
const { normalizeData, validateNormalizedData } = require('sww-n8n-helpers');

const schema = {
  title: { type: 'string', maxLength: 50, required: true },
  age: { type: 'integer', required: true }
};

const data = { title: '', age: 'invalid' };
const normalized = normalizeData(data, schema);
const validation = validateNormalizedData(normalized, schema);

console.log(validation);
// Returns: {
//   isValid: false,
//   errors: [
//     "Required field 'title' is missing or empty",
//     "Field 'age' should be an integer, got string"
//   ],
//   warnings: []
// }
```

## Common Field Configurations

Pre-defined field configurations for typical use cases.

```javascript
const { COMMON_FIELD_CONFIGS } = require('sww-n8n-helpers');

// Text fields
COMMON_FIELD_CONFIGS.title          // { type: 'string', maxLength: 250, cleanHtml: true, required: true }
COMMON_FIELD_CONFIGS.name           // { type: 'string', maxLength: 250, required: true }
COMMON_FIELD_CONFIGS.description    // { type: 'string', maxLength: 4000, cleanHtml: true }
COMMON_FIELD_CONFIGS.summary        // { type: 'string', maxLength: 2000, cleanHtml: true }

// URL fields
COMMON_FIELD_CONFIGS.url            // { type: 'string', maxLength: 2000 }
COMMON_FIELD_CONFIGS.sourceUrl      // { type: 'string', maxLength: 2000 }
COMMON_FIELD_CONFIGS.imageUrl       // { type: 'string', maxLength: 4000 }

// ID fields
COMMON_FIELD_CONFIGS.guid           // { type: 'string', maxLength: 500, required: true }
COMMON_FIELD_CONFIGS.knowledgeSourceId  // { type: 'string', required: true }

// Numeric fields
COMMON_FIELD_CONFIGS.duration       // { type: 'integer', defaultValue: 0 }
COMMON_FIELD_CONFIGS.fileSize       // { type: 'bigint', defaultValue: 0 }
COMMON_FIELD_CONFIGS.id             // { type: 'integer', required: true }

// File fields
COMMON_FIELD_CONFIGS.fileName       // { type: 'string', maxLength: 255 }
COMMON_FIELD_CONFIGS.mimeType       // { type: 'string', maxLength: 100 }

// Author and meta fields
COMMON_FIELD_CONFIGS.author         // { type: 'string', maxLength: 500 }
COMMON_FIELD_CONFIGS.email          // { type: 'string', maxLength: 255, customTransform: lowercase }

// Date fields
COMMON_FIELD_CONFIGS.publicationDate    // { type: 'date' }
COMMON_FIELD_CONFIGS.createdAt          // { type: 'date', defaultValue: current timestamp }
COMMON_FIELD_CONFIGS.updatedAt          // { type: 'date', defaultValue: current timestamp }

// Boolean fields
COMMON_FIELD_CONFIGS.active         // { type: 'boolean', defaultValue: true }
COMMON_FIELD_CONFIGS.published      // { type: 'boolean', defaultValue: false }
```

### Using Common Field Configurations

```javascript
const { normalizeData, COMMON_FIELD_CONFIGS } = require('sww-n8n-helpers');

// Use pre-defined configurations
const podcastSchema = {
  title: COMMON_FIELD_CONFIGS.title,
  description: COMMON_FIELD_CONFIGS.description,
  author: COMMON_FIELD_CONFIGS.author,
  duration: COMMON_FIELD_CONFIGS.duration,
  sourceUrl: COMMON_FIELD_CONFIGS.sourceUrl,
  publicationDate: COMMON_FIELD_CONFIGS.publicationDate,
  published: COMMON_FIELD_CONFIGS.published
};

// Extend configurations as needed
const extendedSchema = {
  ...podcastSchema,
  title: { 
    ...COMMON_FIELD_CONFIGS.title, 
    maxLength: 300  // Override max length
  },
  customField: { 
    type: 'string', 
    maxLength: 100 
  }
};
```

## Integration Examples

### With Batch Processing

```javascript
const { processItemsWithPairing, normalizeData, COMMON_FIELD_CONFIGS } = require('sww-n8n-helpers');

const schema = {
  title: COMMON_FIELD_CONFIGS.title,
  author: COMMON_FIELD_CONFIGS.author,
  publishDate: COMMON_FIELD_CONFIGS.publicationDate
};

const result = await processItemsWithPairing(
  $input.all(),
  ($item, $json, $itemIndex) => {
    // Normalize each item's data
    const normalized = normalizeData($json, schema);
    
    return {
      ...normalized,
      processedAt: new Date().toISOString(),
      itemIndex: $itemIndex
    };
  },
  {},
  { maintainPairing: true }
);

return result.results;
```

### With SQL Generation

```javascript
const { 
  normalizeData, 
  COMMON_FIELD_CONFIGS, 
  generateInsert 
} = require('sww-n8n-helpers');

// Define business schema
const episodeSchema = {
  title: COMMON_FIELD_CONFIGS.title,
  description: COMMON_FIELD_CONFIGS.description,
  duration: COMMON_FIELD_CONFIGS.duration,
  sourceUrl: COMMON_FIELD_CONFIGS.sourceUrl,
  knowledgeSourceId: COMMON_FIELD_CONFIGS.knowledgeSourceId
};

// Normalize business data
const normalizedEpisode = normalizeData(rawEpisodeData, episodeSchema);

// Generate safe SQL
const insertSQL = generateInsert('KnowledgeSourceInstances', normalizedEpisode);

return { query: insertSQL };
```

### Custom Business Rules

```javascript
const { normalizeField } = require('sww-n8n-helpers');

// Custom transformation for podcast episode URLs
function normalizePodcastUrl(url) {
  return normalizeField(url, {
    type: 'string',
    maxLength: 2000,
    trimWhitespace: true,
    customTransform: (value) => {
      // Remove tracking parameters
      if (typeof value === 'string') {
        return value.replace(/[?&](utm_|ref=|tracking=)[^&]*/g, '');
      }
      return value;
    }
  });
}

// Custom email normalization
function normalizeBusinessEmail(email) {
  return normalizeField(email, {
    type: 'string',
    maxLength: 255,
    trimWhitespace: true,
    customTransform: (value) => {
      if (typeof value === 'string') {
        return value.toLowerCase().replace(/\+.*@/, '@'); // Remove + aliases
      }
      return value;
    }
  });
}
```

## Error Handling

Data transformation functions handle errors gracefully:

```javascript
const { normalizeData } = require('sww-n8n-helpers');

try {
  const normalized = normalizeData(invalidData, schema);
} catch (error) {
  console.error('Data normalization failed:', error.message);
  // Handle error appropriately
}

// Individual field errors are handled within normalization
const result = normalizeField('invalid-date', { type: 'date', required: false });
// Returns: null (rather than throwing error)

const resultRequired = normalizeField('invalid-date', { type: 'date', required: true });
// Returns: current timestamp (fallback for required date fields)
```

## Best Practices

1. **Define schemas once, reuse everywhere** - Create schema objects that can be shared across your application
2. **Use COMMON_FIELD_CONFIGS as base** - Extend pre-defined configurations rather than creating from scratch
3. **Validate after normalization** - Use `validateNormalizedData()` to catch data quality issues
4. **Handle null values explicitly** - Use `defaultValue` and `required` flags appropriately
5. **Custom transforms for business rules** - Implement business-specific transformations using `customTransform`
6. **Separate concerns** - Keep business logic in data-transform, SQL logic in sql module
7. **Test edge cases** - Verify behavior with null, empty strings, invalid formats

## Performance Considerations

- Field normalization is fast for individual values
- Batch normalization using `normalizeData()` is efficient for objects
- Consider caching normalizer functions created with `createNormalizer()`
- Custom transform functions should be lightweight
- For large datasets, consider processing in batches using `processItemsWithPairing`