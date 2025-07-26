// src/sql.js
// Pure SQL utilities using tsqlstring
// Focused on SQL safety and generation, no business logic

const SqlString = require('tsqlstring');

/**
 * Safely escape a SQL value using tsqlstring
 * @param {*} value - Value to escape
 * @returns {string} Safely escaped SQL value
 */
function escape(value) {
  return SqlString.escape(value);
}

/**
 * Safely escape a SQL identifier (table, column name) using tsqlstring
 * @param {string} identifier - Identifier to escape
 * @param {boolean} forbidQualified - Forbid qualified identifiers (default: false)
 * @returns {string} Safely escaped SQL identifier
 */
function escapeId(identifier, forbidQualified = false) {
  return SqlString.escapeId(identifier, forbidQualified);
}

/**
 * Format a SQL query with placeholders using tsqlstring
 * @param {string} sql - SQL query with ? placeholders for values and ?? for identifiers
 * @param {Array} values - Values to substitute into placeholders
 * @returns {string} Formatted SQL query with escaped values
 */
function format(sql, values = []) {
  return SqlString.format(sql, values);
}

/**
 * Create a raw SQL fragment that won't be escaped
 * @param {string} sql - Raw SQL string (use with caution!)
 * @returns {Object} Raw SQL object for tsqlstring
 */
function raw(sql) {
  return SqlString.raw(sql);
}

/**
 * Build a parameterized SQL query safely
 * @param {string} template - SQL template with placeholders
 * @param {Array|Object} params - Parameters to substitute
 * @returns {string} Safe SQL query
 */
function buildQuery(template, params = []) {
  if (Array.isArray(params)) {
    return format(template, params);
  }
  
  // Handle named parameters (simple replacement)
  let sql = template;
  for (const [key, value] of Object.entries(params)) {
    const placeholder = `:${key}`;
    if (sql.includes(placeholder)) {
      sql = sql.replace(new RegExp(`:${key}\\b`, 'g'), escape(value));
    }
  }
  
  return sql;
}

/**
 * Generate INSERT statement using tsqlstring
 * @param {string} tableName - Table name
 * @param {Object|Array} data - Data to insert (object or array of objects)
 * @param {Object} options - Generation options
 * @param {string} options.outputClause - OUTPUT clause to add (e.g., "OUTPUT INSERTED.*")
 * @param {Object} options.rawValues - Values that should not be escaped (e.g., { id: raw('NEWID()') })
 * @returns {string} Generated INSERT statement
 */
function generateInsert(tableName, data, options = {}) {
  if (!tableName || !data) {
    throw new Error('Table name and data are required');
  }

  const { outputClause = null, rawValues = {} } = options;

  if (Array.isArray(data)) {
    // Bulk insert - generate multiple INSERT statements
    return data.map(row => generateInsert(tableName, row, options)).join(';\n');
  }

  // Single row insert
  const columns = Object.keys(data);
  const values = [];
  const placeholders = [];

  columns.forEach(col => {
    if (rawValues[col]) {
      // Raw values like NEWID() go directly in the SQL
      placeholders.push(rawValues[col].toSqlString ? rawValues[col].toSqlString() : String(rawValues[col]));
    } else {
      // Regular values use placeholders
      placeholders.push('?');
      values.push(data[col]);
    }
  });

  // Build the query with placeholders
  let sql = 'INSERT INTO ?? (??)';
  
  if (outputClause) {
    sql += ` ${outputClause}`;
  }
  
  sql += ` VALUES (${placeholders.join(', ')})`;

  // Use SqlString.format to safely substitute values
  return format(sql, [tableName, columns, ...values]);
}

/**
 * Generate UPDATE statement using tsqlstring
 * @param {string} tableName - Table name
 * @param {Object} data - Data to update
 * @param {Object} whereClause - WHERE clause conditions
 * @param {Object} options - Generation options
 * @param {Object} options.rawValues - Values that should not be escaped
 * @returns {string} Generated UPDATE statement
 */
function generateUpdate(tableName, data, whereClause, options = {}) {
  if (!tableName || !data || !whereClause) {
    throw new Error('Table name, data, and where clause are required');
  }

  const { rawValues = {} } = options;
  
  // Build SET clause
  const setValues = [];
  const setParts = [];
  
  Object.keys(data).forEach(key => {
    if (rawValues[key]) {
      setParts.push(`?? = ${rawValues[key].toSqlString ? rawValues[key].toSqlString() : String(rawValues[key])}`);
      setValues.push(key);
    } else {
      setParts.push('?? = ?');
      setValues.push(key, data[key]);
    }
  });
  
  // Build WHERE clause
  const whereValues = [];
  const whereParts = [];
  
  Object.keys(whereClause).forEach(key => {
    whereParts.push('?? = ?');
    whereValues.push(key, whereClause[key]);
  });

  const sql = `UPDATE ?? SET ${setParts.join(', ')} WHERE ${whereParts.join(' AND ')}`;
  
  return format(sql, [tableName, ...setValues, ...whereValues]);
}

/**
 * Generate SELECT statement with safe parameters
 * @param {Object} options - Query options
 * @param {Array|string} options.columns - Columns to select (default: ['*'])
 * @param {string} options.from - Table name or FROM clause
 * @param {Object} options.where - WHERE conditions as key-value pairs
 * @param {string} options.orderBy - ORDER BY clause
 * @param {number} options.limit - LIMIT/TOP clause
 * @param {string} options.customWhere - Custom WHERE clause (use with caution)
 * @returns {string} Generated SELECT statement
 */
