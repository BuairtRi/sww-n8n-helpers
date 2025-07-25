const {
  sanitizeForSQL,
  escapeSqlValue,
  escapeSqlIdentifier,
  formatSqlQuery,
  createRawSql,
  escapeSqlValuesBatch,
  generateInsertStatement,
  generateUpdateStatement
} = require('../index');

describe('TSQLString Integration Tests', () => {
  
  describe('sanitizeForSQL with tsqlstring', () => {
    test('uses tsqlstring for robust escaping by default', () => {
      const result = sanitizeForSQL("O'Reilly & Associates");
      expect(result).toBe("O''Reilly & Associates");
    });

    test('handles complex SQL injection attempts', () => {
      const maliciousInput = "test'; DROP TABLE users; --";
      const result = sanitizeForSQL(maliciousInput);
      // tsqlstring escapes quotes, making the injection safe
      expect(result).toContain("''");
      expect(result).toBe("test''; DROP TABLE users; --");
    });

    test('can disable tsqlstring escaping', () => {
      const result = sanitizeForSQL("test'quote", { useTsqlstring: false });
      expect(result).toBe("test''quote");
    });

    test('handles various data types', () => {
      expect(sanitizeForSQL(123)).toBe('123');
      expect(sanitizeForSQL(true)).toBe('true');
      expect(sanitizeForSQL(null)).toBeNull();
      expect(sanitizeForSQL(undefined)).toBeNull();
    });

    test('preserves formatting when requested', () => {
      const multiline = "Line 1\nLine 2\nLine 3";
      const result = sanitizeForSQL(multiline, { preserveBasicFormatting: true });
      // tsqlstring escapes newlines as \\n
      expect(result).toBe("Line 1\\nLine 2\\nLine 3");
    });
  });

  describe('escapeSqlValue', () => {
    test('escapes values with quotes by default', () => {
      expect(escapeSqlValue("O'Reilly")).toBe("'O''Reilly'");
      expect(escapeSqlValue(123)).toBe('123');
      expect(escapeSqlValue(null)).toBe('NULL');
    });

    test('can exclude quotes when requested', () => {
      expect(escapeSqlValue("O'Reilly", { includeQuotes: false })).toBe("O''Reilly");
      expect(escapeSqlValue(123, { includeQuotes: false })).toBe('123');
    });

    test('handles date objects', () => {
      const date = new Date('2024-01-01T12:00:00Z');
      const result = escapeSqlValue(date);
      expect(result).toContain('2024-01-01');
    });

    test('handles arrays', () => {
      const result = escapeSqlValue(['a', 'b', 'c']);
      expect(result).toBe("'a', 'b', 'c'");
    });
  });

  describe('escapeSqlIdentifier', () => {
    test('escapes table and column names', () => {
      expect(escapeSqlIdentifier('users')).toBe('[users]');
      expect(escapeSqlIdentifier('user_name')).toBe('[user_name]');
    });

    test('handles qualified identifiers', () => {
      expect(escapeSqlIdentifier('database.table')).toBe('[database].[table]');
      expect(escapeSqlIdentifier('schema.table.column')).toBe('[schema].[table].[column]');
    });

    test('can disable dot handling', () => {
      expect(escapeSqlIdentifier('table.with.dots', false)).toBe('[table.with.dots]');
    });

    test('handles empty or null identifiers', () => {
      expect(escapeSqlIdentifier('')).toBe('');
      expect(escapeSqlIdentifier(null)).toBe('');
      expect(escapeSqlIdentifier(undefined)).toBe('');
    });
  });

  describe('formatSqlQuery', () => {
    test('substitutes parameters in order', () => {
      const sql = 'SELECT * FROM users WHERE name = ? AND age > ?';
      const params = ['John', 25];
      const result = formatSqlQuery(sql, params);
      expect(result).toBe("SELECT * FROM users WHERE name = 'John' AND age > 25");
    });

    test('handles various parameter types', () => {
      const sql = 'INSERT INTO logs (message, count, active, created) VALUES (?, ?, ?, ?)';
      const params = ["Test message", 42, true, new Date('2024-01-01')];
      const result = formatSqlQuery(sql, params);
      
      expect(result).toContain("'Test message'");
      expect(result).toContain('42');
      expect(result).toContain('1'); // tsqlstring converts true to 1
      expect(result).toContain('2024-01-01');
    });

    test('returns original query when no parameters', () => {
      const sql = 'SELECT * FROM users';
      expect(formatSqlQuery(sql, [])).toBe(sql);
      expect(formatSqlQuery(sql)).toBe(sql);
    });
  });

  describe('createRawSql', () => {
    test('creates raw SQL objects', () => {
      const raw = createRawSql('GETDATE()');
      expect(raw).toHaveProperty('toSqlString');
      expect(typeof raw.toSqlString).toBe('function');
      expect(raw.toSqlString()).toBe('GETDATE()');
    });

    test('raw SQL bypasses escaping in formatSqlQuery', () => {
      const sql = 'UPDATE posts SET modified = ? WHERE id = ?';
      const params = [createRawSql('GETDATE()'), 42];
      const result = formatSqlQuery(sql, params);
      expect(result).toBe('UPDATE posts SET modified = GETDATE() WHERE id = 42');
    });
  });

  describe('escapeSqlValuesBatch', () => {
    test('escapes array of values', () => {
      const values = ["O'Reilly", 123, null, true];
      const results = escapeSqlValuesBatch(values);
      
      expect(results).toHaveLength(4);
      expect(results[0]).toBe("'O''Reilly'");
      expect(results[1]).toBe('123');
      expect(results[2]).toBe('NULL');
      expect(results[3]).toBe('1'); // tsqlstring converts true to 1
    });

    test('can exclude quotes for all values', () => {
      const values = ["test", 123];
      const results = escapeSqlValuesBatch(values, { includeQuotes: false });
      
      expect(results[0]).toBe('test');
      expect(results[1]).toBe('123');
    });

    test('handles empty array', () => {
      expect(escapeSqlValuesBatch([])).toEqual([]);
      expect(escapeSqlValuesBatch(null)).toEqual([]);
    });
  });

  describe('generateInsertStatement', () => {
    test('generates single row INSERT', () => {
      const data = {
        name: "John O'Connor",
        email: 'john@example.com',
        age: 30
      };
      
      const result = generateInsertStatement('users', data);
      
      expect(result).toContain('INSERT INTO [users]');
      expect(result).toContain('[name], [email], [age]');
      expect(result).toContain("'John O''Connor'");
      expect(result).toContain("'john@example.com'");
      expect(result).toContain('30');
    });

    test('generates bulk INSERT for array data', () => {
      const data = [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 }
      ];
      
      const result = generateInsertStatement('users', data);
      
      expect(result).toContain('INSERT INTO [users]');
      expect(result).toContain('[name], [age]');
      expect(result).toContain("('John', 30), ('Jane', 25)");
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
      const data = { email: 'newemail@example.com', age: 31 };
      const whereClause = { id: 123, active: true };
      
      const result = generateUpdateStatement('users', data, whereClause);
      
      expect(result).toContain('UPDATE [users] SET');
      expect(result).toContain("[email] = 'newemail@example.com'");
      expect(result).toContain('[age] = 31');
      expect(result).toContain('WHERE [id] = 123 AND [active] = 1'); // tsqlstring converts true to 1
    });

    test('handles special characters in data', () => {
      const data = { comment: "User's feedback with 'quotes'" };
      const whereClause = { id: 1 };
      
      const result = generateUpdateStatement('feedback', data, whereClause);
      
      expect(result).toContain("'User''s feedback with ''quotes'''");
    });

    test('throws error for missing parameters', () => {
      expect(() => generateUpdateStatement()).toThrow('Table name, data, and where clause are required');
      expect(() => generateUpdateStatement('users', {})).toThrow('Table name, data, and where clause are required');
    });
  });

  describe('Real-world SQL injection scenarios', () => {
    test('handles union-based attacks', () => {
      const maliciousInput = "1' UNION SELECT username, password FROM admin_users --";
      const escaped = escapeSqlValue(maliciousInput);
      // tsqlstring escapes the quotes, making the injection safe even if UNION remains
      expect(escaped).toContain("''");
      expect(escaped).toBe("'1'' UNION SELECT username, password FROM admin_users --'");
    });

    test('handles boolean-based attacks', () => {
      const maliciousInput = "1' OR '1'='1";
      const escaped = escapeSqlValue(maliciousInput);
      expect(escaped).toBe("'1'' OR ''1''=''1'");
    });

    test('handles time-based attacks', () => {
      const maliciousInput = "1'; WAITFOR DELAY '00:00:05' --";
      const escaped = escapeSqlValue(maliciousInput);
      // tsqlstring escapes the quotes, making the injection safe
      expect(escaped).toContain("''");
      expect(escaped).toBe("'1''; WAITFOR DELAY ''00:00:05'' --'");
    });

    test('handles stored procedure attacks', () => {
      const maliciousInput = "'; EXEC xp_cmdshell 'dir' --";
      const escaped = escapeSqlValue(maliciousInput);
      // tsqlstring escapes the quotes, making the injection safe
      expect(escaped).toContain("''");
      expect(escaped).toBe("''''; EXEC xp_cmdshell ''dir'' --'");
    });
  });

  describe('Edge cases and special data types', () => {
    test('handles unicode characters', () => {
      const unicode = "测试数据 with émojis 🎉";
      const result = escapeSqlValue(unicode);
      expect(result).toContain('测试数据');
      expect(result).toContain('émojis');
      expect(result).toContain('🎉');
    });

    test('handles very long strings', () => {
      const longString = 'a'.repeat(10000);
      const result = escapeSqlValue(longString);
      expect(result.length).toBeGreaterThan(10000); // Should include quotes
    });

    test('handles nested objects', () => {
      const obj = { user: { name: 'John', details: { age: 30 } } };
      const result = escapeSqlValue(obj);
      // tsqlstring converts objects to key=value pairs
      expect(result).toContain('[user]');
      expect(result).toBe("[user] = '[object Object]'");
    });

    test('handles Buffer objects', () => {
      const buffer = Buffer.from('hello', 'utf8');
      const result = escapeSqlValue(buffer);
      // tsqlstring converts buffers to hex format
      expect(result).toBe("X'68656c6c6f'");
    });
  });
}); 