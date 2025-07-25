# SQL Sanitization Module

Comprehensive SQL injection prevention utilities optimized for Microsoft SQL Server (T-SQL) with field-specific sanitization strategies.

## Installation and Import

```javascript
// Individual function imports (recommended for smaller projects)
const { sanitizeForSQL, sanitizeByFieldType, generateInsertStatement, generateEnhancedSQLValue } = require('sww-n8n-helpers');

// Module-based imports (recommended for larger projects)
const { modules } = require('sww-n8n-helpers');
const { sanitizeForSQL, sanitizeByFieldType, generateInsertStatement, generateEnhancedSQLValue } = modules.sqlSanitization;

// Import entire module
const utils = require('sww-n8n-helpers');
const { sanitizeForSQL, generateEnhancedSQLValue } = utils.modules.sqlSanitization;
```

## Key Functions

### `sanitizeForSQL(text, options)`

Core sanitization function that uses `tsqlstring` for robust SQL injection prevention.

**Parameters:**

- `text` (Any): Text to sanitize (converts objects to JSON)
- `options` (Object): Sanitization options
  - `maxLength` (Number): Maximum length (null for unlimited)
  - `allowNewlines` (Boolean): Allow newline characters (default: true)
  - `preserveBasicFormatting` (Boolean): Preserve formatting (default: false)
  - `strictMode` (Boolean): Enable strict sanitization (default: false)
  - `useTsqlstring` (Boolean): Use tsqlstring for escaping (default: true)

**Example: Basic SQL Sanitization**

```javascript
const { sanitizeForSQL } = require('sww-n8n-helpers');

const userInput = "O'Reilly's \"Book\" & Co.";
const maliciousInput = "'; DROP TABLE users; --";

const safe1 = sanitizeForSQL(userInput);
// Returns: "O''Reilly''s \"Book\" & Co." (quotes escaped)

const safe2 = sanitizeForSQL(maliciousInput, { strictMode: true });
// Returns: "'';  users;  " (dangerous patterns removed)

const truncated = sanitizeForSQL("Very long text...", { maxLength: 20 });
// Returns: "Very long text..." (truncated to 20 chars with ellipsis)
```

### `sanitizeByFieldType(text, fieldType, maxLength)`

Enhanced sanitization with field-specific rules.

**Field Types:**

- `title`, `name`, `subject`: No newlines, strict mode, 250 char limit
- `description`, `content`, `summary`: Allows newlines, preserves formatting
- `url`, `link`: Removes quotes/spaces, strict validation
- `email`: Lowercase, removes dangerous characters
- `json`: Validates JSON format before sanitization

**Example: Field-Specific Sanitization**

```javascript
const { sanitizeByFieldType } = require('sww-n8n-helpers');

const title = sanitizeByFieldType("Breaking\nNews: O'Reilly", 'title');
// Returns: "Breaking News: O''Reilly" (newlines removed, quotes escaped)

const email = sanitizeByFieldType('  USER@EXAMPLE.COM  ', 'email');
// Returns: "user@example.com" (trimmed, lowercased)

const url = sanitizeByFieldType('https://example.com/path with spaces', 'url');
// Returns: "https://example.com/pathwithspaces" (spaces removed)

const content = sanitizeByFieldType("Multi-line\ncontent with\n\nbreaks", 'content');
// Returns: "Multi-line\ncontent with\n\nbreaks" (preserves formatting)
```

### `sanitizeItemsBatch(items, options)`

Batch sanitization with automatic field mapping and validation.

**Parameters:**

- `items` (Array): Items to sanitize
- `options` (Object): Processing options
  - `fieldMappings` (Object): Field type mappings
  - `fieldsToProcess` (Array): Specific fields to sanitize
  - `includeValidation` (Boolean): Include validation results
  - `maintainPairing` (Boolean): Maintain n8n item pairing

**Example: Batch Processing with Field Mappings**

```javascript
const { sanitizeItemsBatch } = require('sww-n8n-helpers');

// Define field mappings for your data structure
const fieldMappings = {
  Title: { type: 'title', maxLength: 250 },
  Description: { type: 'description', maxLength: null },
  AuthorEmail: { type: 'email', maxLength: 255 },
  SourceUrl: { type: 'url', maxLength: 2000 },
  Tags: { type: 'content', maxLength: 500 }
};

const results = sanitizeItemsBatch($input.all(), {
  fieldMappings,
  fieldsToProcess: ['Title', 'Description', 'AuthorEmail', 'SourceUrl'],
  includeValidation: true,
  maintainPairing: true
});

return results;
```

