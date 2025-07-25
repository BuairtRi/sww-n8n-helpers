# Validation Utilities Module

Data validation, error handling, and fallback utilities for robust n8n workflows.

## Import Options

```javascript
// Individual function imports (recommended for most use cases)
const { createFallbackChain, validateEmail } = require('sww-n8n-helpers');

// Module namespace imports for grouped functionality
const { validation } = require('sww-n8n-helpers');
// Then use: validation.createFallbackChain()

// Full module import
const utils = require('sww-n8n-helpers');
// Then use: utils.createFallbackChain() or utils.validation.validateEmail()
```

## Key Functions

### `createFallbackChain(obj, paths, defaultValue)`

Try multiple property paths until one succeeds.

```javascript
const { createFallbackChain } = require('sww-n8n-helpers');

const data = { user: { profile: { name: 'John' } }, title: null };

const name = createFallbackChain(data, ['user.name', 'user.profile.name', 'title'], 'Anonymous');
// Returns: 'John' (found at user.profile.name)

const email = createFallbackChain(data, ['email', 'user.email'], 'no-email@example.com');
// Returns: 'no-email@example.com' (no paths found)
```

### `validateRequiredFields(obj, requiredFields)`

Check if required fields exist and are not empty.

```javascript
const { validateRequiredFields } = require('sww-n8n-helpers');

const user = { name: 'John', email: '', age: 25 };

const result = validateRequiredFields(user, ['name', 'email', 'phone']);
// Returns: { isValid: false, missingFields: ['email', 'phone'] }

const result2 = validateRequiredFields(user, ['name', 'age']);
// Returns: { isValid: true, missingFields: [] }
```

### `validateAndExtractUrl(value, allowedProtocols)`

Validate and extract clean URLs.

```javascript
const { validateAndExtractUrl } = require('sww-n8n-helpers');

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
const { validateEmail } = require('sww-n8n-helpers');

const valid = validateEmail('user@example.com');
// Returns: true

const invalid = validateEmail('not-an-email');
// Returns: false

const withDisplayName = validateEmail('John Doe <john@example.com>', { allowDisplayName: true });
// Returns: true
```

### `validatePhone(phone, locale)`

Validate and normalize phone numbers.

```javascript
const { validatePhone } = require('sww-n8n-helpers');

const phone1 = validatePhone('+1234567890');
// Returns: '+1234567890'

const phone2 = validatePhone('(123) 456-7890');
// Returns: '1234567890' (cleaned)

const phone3 = validatePhone('123', 'any');
// Returns: null (too short)
```

### `validateAndFormatDate(date, options)`

Validate dates and return ISO format.

```javascript
const { validateAndFormatDate } = require('sww-n8n-helpers');

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
const { validateNumericRange } = require('sww-n8n-helpers');

const age = validateNumericRange('25', { min: 0, max: 120 });
// Returns: 25

const price = validateNumericRange('99.99', { min: 0, integer: false });
// Returns: 99.99

const invalid = validateNumericRange('150', { min: 0, max: 100 });
// Returns: null (out of range)
```

### `validateArray(array, constraints)`

Validate arrays with length and element constraints.

```javascript
const { validateArray } = require('sww-n8n-helpers');

const numbers = validateArray([1, 2, 3], { minLength: 2, maxLength: 5 });
// Returns: true

const withValidator = validateArray([1, 2, 3], { 
  elementValidator: (x) => typeof x === 'number' 
});
// Returns: true

const invalid = validateArray([1, 'string'], { 
  elementValidator: (x) => typeof x === 'number' 
});
// Returns: false
```

### `validateObjectSchema(obj, schema)`

Deep validation of nested object structures.

```javascript
const { validateObjectSchema } = require('sww-n8n-helpers');

const schema = {
  name: { required: true, type: 'string' },
  age: { required: true, type: 'number' },
  email: { 
    required: false, 
    validator: (value) => value.includes('@'),
    message: 'Invalid email format'
  }
};

const user = { name: 'John', age: 30, email: 'john@example.com' };
const result = validateObjectSchema(user, schema);
// Returns: { isValid: true, errors: {} }

const invalid = { name: 'John', age: 'thirty' };
const result2 = validateObjectSchema(invalid, schema);
// Returns: { isValid: false, errors: { age: 'Expected number, got string' } }
```

### `cleanObject(obj, options)`

Remove empty, null, or undefined values.

```javascript
const { cleanObject } = require('sww-n8n-helpers');

const messy = { name: 'John', email: '', age: null, active: true, notes: undefined };

const cleaned = cleanObject(messy);
// Returns: { name: 'John', active: true }

const keepNull = cleanObject(messy, { removeNull: false });
// Returns: { name: 'John', age: null, active: true }
```

### `createProcessingError(type, message, context)`

Create standardized error objects for failed processing.

```javascript
const { createProcessingError } = require('sww-n8n-helpers');

const error = createProcessingError('validation_error', 'Invalid email format', { 
  field: 'email', 
  itemIndex: 5 
});
// Returns: { _error: { type: 'validation_error', message: '...', timestamp: '...', field: 'email', itemIndex: 5 } }
```

## Integration Examples

### Data Validation Pipeline

```javascript
const { validateRequiredFields, validateEmail, createFallbackChain } = require('sww-n8n-helpers');

const userData = { firstName: 'John', contact: { email: 'john@example.com' } };

// Validate required fields
const validation = validateRequiredFields(userData, ['firstName', 'email']);

// Get email with fallback
const email = createFallbackChain(userData, ['email', 'contact.email', 'user.email']);

// Validate email format
const isValidEmail = validateEmail(email);

// Result: validation shows missing 'email', but fallback finds 'contact.email'
```

### Module Namespace Example

```javascript
const { validation } = require('sww-n8n-helpers');

const userData = { name: 'John', email: 'john@test.com', age: '25' };

const cleaned = validation.cleanObject(userData);
const validAge = validation.validateNumericRange(cleaned.age, { min: 0, max: 120 });
const validEmail = validation.validateEmail(cleaned.email);
```

### Form Data Cleaning

```javascript
const { cleanObject, validateNumericRange, validateEmail } = require('sww-n8n-helpers');

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
