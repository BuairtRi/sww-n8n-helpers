# SQL Utilities Module

Pure SQL utilities focused on safe SQL generation and parameter handling using `tsqlstring`. This module provides the foundational SQL building blocks without business logic concerns.

## Import Options

```javascript
// Individual function imports
const { escape, escapeId, format, generateInsert, generateUpdate } = require('sww-n8n-helpers');

// Module namespace
const { sql } = require('sww-n8n-helpers');
// Then use: sql.escape(), sql.generateInsert(), etc.
```

## Core Functions

### `escape(value)`

Safely escape a SQL value using tsqlstring.

```javascript
const { escape } = require('sww-n8n-helpers');

escape("O'Reilly's Book");    // Returns: "'O''Reilly''s Book'"
escape(123);                  // Returns: "123"
escape(null);                 // Returns: "NULL"
escape(true);                 // Returns: "1"
escape(new Date());           // Returns: "'2024-01-15T10:30:00.000Z'"
```

### `escapeId(identifier, forbidQualified)`

Safely escape SQL identifiers (table, column names).

```javascript
const { escapeId } = require('sww-n8n-helpers');

escapeId('user-table');           // Returns: "[user-table]"
escapeId('dbo.Users', false);     // Returns: "[dbo].[Users]"
escapeId('dbo.Users', true);      // Returns: "[dbo.Users]" (treats as single identifier)
```

### `format(sql, values)`

Format SQL query with placeholders using tsqlstring.

```javascript
const { format } = require('sww-n8n-helpers');

// Value placeholders (?)
format('SELECT * FROM ?? WHERE id = ?', ['Users', 123]);
// Returns: "SELECT * FROM [Users] WHERE id = 123"

// Identifier placeholders (??)
format('INSERT INTO ?? (??, ??) VALUES (?, ?)', ['Users', 'name', 'email', 'John', 'john@example.com']);
// Returns: "INSERT INTO [Users] ([name], [email]) VALUES ('John', 'john@example.com')"
```

### `raw(sql)`

Create raw SQL fragment that won't be escaped.

```javascript
const { raw, format } = require('sww-n8n-helpers');

// For SQL functions that shouldn't be escaped
format('INSERT INTO Users (id, created) VALUES (?, ?)', [123, raw('GETDATE()')]);
// Returns: "INSERT INTO Users (id, created) VALUES (123, GETDATE())"
```

**⚠️ WARNING**: Only use `raw()` for trusted SQL functions. Never use with user input.

### `buildQuery(template, params)`

Build parameterized queries with named or positional parameters.

```javascript
const { buildQuery } = require('sww-n8n-helpers');

// Named parameters
buildQuery('SELECT * FROM users WHERE name = :name AND age > :age', {
  name: 'John',
  age: 18
});
// Returns: "SELECT * FROM users WHERE name = 'John' AND age > 18"

// Positional parameters
buildQuery('SELECT * FROM ?? WHERE id = ?', ['users', 123]);
// Returns: "SELECT * FROM [users] WHERE id = 123"
```

## SQL Statement Generators

### `generateInsert(tableName, data, options)`

Generate INSERT statements with proper escaping.

```javascript
const { generateInsert } = require('sww-n8n-helpers');

// Single row insert
const data = { name: "John O'Connor", email: 'john@example.com' };
generateInsert('Users', data);
// Returns: "INSERT INTO [Users] ([name], [email]) VALUES ('John O''Connor', 'john@example.com')"

// With OUTPUT clause (SQL Server)
generateInsert('Users', data, { 
  outputClause: 'OUTPUT INSERTED.UserId, INSERTED.name' 
});
// Returns: "INSERT INTO [Users] ([name], [email]) OUTPUT INSERTED.UserId, INSERTED.name VALUES ('John O''Connor', 'john@example.com')"

// With raw values (SQL functions)
const { raw } = require('sww-n8n-helpers');
generateInsert('Users', data, {
  rawValues: {
    userId: raw('NEWID()'),
    createdAt: raw('GETDATE()')
  }
});
// Returns: "INSERT INTO [Users] ([name], [email], [userId], [createdAt]) VALUES ('John O''Connor', 'john@example.com', NEWID(), GETDATE())"
```

### `generateUpdate(tableName, data, whereClause, options)`

Generate UPDATE statements with proper escaping.

```javascript
const { generateUpdate } = require('sww-n8n-helpers');

const updateData = { name: "Jane Doe", email: 'jane@example.com' };
const whereClause = { userId: 123 };

generateUpdate('Users', updateData, whereClause);
// Returns: "UPDATE [Users] SET [name] = 'Jane Doe', [email] = 'jane@example.com' WHERE [userId] = 123"

// With raw values
const { raw } = require('sww-n8n-helpers');
generateUpdate('Users', updateData, whereClause, {
  rawValues: {
    updatedAt: raw('GETDATE()')
  }
});
// Returns: "UPDATE [Users] SET [name] = 'Jane Doe', [email] = 'jane@example.com', [updatedAt] = GETDATE() WHERE [userId] = 123"
```

### `generateSelect(options)`

Generate SELECT statements with safe parameters.