**Example: Batch Sanitization**

```javascript
const { sanitizeItemsBatch } = require('sww-n8n-helpers');

const items = [{ 
  objectToSanitize: { title: "O'Reilly Book", email: "USER@TEST.COM" },
  fieldsToSanitize: 'title,email'
}];

const results = sanitizeItemsBatch(items, {
  fieldMappings: {
    title: { type: 'title', maxLength: 50 },
    email: { type: 'email', maxLength: 255 }
  }
});
// Returns: [{ json: { titleSanitized: "O''Reilly Book", emailSanitized: "user@test.com" }, pairedItem: 0 }]
```

### Advanced SQL Generation Functions

#### `generateInsertStatement(tableName, data, options)`

Generate safe INSERT statements with proper escaping and advanced features.

**Parameters:**

- `tableName` (String): Target table name
- `data` (Object|Array): Data to insert (single object or array of objects)  
- `options` (Object): Generation options
  - `outputClause` (String): OUTPUT clause for SQL Server (e.g., "OUTPUT INSERTED.*")
  - `specialValues` (Object): Raw SQL values like `{ id: 'NEWID()' }`
  - `fieldMappings` (Object): Field type mappings for enhanced sanitization

**Example: Basic INSERT Statement**

```javascript
const { generateInsertStatement } = require('sww-n8n-helpers');

const data = { Title: "O'Reilly Book", Price: 29.99 };
const insertSQL = generateInsertStatement('Books', data);
// Returns: "INSERT INTO [Books] ([Title], [Price]) VALUES ('O''Reilly Book', 29.99)"
```

**Example: Enhanced INSERT with OUTPUT Clause**

```javascript
const { generateInsertStatement } = require('sww-n8n-helpers');

const data = {
  Title: "New Book",
  AuthorEmail: "author@example.com",
  PublishedDate: new Date().toISOString()
};

const insertSQL = generateInsertStatement('Books', data, {
  outputClause: 'OUTPUT INSERTED.BookId, INSERTED.Title',
  specialValues: {
    BookId: 'NEWID()',
    CreatedAt: 'GETDATE()'
  },
  fieldMappings: {
    Title: { type: 'title', maxLength: 200 },
    AuthorEmail: { type: 'email' },
    PublishedDate: { type: 'datetime' }
  }
});

// Returns: 
// INSERT INTO [Books] ([Title], [AuthorEmail], [PublishedDate], [BookId], [CreatedAt])
// OUTPUT INSERTED.BookId, INSERTED.Title
// VALUES ('New Book', 'author@example.com', '2024-01-15T10:30:00.000Z', NEWID(), GETDATE())
```

**Example: Bulk INSERT with Field Mappings**

```javascript
const episodes = [
  { title: "Episode 1", duration: 3600, description: "First episode content..." },
  { title: "Episode 2", duration: 2400, description: "Second episode content..." }
];

const fieldMappings = {
  title: { type: 'title', maxLength: 250 },
  description: { type: 'content' },
  duration: { type: 'int' }
};

const bulkSQL = generateInsertStatement('Episodes', episodes, {
  fieldMappings,
  specialValues: { EpisodeId: 'NEWID()' }
});
// Generates bulk INSERT with proper type-aware sanitization
```

#### `generateEnhancedSQLValue(value, dataType, options)`

Generate SQL-ready values with comprehensive type handling and sanitization.

**Parameters:**

- `value` (Any): Value to convert to SQL format
- `dataType` (String): Data type for specialized handling
- `options` (Object): Additional options like `maxLength`

**Supported Data Types:**

- `string`, `title`, `name`, `subject` - Text with appropriate sanitization
- `number`, `int`, `integer`, `float`, `decimal` - Numeric values
- `guid`, `uniqueidentifier`, `uuid` - GUID handling with validation
- `date`, `datetime`, `datetime2`, `timestamp` - Date/time formatting
- `url`, `link` - URL validation and sanitization
- `filename` - Filename-safe text processing
- `content`, `text`, `description`, `summary` - Long text content
- `email` - Email validation and formatting
- `json` - JSON string validation
- `boolean`, `bit` - Boolean to bit conversion

