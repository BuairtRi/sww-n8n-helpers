# Validation Utilities Module

Data validation, error handling, and fallback utilities for robust n8n workflows.

## Key Functions

### `createFallbackChain(obj, paths, defaultValue)`

Try multiple property paths until one succeeds.

```javascript
const { createFallbackChain } = require('@rin8n/content-processing-utils');

const data = { user: { profile: { name: 'John' } }, title: null };

const name = createFallbackChain(data, ['user.name', 'user.profile.name', 'title'], 'Anonymous');
// Returns: 'John' (found at user.profile.name)

const email = createFallbackChain(data, ['email', 'user.email'], 'no-email@example.com');
// Returns: 'no-email@example.com' (no paths found)
```

### `validateRequiredFields(obj, requiredFields)`

Check if required fields exist and are not empty.

```javascript
const { validateRequiredFields } = require('@rin8n/content-processing-utils');

const user = { name: 'John', email: '', age: 25 };

const result = validateRequiredFields(user, ['name', 'email', 'phone']);
// Returns: { isValid: false, missingFields: ['email', 'phone'] }

const result2 = validateRequiredFields(user, ['name', 'age']);
// Returns: { isValid: true, missingFields: [] }
```

### `validateAndExtractUrl(value, allowedProtocols)`

Validate and extract clean URLs.

```javascript
const { validateAndExtractUrl } = require('@rin8n/content-processing-utils');

const url1 = validateAndExtractUrl('https://example.com/path');
// Returns: 'https://example.com/path'

const url2 = validateAndExtractUrl('ftp://files.example.com');
// Returns: null (ftp not in default allowed protocols)

const url3 = validateAndExtractUrl('https://example.com', ['https', 'ftp']);
// Returns: 'https://example.com'
```

### `validateEmail(email, options)`

Validate email addresses with options.

```javascript
const { validateEmail } = require('@rin8n/content-processing-utils');

const valid = validateEmail('user@example.com');
// Returns: true

const invalid = validateEmail('not-an-email');
// Returns: false

const withDisplayName = validateEmail('John Doe <john@example.com>', { allowDisplayName: true });
// Returns: true
```

### `validateAndFormatDate(date, options)`

Validate dates and return ISO format.

```javascript
const { validateAndFormatDate } = require('@rin8n/content-processing-utils');

const date1 = validateAndFormatDate('2024-01-15');
// Returns: '2024-01-15T00:00:00.000Z'

const date2 = validateAndFormatDate('invalid-date');
// Returns: null

const date3 = validateAndFormatDate('1800-01-01', { strict: true });
// Returns: null (year too old in strict mode)
```

### `validateNumericRange(value, range)`

Validate numbers within specified ranges.

```javascript
const { validateNumericRange } = require('@rin8n/content-processing-utils');

const age = validateNumericRange('25', { min: 0, max: 120 });
// Returns: 25

const price = validateNumericRange('99.99', { min: 0, integer: false });
// Returns: 99.99

const invalid = validateNumericRange('150', { min: 0, max: 100 });
// Returns: null (out of range)
```

### `cleanObject(obj, options)`

Remove empty, null, or undefined values.

```javascript
const { cleanObject } = require('@rin8n/content-processing-utils');

const messy = { name: 'John', email: '', age: null, active: true, notes: undefined };

const cleaned = cleanObject(messy);
// Returns: { name: 'John', active: true }

const keepNull = cleanObject(messy, { removeNull: false });
// Returns: { name: 'John', age: null, active: true }
```

## Integration Examples

### Data Validation Pipeline
```javascript
const { validateRequiredFields, validateEmail, createFallbackChain } = require('@rin8n/content-processing-utils');

const userData = { firstName: 'John', contact: { email: 'john@example.com' } };

// Validate required fields
const validation = validateRequiredFields(userData, ['firstName', 'email']);

// Get email with fallback
const email = createFallbackChain(userData, ['email', 'contact.email', 'user.email']);

// Validate email format
const isValidEmail = validateEmail(email);

// Result: validation shows missing 'email', but fallback finds 'contact.email'
```

### Form Data Cleaning
```javascript
const { cleanObject, validateNumericRange, validateEmail } = require('@rin8n/content-processing-utils');

const formData = { name: 'John', email: 'john@test.com', age: '25', notes: '', active: 'true' };

const cleaned = cleanObject(formData); // Remove empty notes
const validAge = validateNumericRange(cleaned.age, { min: 0, max: 120 });
const validEmail = validateEmail(cleaned.email);

// Returns clean, validated data
```

## Error Handling

All validation functions return predictable types:
- `null` for invalid/missing data
- `false` for boolean validations
- Objects with `isValid` property for complex validations

This makes them safe to use in n8n expressions and conditional logic. 