function generateSelect(options = {}) {
  const {
    columns = ['*'],
    from,
    where = {},
    orderBy = null,
    limit = null,
    customWhere = null
  } = options;

  if (!from) {
    throw new Error('FROM table/clause is required');
  }

  // Build columns
  const columnList = Array.isArray(columns) ? columns.map(col => escapeId(col)).join(', ') : escapeId(columns);
  
  let sql = `SELECT ${columnList} FROM ??`;
  const values = [from];

  // Build WHERE clause
  const whereConditions = [];
  
  // Add key-value WHERE conditions
  Object.keys(where).forEach(key => {
    whereConditions.push('?? = ?');
    values.push(key, where[key]);
  });
  
  // Add custom WHERE clause if provided
  if (customWhere) {
    whereConditions.push(`(${customWhere})`);
  }
  
  if (whereConditions.length > 0) {
    sql += ` WHERE ${whereConditions.join(' AND ')}`;
  }

  // Add ORDER BY
  if (orderBy) {
    sql += ` ORDER BY ${orderBy}`; // Note: orderBy should be pre-validated/escaped
  }

  // Add LIMIT/TOP
  if (limit && typeof limit === 'number' && limit > 0) {
    sql = sql.replace('SELECT', `SELECT TOP ${limit}`);
  }

  return format(sql, values);
}

/**
 * Generate DELETE statement using tsqlstring
 * @param {string} tableName - Table name
 * @param {Object} whereClause - WHERE clause conditions
 * @param {Object} options - Generation options
 * @param {number} options.limit - Limit number of rows to delete
 * @returns {string} Generated DELETE statement
 */
function generateDelete(tableName, whereClause, options = {}) {
  if (!tableName || !whereClause || Object.keys(whereClause).length === 0) {
    throw new Error('Table name and non-empty where clause are required for DELETE');
  }

  const { limit = null } = options;
  
  // Build WHERE clause
  const whereValues = [];
  const whereParts = [];
  
  Object.keys(whereClause).forEach(key => {
    whereParts.push('?? = ?');
    whereValues.push(key, whereClause[key]);
  });

  let sql = 'DELETE';
  
  if (limit && typeof limit === 'number' && limit > 0) {
    sql += ` TOP (${limit})`;
  }
  
  sql += ` FROM ?? WHERE ${whereParts.join(' AND ')}`;
  
  return format(sql, [tableName, ...whereValues]);
}

/**
 * Create common SQL fragments safely
 */
const fragments = {
  /**
   * Create a CASE statement
   * @param {Array} conditions - Array of {when, then} objects
   * @param {*} elseValue - ELSE value
   * @returns {string} CASE statement
   */
  case: (conditions, elseValue = null) => {
    let sql = 'CASE';
    
    conditions.forEach(({ when, then }) => {
      sql += ` WHEN ${when} THEN ${escape(then)}`;
    });
    
    if (elseValue !== null) {
      sql += ` ELSE ${escape(elseValue)}`;
    }
    
    sql += ' END';
    return sql;
  },

  /**
   * Create an EXISTS subquery
   * @param {string} subquery - Subquery SQL
   * @returns {string} EXISTS clause
   */
  exists: (subquery) => `EXISTS (${subquery})`,

  /**
   * Create an IN clause
   * @param {string} column - Column name
   * @param {Array} values - Values for IN clause
   * @returns {string} IN clause
   */
  in: (column, values) => {
    if (!Array.isArray(values) || values.length === 0) {
      throw new Error('IN clause requires non-empty array of values');
    }
    return format(`?? IN (${values.map(() => '?').join(', ')})`, [column, ...values]);
  },

  /**
   * Create a BETWEEN clause
   * @param {string} column - Column name
   * @param {*} start - Start value
   * @param {*} end - End value
   * @returns {string} BETWEEN clause
   */
  between: (column, start, end) => format('?? BETWEEN ? AND ?', [column, start, end])
};

/**
 * Batch operations for multiple queries
 */
const batch = {
  /**
   * Combine multiple SQL statements into a batch
   * @param {Array} statements - Array of SQL statements
   * @param {Object} options - Batch options
   * @param {boolean} options.useTransaction - Wrap in transaction
   * @returns {string} Combined SQL batch
   */
  combine: (statements, options = {}) => {
    const { useTransaction = false } = options;
    
    if (!Array.isArray(statements) || statements.length === 0) {
      return '';
    }
    
    let sql = statements.join(';\n');
    
    if (useTransaction) {
      sql = `BEGIN TRANSACTION;\n${sql};\nCOMMIT TRANSACTION;`;
    }
    
    return sql;
  },

  /**
   * Generate multiple INSERT statements for bulk insert
   * @param {string} tableName - Table name
   * @param {Array} rows - Array of data objects
   * @param {Object} options - Insert options
   * @returns {string} Bulk INSERT statements
   */
  bulkInsert: (tableName, rows, options = {}) => {
    if (!Array.isArray(rows) || rows.length === 0) {
      return '';
    }
    
    return rows.map(row => generateInsert(tableName, row, options)).join(';\n');
  }
};

module.exports = {
  // Core tsqlstring functions
  escape,
  escapeId,
  format,
  raw,
  buildQuery,
  
  // Statement generators
  generateInsert,
  generateUpdate,
  generateSelect,
  generateDelete,
  
  // SQL fragments
  fragments,
  
  // Batch operations
  batch
};