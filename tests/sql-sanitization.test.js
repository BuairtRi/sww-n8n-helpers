const {
  sanitizeForSQL,
  sanitizeByFieldType,
  sanitizeObject,
  validateSanitizedText,
  sanitizeItemsBatch,
  parseFieldList,
  DEFAULT_FIELD_MAPPINGS,
  // Add missing advanced functions
  escapeSqlValue,
  escapeSqlIdentifier,
  formatSqlQuery,
  createRawSql,
  escapeSqlValuesBatch,
  generateInsertStatement,
  generateUpdateStatement
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

  describe('escapeSqlValue', () => {
    test('handles null and undefined', () => {
      expect(escapeSqlValue(null)).toBe('NULL');
      expect(escapeSqlValue(undefined)).toBe('NULL');
    });

    test('handles numbers', () => {
      expect(escapeSqlValue(123)).toBe('123');
      expect(escapeSqlValue(45.67)).toBe('45.67');
      expect(escapeSqlValue(-89)).toBe('-89');
    });

    test('handles booleans', () => {
      expect(escapeSqlValue(true)).toBe('1');
      expect(escapeSqlValue(false)).toBe('0');
    });

    test('handles strings with quotes', () => {
      expect(escapeSqlValue("O'Reilly")).toBe("'O''Reilly'");
      expect(escapeSqlValue('Test "quoted" text')).toBe("'Test \"quoted\" text'");
    });

    test('handles arrays', () => {
      expect(escapeSqlValue([1, 2, 3])).toBe("1, 2, 3");
      expect(escapeSqlValue(['a', 'b'])).toBe("'a', 'b'");
    });

    test('handles dates', () => {
      const date = new Date('2023-01-01T12:00:00.000Z');
      expect(escapeSqlValue(date)).toBe("'2023-01-01T12:00:00.000Z'");
    });

    test('handles Buffer objects', () => {
      const buffer = Buffer.from('hello');
      const result = escapeSqlValue(buffer);
      expect(result).toBe("X'68656c6c6f'");
    });

    test('handles objects with toSqlString method', () => {
      const rawSql = { toSqlString: () => 'NOW()' };
      expect(escapeSqlValue(rawSql)).toBe('NOW()');
    });

    test('handles regular objects', () => {
      const obj = { user: 'test' };
      const result = escapeSqlValue(obj);
      expect(result).toBe("[user] = '[object Object]'");
    });

    test('respects includeQuotes option', () => {
      expect(escapeSqlValue("test", { includeQuotes: false })).toBe('test');
      expect(escapeSqlValue("test", { includeQuotes: true })).toBe("'test'");
    });
  });

  describe('escapeSqlIdentifier', () => {
    test('escapes basic identifiers', () => {
      expect(escapeSqlIdentifier('tableName')).toBe('[tableName]');
      expect(escapeSqlIdentifier('column_name')).toBe('[column_name]');
    });

    test('handles qualified identifiers with dots', () => {
      expect(escapeSqlIdentifier('schema.table', true)).toBe('[schema].[table]');
      expect(escapeSqlIdentifier('db.schema.table', true)).toBe('[db].[schema].[table]');
    });

    test('handles allowDots parameter', () => {
      expect(escapeSqlIdentifier('schema.table', false)).toBe('[schema.table]');
      expect(escapeSqlIdentifier('schema.table', true)).toBe('[schema].[table]');
    });

    test('handles empty input', () => {
      expect(escapeSqlIdentifier('')).toBe('');
      expect(escapeSqlIdentifier(null)).toBe('');
    });
  });

  describe('formatSqlQuery', () => {
    test('formats query with placeholders', () => {
      const sql = 'SELECT * FROM users WHERE id = ? AND name = ?';
      const values = [123, 'John'];
      const result = formatSqlQuery(sql, values);
      expect(result).toBe("SELECT * FROM users WHERE id = 123 AND name = 'John'");
    });

    test('handles empty values array', () => {
      const sql = 'SELECT * FROM users';
      const result = formatSqlQuery(sql, []);
      expect(result).toBe('SELECT * FROM users');
    });

    test('handles null values', () => {
      const sql = 'SELECT * FROM users WHERE deleted_at = ?';
      const values = [null];
      const result = formatSqlQuery(sql, values);
      expect(result).toBe('SELECT * FROM users WHERE deleted_at = NULL');
    });
  });

  describe('createRawSql', () => {
    test('creates raw SQL object', () => {
      const rawSql = createRawSql('NOW()');
      expect(typeof rawSql.toSqlString).toBe('function');
      expect(rawSql.toSqlString()).toBe('NOW()');
    });

    test('raw SQL bypasses escaping', () => {
      const rawSql = createRawSql('GETDATE()');
      expect(escapeSqlValue(rawSql)).toBe('GETDATE()');
    });
  });

  describe('escapeSqlValuesBatch', () => {
    test('escapes array of values', () => {
      const values = ['test', 123, null, true];
      const result = escapeSqlValuesBatch(values);
      expect(result).toEqual(["'test'", '123', 'NULL', '1']);
    });

    test('handles empty array', () => {
      expect(escapeSqlValuesBatch([])).toEqual([]);
    });

    test('handles non-array input', () => {
      expect(escapeSqlValuesBatch('not an array')).toEqual([]);
    });

    test('respects options', () => {
      const values = ['test1', 'test2'];
      const result = escapeSqlValuesBatch(values, { includeQuotes: false });
      expect(result).toEqual(['test1', 'test2']);
    });
  });

  describe('generateInsertStatement', () => {
    test('generates INSERT for single object', () => {
      const data = { name: "John O'Connor", age: 30 };
      const result = generateInsertStatement('users', data);
      expect(result).toBe("INSERT INTO [users] ([name], [age]) VALUES ('John O''Connor', 30)");
    });

    test('generates bulk INSERT for array', () => {
      const data = [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 }
      ];
      const result = generateInsertStatement('users', data);
      expect(result).toBe("INSERT INTO [users] ([name], [age]) VALUES ('John', 30), ('Jane', 25)");
    });

    test('handles empty array', () => {
      expect(generateInsertStatement('users', [])).toBe('');
    });

    test('throws error for missing parameters', () => {
      expect(() => generateInsertStatement()).toThrow('Table name and data are required');
      expect(() => generateInsertStatement('users')).toThrow('Table name and data are required');
    });
  });

  describe('generateUpdateStatement', () => {
    test('generates UPDATE statement', () => {
      const data = { name: "John O'Connor", age: 31 };
      const whereClause = { id: 123 };
      const result = generateUpdateStatement('users', data, whereClause);
      expect(result).toBe("UPDATE [users] SET [name] = 'John O''Connor', [age] = 31 WHERE [id] = 123");
    });

    test('handles multiple WHERE conditions', () => {
      const data = { status: 'active' };
      const whereClause = { department: 'IT', level: 'senior' };
      const result = generateUpdateStatement('users', data, whereClause);
      expect(result).toBe("UPDATE [users] SET [status] = 'active' WHERE [department] = 'IT' AND [level] = 'senior'");
    });

    test('throws error for missing parameters', () => {
      expect(() => generateUpdateStatement()).toThrow('Table name, data, and where clause are required');
      expect(() => generateUpdateStatement('users', {})).toThrow('Table name, data, and where clause are required');
    });
  });
}); 