**Example: Type-Aware Value Generation**

```javascript
const { generateEnhancedSQLValue } = require('sww-n8n-helpers');

// String values
const title = generateEnhancedSQLValue("O'Reilly Book", 'title');
// Returns: "'O''Reilly Book'"

const email = generateEnhancedSQLValue("USER@EXAMPLE.COM", 'email');
// Returns: "'user@example.com'" (normalized to lowercase)

// Numeric values
const price = generateEnhancedSQLValue("29.99", 'decimal');
// Returns: "29.99" (no quotes for numbers)

const invalidNumber = generateEnhancedSQLValue("not-a-number", 'int');
// Returns: "NULL" (invalid numbers become NULL)

// Date values
const date = generateEnhancedSQLValue(new Date('2024-01-15'), 'datetime');
// Returns: "'2024-01-15T00:00:00.000Z'"

// Boolean values
const isActive = generateEnhancedSQLValue(true, 'boolean');
// Returns: "1" (SQL Server bit format)

// GUID values
const id = generateEnhancedSQLValue('123e4567-e89b-12d3-a456-426614174000', 'guid');
// Returns: "TRY_CONVERT(uniqueidentifier, '123e4567-e89b-12d3-a456-426614174000')"

// URL values
const url = generateEnhancedSQLValue('https://example.com/path', 'url');
// Returns: "'https://example.com/path'" (validated and sanitized)

// Content with length limits
const description = generateEnhancedSQLValue('Very long content...', 'content', { maxLength: 100 });
// Returns: "'Very long content...'" (truncated if needed)
```

**Example: Integration with Field Mappings**

```javascript
const fieldMappings = {
  Title: { type: 'title', maxLength: 200 },
  Email: { type: 'email' },
  Price: { type: 'decimal' },
  IsActive: { type: 'boolean' },
  CreatedDate: { type: 'datetime' }
};

const data = {
  Title: "Amazing Product!",
  Email: "CONTACT@EXAMPLE.COM",
  Price: "99.99",
  IsActive: true,
  CreatedDate: new Date()
};

// Convert all values using their field mappings
const sqlValues = {};
Object.entries(data).forEach(([field, value]) => {
  const mapping = fieldMappings[field];
  sqlValues[field] = generateEnhancedSQLValue(value, mapping.type, mapping);
});

// Results in properly typed and sanitized SQL values
```

#### `generateUpdateStatement(tableName, data, whereClause, options)`

Generate safe UPDATE statements.

**Example: Generate UPDATE Statement**

```javascript
const { generateUpdateStatement } = require('sww-n8n-helpers');

const updateData = { Title: "Updated Book", Price: 34.99 };
const whereClause = { ID: 123 };

const updateSQL = generateUpdateStatement('Books', updateData, whereClause);
// Returns: "UPDATE [Books] SET [Title] = 'Updated Book', [Price] = 34.99 WHERE [ID] = 123"
```

### Raw SQL Utilities

#### `formatSqlQuery(sql, values)` and `escapeSqlValue(value, options)`

For dynamic query construction.

**Example: Dynamic Query Building**

```javascript
const { formatSqlQuery, escapeSqlIdentifier } = require('sww-n8n-helpers');

const sql = 'SELECT * FROM ?? WHERE status = ? AND category = ?';
const values = ['Products', 'active', 'tech'];

const query = formatSqlQuery(sql, values);
// Returns: "SELECT * FROM [Products] WHERE status = 'active' AND category = 'tech'"

const safeTable = escapeSqlIdentifier('user-table');
// Returns: "[user-table]" (brackets for SQL Server)
```

## Integration with Microsoft SQL Node

### Pre-processing for SQL Node

```javascript
// Code node before Microsoft SQL node
const { sanitizeItemsBatch } = require('sww-n8n-helpers');

const sqlSafeData = sanitizeItemsBatch($input.all(), {
  fieldMappings: {
    Title: { type: 'title', maxLength: 250 },
    Content: { type: 'content', maxLength: null },
    Url: { type: 'url', maxLength: 2000 },
    Email: { type: 'email', maxLength: 255 }
  },
  fieldsToProcess: ['Title', 'Content', 'Url', 'Email'],
  includeValidation: false,
  maintainPairing: true
});

// Transform to SQL node format
const sqlNodeReady = sqlSafeData.map(item => ({
  json: {
    Title: item.json.TitleSanitized,
    Content: item.json.ContentSanitized,
    Url: item.json.UrlSanitized,
    Email: item.json.EmailSanitized,
    CreatedAt: new Date().toISOString()
  },
  pairedItem: item.pairedItem
}));

return sqlNodeReady;
```

