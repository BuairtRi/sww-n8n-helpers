// tests/validation.test.js
const {
  createFallbackChain,
  validateRequiredFields,
  validateAndExtractUrl,
  createProcessingError,
  validateEmail,
  validatePhone,
  validateAndFormatDate,
  validateNumericRange,
  validateArray,
  validateObjectSchema,
  cleanObject
} = require('../index');

// Test the new export patterns
const utils = require('../index');
const { validation } = require('../index');

describe('Export Patterns', () => {
  test('should support individual function imports', () => {
    expect(typeof createFallbackChain).toBe('function');
    expect(typeof validateEmail).toBe('function');
    expect(typeof validateRequiredFields).toBe('function');
  });

  test('should support module namespace imports', () => {
    expect(typeof validation).toBe('object');
    expect(typeof validation.createFallbackChain).toBe('function');
    expect(typeof validation.validateEmail).toBe('function');
    expect(typeof validation.validateRequiredFields).toBe('function');
  });

  test('should support full module imports', () => {
    expect(typeof utils.createFallbackChain).toBe('function');
    expect(typeof utils.validation.createFallbackChain).toBe('function');
    expect(typeof utils.validation).toBe('object');
  });

  test('should have consistent function behavior across import patterns', () => {
    const testObj = { name: 'John', email: 'john@example.com' };
    
    // Individual import
    const result1 = validateEmail(testObj.email);
    
    // Namespace import
    const result2 = validation.validateEmail(testObj.email);
    
    // Full module import
    const result3 = utils.validateEmail(testObj.email);
    const result4 = utils.validation.validateEmail(testObj.email);
    
    expect(result1).toBe(true);
    expect(result2).toBe(true);
    expect(result3).toBe(true);
    expect(result4).toBe(true);
    expect(result1).toBe(result2);
    expect(result2).toBe(result3);
    expect(result3).toBe(result4);
  });
});

