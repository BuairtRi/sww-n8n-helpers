# External npm Packages Available in n8n Environment

## Overview
This document lists external npm packages available in our n8n environment. These packages are **external to the sww-n8n-helpers project** and can be used in two ways:

1. **Directly in n8n Code nodes** - Import and use these packages in custom Code node implementations
2. **Within sww-n8n-helpers functions** - Our custom helper functions and capabilities can leverage these packages internally

These packages have been installed in the n8n Docker container and configured with the appropriate environment variables.

## Environment Configuration
```yaml
# In docker-compose.yml
NODE_FUNCTION_ALLOW_BUILTIN: "*"
NODE_FUNCTION_ALLOW_EXTERNAL: "*"
```

**Note:** Task runners must be disabled for external packages to work properly.

## Available Packages

### Core Utility Libraries

#### **lodash**
- **Usage:** `const _ = require('lodash');`
- **Purpose:** Comprehensive utility library for data manipulation
- **Key Functions:** `_.get()`, `_.truncate()`, `_.filter()`, `_.find()`, `_.isEmpty()`, `_.isArray()`, `_.cloneDeep()`
- **Best Practice:** Use `_.cloneDeep()` to avoid read-only property errors in n8n

#### **moment**
- **Usage:** `const moment = require('moment');`
- **Purpose:** Date/time parsing, formatting, and manipulation
- **Key Functions:** `moment().format()`, `moment().isValid()`, `moment().toISOString()`
- **Common Formats:** `'MMMM D, YYYY'` for friendly dates

### HTML/Text Processing

#### **cheerio**
- **Usage:** `const cheerio = require('cheerio');`
- **Purpose:** Server-side jQuery-like HTML parsing and manipulation
- **Example:**
  ```javascript
  const $ = cheerio.load(html);
  $('script, style, iframe').remove();
  const cleanText = $.text().trim();
  ```

### Data Validation & Sanitization

#### **validator**
- **Usage:** `const validator = require('validator');`
- **Purpose:** String validation and sanitization
- **Key Functions:** `validator.isURL()`, `validator.isEmail()`, `validator.toBoolean()`
- **Example:** `validator.isURL(String(url))`

#### **tsqlstring** 🔒 **SECURITY CRITICAL**
- **Usage:** `const SqlString = require('tsqlstring');`
- **Purpose:** **T-SQL/SQL Server specific string sanitization and escaping**
- **Key Functions:** `SqlString.escape()`, `SqlString.escapeId()`, `SqlString.format()`
- **Security Use:** **PREVENTS SQL INJECTION** by properly escaping SQL strings for SQL Server
- **Critical Role:** **Required dependency for all sww-n8n-helpers SQL functions**
- **T-SQL Specific:** Designed specifically for Microsoft SQL Server, not generic SQL
- **Example:** 
  ```javascript
  const SqlString = require('tsqlstring');
  
  // String escaping with proper T-SQL quote doubling
  const safeName = SqlString.escape("O'Reilly");
  // Returns: "'O''Reilly'" (T-SQL compatible)
  
  // Identifier escaping with SQL Server brackets
  const safeTable = SqlString.escapeId('user-table');
  // Returns: "[user-table]"
  
  // Safe query building with placeholders
  const query = SqlString.format(
    'SELECT * FROM ?? WHERE name = ? AND active = ?',
    ['Users', "O'Connor", true]
  );
  // Returns: "SELECT * FROM [Users] WHERE name = 'O''Connor' AND active = 1"
  ```
- **⚠️ SECURITY WARNING:** Do NOT use mysql, pg-escape, or generic SQL libraries with SQL Server - they are not T-SQL compatible and can leave you vulnerable to injection attacks.

### File Handling

#### **sanitize-filename**
- **Usage:** `const sanitize = require('sanitize-filename');`
- **Purpose:** Generate safe filenames for cross-platform compatibility
- **Example:** `sanitize('My File.txt', { replacement: '_' })` → `'My_File.txt'`

#### **pretty-bytes**
- **Usage:** `const prettyBytes = require('pretty-bytes');`
- **Purpose:** Convert bytes to human-readable format
- **Example:** `prettyBytes(1024)` → `'1 kB'`

### Duration/Time Parsing

#### **parse-duration**
- **Usage:** `const parseDuration = require('parse-duration');`
- **Purpose:** Parse human-readable duration strings to milliseconds
- **Returns:** Milliseconds (convert to seconds with `/ 1000`)
- **Formats Supported:**
  - Human readable: `'1h 30m'`, `'90 minutes'`
  - Some time formats: `'1:30'` (limited support)
- **Limitation:** Does not handle `HH:MM:SS` format well - use fallback parser

## Usage Context

### In Code Nodes
These packages can be imported directly in n8n Code nodes for custom processing:
```javascript
// Direct usage in Code node
const _ = require('lodash');
const validator = require('validator');
const tsqlstring = require('tsqlstring');

// Your custom code logic here
```

### In sww-n8n-helpers Functions  
Our custom helper functions leverage these packages internally for robust functionality:

- **SQL Sanitization Module**: **Depends entirely on `tsqlstring`** for all SQL escaping and injection prevention
- **Text Processing Functions**: Use `cheerio` for HTML cleaning and parsing
- **Batch Processing**: Leverages `lodash` for data manipulation and error handling
- **Duration Utilities**: Use `parse-duration` with custom fallbacks for time parsing
- **File Utilities**: Use `sanitize-filename` for cross-platform safe filename generation

**🔒 CRITICAL DEPENDENCY**: The SQL sanitization module cannot function without `tsqlstring` - it's not optional.

## Usage Patterns

### Safe Object Handling
```javascript
// Direct access is safe when task runners are disabled
const episode = item.json;

// Safe property access with lodash
const author = _.get(episode, 'itunes.author') || 'Unknown';

// Only use cloneDeep if you encounter read-only property errors
// const episode = _.cloneDeep(item.json); // Usually not needed
```

### Text Processing Pipeline
```javascript
// Clean HTML and truncate safely
const cleanText = cleanHtml(rawContent);
const truncated = _.truncate(cleanText, { length: 4000, separator: ' ' });
```

### Duration Parsing (Robust)
```javascript
function parseDurationToSeconds(duration) {
  // Try parse-duration first
  try {
    const ms = parseDuration(String(duration));
    if (ms) return Math.round(ms / 1000);
  } catch (e) {}
  
  // Fallback for HH:MM:SS format
  if (duration.includes(':')) {
    const parts = duration.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
  }
  return null;
}
```

### URL Validation
```javascript
// Always validate URLs before using
const isValid = url && validator.isURL(String(url));
const safeUrl = isValid ? String(url) : null;
```

### Date Handling
```javascript
// Parse and format dates safely
const momentDate = moment(dateString);
if (momentDate.isValid()) {
  const isoDate = momentDate.toISOString();
  const friendlyDate = momentDate.format('MMMM D, YYYY');
}
```

## Common Patterns

### Error Handling with Package Loading
```javascript
console.log("Loading packages...");
try {
  const _ = require('lodash');
  console.log("✅ lodash loaded");
  const cheerio = require('cheerio');
  console.log("✅ cheerio loaded");
  // ... other packages
} catch (error) {
  console.error("❌ Package loading failed:", error.message);
  return [{json: {error: `Package loading failed: ${error.message}`}}];
}
```

### Data Normalization Pipeline
```javascript
// Standard pattern for RSS/API data normalization
const inputItems = $input.all();
const outputItems = [];

for (let i = 0; i < inputItems.length; i++) {
  const item = inputItems[i];
  
  try {
    // Direct access is safe with task runners disabled
    const data = item.json;
    
    // Normalize with packages
    const normalized = {
      title: _.truncate(String(data.title || ''), { length: 250, separator: ' ' }),
      url: validator.isURL(String(data.url || '')) ? String(data.url) : null,
      date: moment(data.date).toISOString(),
      dateFriendly: moment(data.date).format('MMMM D, YYYY'),
      duration: parseDurationToSeconds(data.duration),
      fileName: sanitize(`${data.title}.mp3`, { replacement: '_' })
    };
    
    outputItems.push({
      json: normalized,
      pairedItem: i
    });
    
  } catch (error) {
    // Maintain pairing on errors
    outputItems.push({
      json: { _error: { message: error.message } },
      pairedItem: i
    });
  }
}

return outputItems;
```

## Package Installation Notes

### Current Setup
- Packages are installed via Docker exec: `docker exec -it n8n npm install <package>`
- Requires container restart after installation
- Environment variables are already configured for external package access

### Adding New Packages
1. Install in container: `docker exec -it n8n npm install <package-name>`
2. Restart container: `docker restart n8n`
3. Test in simple code node first
4. Consider if the package should be integrated into sww-n8n-helpers functions
5. Update this document with usage patterns

## Troubleshooting

### Common Issues
- **"Cannot assign to read only property 'toString'"** → Usually caused by task runners being enabled. Disable task runners first. If issue persists, use `_.cloneDeep()` on input objects
- **"Package not found"** → Check if package is installed and container restarted
- **Task runners enabled** → **CRITICAL:** Disable task runners for external packages to work properly
- **Parse-duration fails on HH:MM:SS** → Use fallback custom parser

### Debug Pattern
```javascript
console.log("🚀 Code node starting");
try {
  const _ = require('lodash');
  console.log("✅ lodash available");
  // Test each package...
} catch (error) {
  console.error("❌ Package error:", error.message);
}
```

## Best Practices
1. **Disable task runners** for external packages to work properly
2. **Direct object access is usually safe** when task runners are disabled (`const data = item.json`)
3. **Use `_.cloneDeep()` only if needed** - if you encounter read-only property errors after disabling task runners
4. **Validate external data** with validator.js before using
5. **Handle package failures gracefully** with try/catch blocks
6. **Log package loading** for debugging
7. **Maintain item pairing** in error scenarios
8. **Use consistent text truncation** with lodash
9. **Sanitize filenames** for cross-platform compatibility

---

*Last Updated: Based on working configuration with n8n Docker setup*