### SQL Node Configuration

In your Microsoft SQL node, use the sanitized fields directly:

```sql
INSERT INTO Articles (Title, Content, Url, Email, CreatedAt)
VALUES ('{{ $json.Title }}', '{{ $json.Content }}', '{{ $json.Url }}', '{{ $json.Email }}', '{{ $json.CreatedAt }}')
```

## Module-Based Import Examples

For better organization in larger projects, use module-based imports:

```javascript
// Import specific module
const { modules } = require('sww-n8n-helpers');
const sqlSanitization = modules.sqlSanitization;

// Use all SQL functions through module
const safeTitle = sqlSanitization.sanitizeByFieldType(title, 'title');
const insertSQL = sqlSanitization.generateInsertStatement('users', userData);

// Or destructure what you need
const { sanitizeForSQL, generateInsertStatement } = modules.sqlSanitization;
```

## Validation and Error Handling

### Processing with Validation

```javascript
const { sanitizeItemsBatch } = require('sww-n8n-helpers');

const results = sanitizeItemsBatch($input.all(), {
  fieldMappings: {
    title: { type: 'title', maxLength: 100 },
    content: { type: 'content', maxLength: null }
  },
  includeValidation: true
});

// Check for validation issues
const itemsWithIssues = results.filter(item => 
  item.json.processingMetadata?.validationIssues?.length > 0
);

if (itemsWithIssues.length > 0) {
  console.log(`${itemsWithIssues.length} items had validation issues`);
  itemsWithIssues.forEach(item => {
    console.log(`Item ${item.pairedItem}:`, item.json.processingMetadata.validationIssues);
  });
}

return results;
```

## Security Best Practices

### 1. Always Sanitize User Input

```javascript
// BAD: Direct user input to SQL
const userTitle = $input.first().json.userTitle;
const query = `INSERT INTO Posts (Title) VALUES ('${userTitle}')`;

// GOOD: Sanitized input
const { sanitizeForSQL } = require('sww-n8n-helpers');
const safeTitle = sanitizeForSQL(userTitle, { maxLength: 250, strictMode: true });
const query = `INSERT INTO Posts (Title) VALUES ('${safeTitle}')`;
```

### 2. Use Field-Specific Sanitization

```javascript
const { sanitizeByFieldType } = require('sww-n8n-helpers');

// Different fields need different sanitization strategies
const userData = {
  email: sanitizeByFieldType(rawData.email, 'email'),
  website: sanitizeByFieldType(rawData.website, 'url'),
  bio: sanitizeByFieldType(rawData.bio, 'content'),
  name: sanitizeByFieldType(rawData.name, 'name')
};
```

### 3. Validate Sanitization Results

```javascript
const { validateSanitizedText } = require('sww-n8n-helpers');

const original = "Very long user input...";
const sanitized = sanitizeForSQL(original, { maxLength: 100 });
const issues = validateSanitizedText(original, sanitized, 'userInput');

if (issues.length > 0) {
  console.warn('Sanitization issues:', issues);
}
```

## Default Field Mappings

The module includes predefined field mappings for common use cases:

```javascript
const DEFAULT_FIELD_MAPPINGS = {
  // Topic fields
  Topic: { type: 'title', maxLength: 250 },
  PodcastPrompt: { type: 'content', maxLength: null },
  
  // Knowledge Source fields
  Name: { type: 'name', maxLength: 250 },
  Url: { type: 'url', maxLength: 2000 },
  Title: { type: 'title', maxLength: 250 },
  Author: { type: 'name', maxLength: 500 },
  
  // Common fields
  subject: { type: 'title', maxLength: 250 },
  description: { type: 'description', maxLength: null },
  content: { type: 'content', maxLength: null },
  email: { type: 'email', maxLength: 255 }
};
```

These can be extended or overridden based on your specific database schema and requirements.