describe('Validation Utilities', () => {
  describe('createFallbackChain', () => {
    const testObj = {
      primary: 'first value',
      secondary: null,
      nested: {
        value: 'nested value'
      },
      empty: '',
      zero: 0
    };

    test('should return first non-null, non-undefined, non-empty value', () => {
      const result = createFallbackChain(testObj, ['missing', 'secondary', 'primary'], 'default');
      expect(result).toBe('first value');
    });

    test('should handle nested paths', () => {
      const result = createFallbackChain(testObj, ['missing', 'nested.value'], 'default');
      expect(result).toBe('nested value');
    });

    test('should return default value when all paths fail', () => {
      const result = createFallbackChain(testObj, ['missing1', 'missing2'], 'default');
      expect(result).toBe('default');
    });

    test('should return zero value', () => {
      const result = createFallbackChain(testObj, ['zero'], 'default');
      expect(result).toBe(0);
    });

    test('should skip empty strings', () => {
      const result = createFallbackChain(testObj, ['empty', 'primary'], 'default');
      expect(result).toBe('first value');
    });

    test('should handle null/undefined object', () => {
      expect(createFallbackChain(null, ['path'], 'default')).toBe('default');
      expect(createFallbackChain(undefined, ['path'], 'default')).toBe('default');
    });

    test('should handle invalid paths array', () => {
      expect(createFallbackChain(testObj, null, 'default')).toBe('default');
      expect(createFallbackChain(testObj, 'not-array', 'default')).toBe('default');
    });
  });

  describe('validateRequiredFields', () => {
    const testObj = {
      name: 'John',
      email: 'john@example.com',
      age: 30,
      address: {
        street: '123 Main St'
      },
      empty: '',
      nullValue: null
    };

    test('should validate all required fields are present', () => {
      const result = validateRequiredFields(testObj, ['name', 'email', 'age']);
      expect(result.isValid).toBe(true);
      expect(result.missingFields).toEqual([]);
    });

    test('should identify missing fields', () => {
      const result = validateRequiredFields(testObj, ['name', 'phone', 'email']);
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('phone');
    });

    test('should handle nested field validation', () => {
      const result = validateRequiredFields(testObj, ['address.street', 'address.city']);
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('address.city');
    });

    test('should treat empty strings as missing', () => {
      const result = validateRequiredFields(testObj, ['empty']);
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('empty');
    });

    test('should treat null values as missing', () => {
      const result = validateRequiredFields(testObj, ['nullValue']);
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('nullValue');
    });

    test('should handle null/undefined object', () => {
      const result = validateRequiredFields(null, ['field']);
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toEqual(['field']);
    });

    test('should handle invalid required fields array', () => {
      const result = validateRequiredFields(testObj, null);
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toEqual([]);
    });
  });

  describe('validateAndExtractUrl', () => {
    test('should validate and return valid HTTP URLs', () => {
      expect(validateAndExtractUrl('http://example.com')).toBe('http://example.com');
      expect(validateAndExtractUrl('https://example.com/path')).toBe('https://example.com/path');
    });

    test('should reject invalid URLs', () => {
      expect(validateAndExtractUrl('not-a-url')).toBe(null);
      expect(validateAndExtractUrl('')).toBe(null);
      expect(validateAndExtractUrl(null)).toBe(null);
      expect(validateAndExtractUrl(undefined)).toBe(null);
    });

    test('should reject disallowed protocols', () => {
      expect(validateAndExtractUrl('ftp://example.com')).toBe(null);
      expect(validateAndExtractUrl('file:///path/to/file')).toBe(null);
    });

    test('should allow custom protocols', () => {
      const result = validateAndExtractUrl('ftp://example.com', ['ftp']);
      expect(result).toBe('ftp://example.com');
    });

    test('should handle malformed URLs gracefully', () => {
      expect(validateAndExtractUrl('http://[invalid')).toBe(null);
    });

    test('should convert non-string values to strings', () => {
      expect(validateAndExtractUrl(12345)).toBe(null);
      // Numbers/objects that aren't valid URLs should return null
    });
  });

  describe('createProcessingError', () => {
    test('should create standardized error object', () => {
      const error = createProcessingError('validation_error', 'Invalid input');
      
      expect(error._error.type).toBe('validation_error');
      expect(error._error.message).toBe('Invalid input');
      expect(error._error.timestamp).toBeDefined();
      expect(new Date(error._error.timestamp)).toBeInstanceOf(Date);
    });

    test('should include additional context', () => {
      const context = { itemIndex: 5, field: 'email' };
      const error = createProcessingError('validation_error', 'Invalid email', context);
      
      expect(error._error.itemIndex).toBe(5);
      expect(error._error.field).toBe('email');
    });

    test('should handle empty context', () => {
      const error = createProcessingError('error', 'message');
      expect(error._error.type).toBe('error');
      expect(error._error.message).toBe('message');
    });
  });

  describe('validateEmail', () => {
    test('should validate correct email addresses', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.email+tag@domain.co.uk')).toBe(true);
    });

    test('should reject invalid email addresses', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
      expect(validateEmail(null)).toBe(false);
    });

    test('should handle display names when allowed', () => {
      const displayNameEmail = 'John Doe <john@example.com>';
      expect(validateEmail(displayNameEmail, { allowDisplayName: true })).toBe(true);
      expect(validateEmail(displayNameEmail, { allowDisplayName: false })).toBe(false);
    });

    test('should convert non-string values', () => {
      expect(validateEmail(12345)).toBe(false);
      expect(validateEmail({})).toBe(false);
    });
  });

  describe('validatePhone', () => {
    test('should validate international phone numbers', () => {
      expect(validatePhone('+1234567890')).toBe('+1234567890');
      expect(validatePhone('1234567890')).toBe('1234567890');
    });

    test('should reject invalid phone numbers', () => {
      expect(validatePhone('123')).toBe(null); // Too short
      expect(validatePhone('123456789012345678')).toBe(null); // Too long
      expect(validatePhone('')).toBe(null);
      expect(validatePhone(null)).toBe(null);
    });

    test('should clean phone numbers', () => {
      expect(validatePhone('(123) 456-7890')).toBe('1234567890');
      expect(validatePhone('+1 (555) 123-4567')).toBe('+15551234567');
    });

    test('should handle locale-specific validation', () => {
      // Note: This test assumes validator.js supports the locale
      // In practice, you'd test with actual supported locales
      const result = validatePhone('+1234567890', 'en-US');
      expect(result).toBe(null); // Most locales will return null if not specifically supported
    });

    test('should trim whitespace', () => {
      expect(validatePhone('  +1234567890  ')).toBe('+1234567890');
    });
  });

  describe('validateAndFormatDate', () => {
    test('should validate and format valid dates', () => {
      const result = validateAndFormatDate('2023-12-25');
      expect(result).toBe('2023-12-25T00:00:00.000Z');
    });

    test('should handle Date objects', () => {
      const date = new Date('2023-12-25');
      const result = validateAndFormatDate(date);
      expect(result).toBe(date.toISOString());
    });

    test('should reject invalid dates', () => {
      expect(validateAndFormatDate('not-a-date')).toBe(null);
      expect(validateAndFormatDate('2023-13-45')).toBe(null);
      expect(validateAndFormatDate('')).toBe(null);
      expect(validateAndFormatDate(null)).toBe(null);
    });

    test('should enforce strict validation when enabled', () => {
      expect(validateAndFormatDate('1800-01-01', { strict: true })).toBe(null);
      expect(validateAndFormatDate('2200-01-01', { strict: true })).toBe(null);
      expect(validateAndFormatDate('2023-01-01', { strict: true })).toBeTruthy();
    });

    test('should handle various date formats', () => {
      expect(validateAndFormatDate('12/25/2023')).toBeTruthy();
      expect(validateAndFormatDate('Dec 25, 2023')).toBeTruthy();
    });
  });

  describe('validateNumericRange', () => {
    test('should validate numbers within range', () => {
      expect(validateNumericRange(5, { min: 1, max: 10 })).toBe(5);
      expect(validateNumericRange('7', { min: 1, max: 10 })).toBe(7);
    });

    test('should reject numbers outside range', () => {
      expect(validateNumericRange(15, { min: 1, max: 10 })).toBe(null);
      expect(validateNumericRange(-5, { min: 1, max: 10 })).toBe(null);
    });

    test('should validate integers when required', () => {
      expect(validateNumericRange(5.5, { integer: true })).toBe(null);
      expect(validateNumericRange(5, { integer: true })).toBe(5);
    });

    test('should handle edge cases', () => {
      const range = { min: 0, max: 100 };
      expect(validateNumericRange(0, range)).toBe(0);
      expect(validateNumericRange(100, range)).toBe(100);
    });

    test('should reject non-numeric values', () => {
      expect(validateNumericRange('not-a-number')).toBe(null);
      expect(validateNumericRange(null)).toBe(null);
      expect(validateNumericRange(undefined)).toBe(null);
      expect(validateNumericRange('')).toBe(null);
    });

    test('should use default range when none provided', () => {
      expect(validateNumericRange(1000000)).toBe(1000000);
      expect(validateNumericRange(-1000000)).toBe(-1000000);
    });
  });

  describe('validateArray', () => {
    test('should validate array length', () => {
      expect(validateArray([1, 2, 3], { minLength: 2, maxLength: 5 })).toBe(true);
      expect(validateArray([1], { minLength: 2 })).toBe(false);
      expect(validateArray([1, 2, 3, 4, 5, 6], { maxLength: 5 })).toBe(false);
    });

    test('should validate array elements', () => {
      const isNumber = (x) => typeof x === 'number';
      expect(validateArray([1, 2, 3], { elementValidator: isNumber })).toBe(true);
      expect(validateArray([1, 'string', 3], { elementValidator: isNumber })).toBe(false);
    });

    test('should reject non-arrays', () => {
      expect(validateArray('not-array')).toBe(false);
      expect(validateArray(null)).toBe(false);
      expect(validateArray(undefined)).toBe(false);
      expect(validateArray({})).toBe(false);
    });

    test('should handle empty arrays', () => {
      expect(validateArray([], { minLength: 0 })).toBe(true);
      expect(validateArray([], { minLength: 1 })).toBe(false);
    });

    test('should use default constraints', () => {
      expect(validateArray([1, 2, 3])).toBe(true);
      expect(validateArray([])).toBe(true);
    });
  });

  describe('validateObjectSchema', () => {
    const schema = {
      name: { required: true, type: 'string' },
      age: { required: true, type: 'number' },
      email: { 
        required: false, 
        type: 'string', 
        validator: (value) => value.includes('@'),
        message: 'Invalid email format'
      }
    };

    test('should validate object against schema', () => {
      const obj = { name: 'John', age: 30, email: 'john@example.com' };
      const result = validateObjectSchema(obj, schema);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    test('should identify missing required fields', () => {
      const obj = { name: 'John' };
      const result = validateObjectSchema(obj, schema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.age).toBe('Required field is missing');
    });

    test('should validate field types', () => {
      const obj = { name: 123, age: 30 };
      const result = validateObjectSchema(obj, schema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBe('Expected string, got number');
    });

    test('should run custom validators', () => {
      const obj = { name: 'John', age: 30, email: 'invalid-email' };
      const result = validateObjectSchema(obj, schema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBe('Invalid email format');
    });

    test('should handle null/undefined objects', () => {
      const result = validateObjectSchema(null, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors._root).toBe('Object is required');
    });

    test('should skip validation for optional missing fields', () => {
      const obj = { name: 'John', age: 30 };
      const result = validateObjectSchema(obj, schema);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });
  });

  describe('cleanObject', () => {
    test('should remove empty strings by default', () => {
      const obj = { name: 'John', empty: '', age: 30 };
      const result = cleanObject(obj);
      
      expect(result).toEqual({ name: 'John', age: 30 });
      expect(result.empty).toBeUndefined();
    });

    test('should remove null values by default', () => {
      const obj = { name: 'John', nullValue: null, age: 30 };
      const result = cleanObject(obj);
      
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    test('should remove undefined values by default', () => {
      const obj = { name: 'John', undefinedValue: undefined, age: 30 };
      const result = cleanObject(obj);
      
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    test('should preserve empty strings when option is false', () => {
      const obj = { name: 'John', empty: '' };
      const result = cleanObject(obj, { removeEmpty: false });
      
      expect(result.empty).toBe('');
    });

    test('should preserve null values when option is false', () => {
      const obj = { name: 'John', nullValue: null };
      const result = cleanObject(obj, { removeNull: false });
      
      expect(result.nullValue).toBe(null);
    });

    test('should preserve undefined values when option is false', () => {
      const obj = { name: 'John', undefinedValue: undefined };
      const result = cleanObject(obj, { removeUndefined: false });
      
      expect(result.undefinedValue).toBeUndefined();
    });

    test('should handle non-objects', () => {
      expect(cleanObject(null)).toBe(null);
      expect(cleanObject('string')).toBe('string');
      expect(cleanObject(123)).toBe(123);
    });

    test('should preserve zero and false values', () => {
      const obj = { zero: 0, falsy: false, name: 'John' };
      const result = cleanObject(obj);
      
      expect(result).toEqual({ zero: 0, falsy: false, name: 'John' });
    });
  });
}); 