```javascript
const { generateSelect } = require('sww-n8n-helpers');

// Basic select
generateSelect({
  columns: ['name', 'email'],
  from: 'Users',
  where: { active: true },
  orderBy: 'name ASC',
  limit: 10
});
// Returns: "SELECT TOP 10 [name], [email] FROM [Users] WHERE [active] = 1 ORDER BY name ASC"

// With custom WHERE clause
generateSelect({
  columns: ['*'],
  from: 'Users',
  where: { status: 'active' },
  customWhere: 'created_date > \'2024-01-01\''
});
// Returns: "SELECT [*] FROM [Users] WHERE [status] = 'active' AND (created_date > '2024-01-01')"
```

### `generateDelete(tableName, whereClause, options)`

Generate DELETE statements with proper escaping.

```javascript
const { generateDelete } = require('sww-n8n-helpers');

generateDelete('Users', { userId: 123 });
// Returns: "DELETE FROM [Users] WHERE [userId] = 123"

// With limit (SQL Server)
generateDelete('Users', { status: 'inactive' }, { limit: 100 });
// Returns: "DELETE TOP (100) FROM [Users] WHERE [status] = 'inactive'"
```

## SQL Fragments

Helper functions for common SQL patterns.

### `fragments.case(conditions, elseValue)`

Create CASE statements.

```javascript
const { fragments } = require('sww-n8n-helpers');

const caseStatement = fragments.case([
  { when: 'age < 18', then: 'Minor' },
  { when: 'age >= 65', then: 'Senior' }
], 'Adult');
// Returns: "CASE WHEN age < 18 THEN 'Minor' WHEN age >= 65 THEN 'Senior' ELSE 'Adult' END"
```

### `fragments.in(column, values)`

Create IN clauses.

```javascript
const { fragments } = require('sww-n8n-helpers');

fragments.in('status', ['active', 'pending', 'verified']);
// Returns: "[status] IN ('active', 'pending', 'verified')"
```

### `fragments.between(column, start, end)`

Create BETWEEN clauses.

```javascript
const { fragments } = require('sww-n8n-helpers');

fragments.between('created_date', '2024-01-01', '2024-12-31');
// Returns: "[created_date] BETWEEN '2024-01-01' AND '2024-12-31'"
```

## Batch Operations

### `batch.combine(statements, options)`

Combine multiple SQL statements.

```javascript
const { batch } = require('sww-n8n-helpers');

const statements = [
  "INSERT INTO Users (name) VALUES ('John')",
  "INSERT INTO Users (name) VALUES ('Jane')",
  "UPDATE Users SET active = 1"
];

batch.combine(statements);
// Returns: "INSERT INTO Users (name) VALUES ('John');\nINSERT INTO Users (name) VALUES ('Jane');\nUPDATE Users SET active = 1"

// With transaction
batch.combine(statements, { useTransaction: true });
// Returns: "BEGIN TRANSACTION;\nINSERT INTO Users (name) VALUES ('John');\nINSERT INTO Users (name) VALUES ('Jane');\nUPDATE Users SET active = 1;\nCOMMIT TRANSACTION;"
```

### `batch.bulkInsert(tableName, rows, options)`

Generate bulk INSERT statements.

```javascript
const { batch } = require('sww-n8n-helpers');

const users = [
  { name: 'John', email: 'john@example.com' },
  { name: 'Jane', email: 'jane@example.com' }
];

batch.bulkInsert('Users', users);
// Returns: Multiple INSERT statements joined with semicolons
```

## Integration Examples

### With Data Transform Module

```javascript
const { normalizeData, COMMON_FIELD_CONFIGS, generateInsert } = require('sww-n8n-helpers');

// Normalize business data
const schema = {
  title: COMMON_FIELD_CONFIGS.title,
  email: COMMON_FIELD_CONFIGS.email,
  description: COMMON_FIELD_CONFIGS.description
};

const normalizedData = normalizeData(rawData, schema);

// Generate safe SQL
const insertSQL = generateInsert('Articles', normalizedData);

return { query: insertSQL };
```

### Batch Processing with SQL Generation

```javascript
const { processItemsWithPairing, generateInsert } = require('sww-n8n-helpers');

const result = await processItemsWithPairing(
  $input.all(),
  ($item, $json, $itemIndex) => {
    // Generate INSERT for each item
    const insertSQL = generateInsert('Episodes', $json);
    
    return {
      query: insertSQL,
      itemIndex: $itemIndex
    };
  },
  {},
  { maintainPairing: true }
);

return result.results;
```

## Security Best Practices

1. **Always use parameter substitution** - Never concatenate user input directly into SQL
2. **Use escapeId for dynamic identifiers** - When table/column names come from variables
3. **Validate before SQL generation** - Use data-transform.js to normalize input first
4. **Use raw() sparingly** - Only for trusted SQL functions like GETDATE(), NEWID()
5. **Test with malicious input** - Verify SQL injection protection works

## Error Handling

All SQL generation functions will throw errors for:
- Missing required parameters
- Invalid data types
- Malformed SQL templates
- Empty WHERE clauses in DELETE statements (safety feature)

Always wrap SQL generation in try-catch blocks and handle errors appropriately.