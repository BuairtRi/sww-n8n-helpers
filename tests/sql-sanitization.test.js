const {
  sanitizeForSQL,
  sanitizeByFieldType,
  sanitizeObject,
  validateSanitizedText,
  sanitizeItemsBatch,
  parseFieldList,
  DEFAULT_FIELD_MAPPINGS
} = require('../index');

describe('SQL Sanitization Utilities', () => {
  
  describe('sanitizeForSQL', () => {
    test('handles null and undefined values', () => {
      expect(sanitizeForSQL(null)).toBeNull();
      expect(sanitizeForSQL(undefined)).toBeNull();
      expect(sanitizeForSQL('')).toBeNull();
    });

    test('escapes single quotes correctly', () => {
      expect(sanitizeForSQL("O'Reilly")).toBe("O''Reilly");
      expect(sanitizeForSQL("It's a test")).toBe("It''s a test");
    });

    test('escapes backslashes', () => {
      expect(sanitizeForSQL('C:\\path\\to\\file')).toBe('C:\\\\path\\\\to\\\\file');
    });

    test('removes dangerous characters', () => {
      expect(sanitizeForSQL('test\0null')).toBe('testnull');
      expect(sanitizeForSQL('test\x1asub')).toBe('testsub');
    });

    test('handles length limits', () => {
      const longText = 'a'.repeat(100);
      const result = sanitizeForSQL(longText, { maxLength: 50 });
      expect(result).toBe('a'.repeat(47) + '...');
      expect(result.length).toBe(50);
    });

    test('strict mode removes SQL keywords', () => {
      const maliciousText = "'; DROP TABLE users; --";
      const result = sanitizeForSQL(maliciousText, { strictMode: true });
      expect(result).toBe("'';");
    });

    test('converts objects to JSON strings', () => {
      const obj = { name: "test", value: 123 };
      const result = sanitizeForSQL(obj);
      expect(result).toBe('{"name":"test","value":123}');
    });
  });

  describe('sanitizeByFieldType', () => {
    test('title fields use strict mode and length limits', () => {
      const longTitle = 'A'.repeat(300);
      const result = sanitizeByFieldType(longTitle, 'title');
      expect(result.length).toBeLessThanOrEqual(250);
      expect(result.endsWith('...')).toBe(true);
    });

    test('content fields allow newlines', () => {
      const content = 'Line 1\nLine 2\r\nLine 3';
      const result = sanitizeByFieldType(content, 'content');
      expect(result).toContain('\n');
    });

    test('URL fields remove quotes and spaces', () => {
      const url = ' "https://example.com/path?q=test" ';
      const result = sanitizeByFieldType(url, 'url');
      expect(result).toBe('https://example.com/path?q=test');
    });

    test('email fields are normalized', () => {
      const email = ' Test@EXAMPLE.COM; ';
      const result = sanitizeByFieldType(email, 'email');
      expect(result).toBe('test@example.com');
    });

    test('JSON fields validate JSON syntax', () => {
      const validJson = '{"test": "value"}';
      const invalidJson = '{test: value}';
      
      expect(sanitizeByFieldType(validJson, 'json')).toBeTruthy();
      expect(sanitizeByFieldType(invalidJson, 'json')).toBeTruthy(); // Still sanitized, but with warnings
    });
  });

  describe('parseFieldList', () => {
    test('parses comma-separated field names', () => {
      expect(parseFieldList('name,email,phone')).toEqual(['name', 'email', 'phone']);
      expect(parseFieldList(' title , description , url ')).toEqual(['title', 'description', 'url']);
    });

    test('returns null for empty or invalid input', () => {
      expect(parseFieldList('')).toBeNull();
      expect(parseFieldList(null)).toBeNull();
      expect(parseFieldList(undefined)).toBeNull();
    });

    test('filters out empty field names', () => {
      expect(parseFieldList('name,,email,  ,phone')).toEqual(['name', 'email', 'phone']);
    });
  });

  describe('sanitizeObject', () => {
    const testObject = {
      name: "John O'Connor",
      email: " JOHN@EXAMPLE.COM ",
      description: "Multi\nline\ncontent",
      url: "https://example.com",
      age: 30,
      active: true
    };

    test('sanitizes all string fields by default', () => {
      const result = sanitizeObject(testObject);
      
      expect(result.nameSanitized).toBe("John O''Connor");
      expect(result.emailSanitized).toBe("john@example.com");
      expect(result.descriptionSanitized).toContain('\n');
      expect(result.urlSanitized).toBe("https://example.com");
      expect(result.ageSanitized).toBe(30); // Should convert number to string and sanitize
    });

    test('processes only specified fields when fieldsToProcess provided', () => {
      const result = sanitizeObject(testObject, {}, ['name', 'email']);
      
      expect(result.nameSanitized).toBeDefined();
      expect(result.emailSanitized).toBeDefined();
      expect(result.descriptionSanitized).toBeUndefined();
      expect(result.urlSanitized).toBeUndefined();
    });

    test('uses field mappings for type-specific sanitization', () => {
      const fieldMappings = {
        name: { type: 'title', maxLength: 20 },
        email: { type: 'email' },
        description: { type: 'content' }
      };
      
      const result = sanitizeObject(testObject, fieldMappings);
      
      expect(result.nameSanitized).toBe("John O''Connor");
      expect(result.emailSanitized).toBe("john@example.com");
    });

    test('includes original values when requested', () => {
      const result = sanitizeObject(testObject, {}, null, { includeOriginal: true });
      
      expect(result.name).toBe("John O'Connor"); // Original
      expect(result.nameSanitized).toBe("John O''Connor"); // Sanitized
    });
  });

  describe('validateSanitizedText', () => {
    test('identifies complete text removal', () => {
      const issues = validateSanitizedText('some text', null, 'testField');
      expect(issues).toContain('testField: Text was completely removed during sanitization');
    });

    test('identifies significant truncation', () => {
      const original = 'A'.repeat(100);
      const sanitized = 'A'.repeat(30);
      const issues = validateSanitizedText(original, sanitized, 'testField');
      expect(issues).toContain('testField: Text was significantly truncated (100 -> 30 chars)');
    });

    test('identifies length-based truncation', () => {
      const issues = validateSanitizedText('original', 'truncated...', 'testField');
      expect(issues).toContain('testField: Text was truncated due to length limits');
    });

    test('returns empty array for valid sanitization', () => {
      const issues = validateSanitizedText('test', 'test', 'testField');
      expect(issues).toEqual([]);
    });
  });

  describe('sanitizeItemsBatch', () => {
    const testItems = [
      {
        name: "John O'Connor",
        email: "john@example.com",
        description: "User description"
      },
      {
        objectToSanitize: {
          title: "Article O'Title",
          content: "Article content with\nnewlines"
        },
        fieldsToSanitize: "title,content"
      }
    ];

    test('processes multiple items with pairing', () => {
      const result = sanitizeItemsBatch(testItems);
      
      expect(result).toHaveLength(2);
      expect(result[0].pairedItem).toBe(0);
      expect(result[1].pairedItem).toBe(1);
    });

    test('handles objectToSanitize parameter', () => {
      const result = sanitizeItemsBatch(testItems);
      
      // First item processes the item itself
      expect(result[0].json.nameSanitized).toBe("John O''Connor");
      
      // Second item processes the objectToSanitize
      expect(result[1].json.titleSanitized).toBe("Article O''Title");
      expect(result[1].json.contentSanitized).toContain('\n');
    });

    test('includes processing metadata when requested', () => {
      const result = sanitizeItemsBatch(testItems, { includeValidation: true });
      
      expect(result[0].json.processingMetadata).toBeDefined();
      expect(result[0].json.processingMetadata.sanitizedAt).toBeDefined();
      expect(result[0].json.processingMetadata.itemIndex).toBe(0);
      expect(result[0].json.processingMetadata.fieldsProcessed).toEqual(expect.any(Array));
    });

    test('handles errors gracefully', () => {
      const badItems = [
        { objectToSanitize: 'invalid json string' }
      ];
      
      const result = sanitizeItemsBatch(badItems);
      
      expect(result).toHaveLength(1);
      expect(result[0].json._error).toBeDefined();
      expect(result[0].json._error.type).toBe('sanitization_error');
    });

    test('respects custom field mappings', () => {
      const customMappings = {
        name: { type: 'title', maxLength: 10 }
      };
      
      const result = sanitizeItemsBatch(testItems, { 
        fieldMappings: customMappings 
      });
      
      expect(result[0].json.nameSanitized.length).toBeLessThanOrEqual(10);
    });
  });

  describe('DEFAULT_FIELD_MAPPINGS', () => {
    test('includes common field configurations', () => {
      expect(DEFAULT_FIELD_MAPPINGS.Title).toEqual({ type: 'title', maxLength: 250 });
      expect(DEFAULT_FIELD_MAPPINGS.email).toEqual({ type: 'email', maxLength: 255 });
      expect(DEFAULT_FIELD_MAPPINGS.description).toEqual({ type: 'description', maxLength: null });
    });

    test('includes topic-specific mappings', () => {
      expect(DEFAULT_FIELD_MAPPINGS.Topic).toEqual({ type: 'title', maxLength: 250 });
      expect(DEFAULT_FIELD_MAPPINGS.PodcastPrompt).toEqual({ type: 'content', maxLength: null });
    });
  });
}); 