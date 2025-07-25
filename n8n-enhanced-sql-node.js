// n8n Code Node: Enhanced SQL Processing with tsqlstring
// Demonstrates advanced SQL generation and sanitization capabilities
// Uses @rin8n/content-processing-utils with tsqlstring integration

const { 
  sanitizeItemsBatch, 
  escapeSqlValue,
  escapeSqlIdentifier,
  formatSqlQuery,
  generateInsertStatement,
  generateUpdateStatement,
  createRawSql,
  DEFAULT_FIELD_MAPPINGS 
} = require('@rin8n/content-processing-utils');

const items = $input.all();

try {
  const results = [];
  
  for (let i = 0; i < items.length; i++) {
    const inputData = items[i].json;
    
    // Determine operation mode
    const mode = inputData.mode || 'sanitize';
    
    switch (mode) {
      case 'sanitize':
        // Standard sanitization for SQL injection prevention
        const sanitizedItems = sanitizeItemsBatch([inputData], {
          fieldMappings: inputData.fieldMappings || DEFAULT_FIELD_MAPPINGS,
          includeValidation: true,
          maintainPairing: false
        });
        
        results.push({
          json: {
            mode: 'sanitize',
            result: sanitizedItems[0],
            processingMetadata: {
              processedAt: new Date().toISOString(),
              itemIndex: i
            }
          },
          pairedItem: i
        });
        break;
        
      case 'generate_insert':
        // Generate INSERT statement with proper escaping
        const tableName = inputData.tableName;
        const data = inputData.data;
        
        if (!tableName || !data) {
          throw new Error('tableName and data are required for generate_insert mode');
        }
        
        const insertSql = generateInsertStatement(tableName, data);
        
        results.push({
          json: {
            mode: 'generate_insert',
            sql: insertSql,
            tableName: escapeSqlIdentifier(tableName),
            recordCount: Array.isArray(data) ? data.length : 1,
            processingMetadata: {
              processedAt: new Date().toISOString(),
              itemIndex: i
            }
          },
          pairedItem: i
        });
        break;
        
      case 'generate_update':
        // Generate UPDATE statement with proper escaping
        const updateTable = inputData.tableName;
        const updateData = inputData.data;
        const whereClause = inputData.whereClause;
        
        if (!updateTable || !updateData || !whereClause) {
          throw new Error('tableName, data, and whereClause are required for generate_update mode');
        }
        
        const updateSql = generateUpdateStatement(updateTable, updateData, whereClause);
        
        results.push({
          json: {
            mode: 'generate_update',
            sql: updateSql,
            tableName: escapeSqlIdentifier(updateTable),
            updatedFields: Object.keys(updateData).length,
            whereConditions: Object.keys(whereClause).length,
            processingMetadata: {
              processedAt: new Date().toISOString(),
              itemIndex: i
            }
          },
          pairedItem: i
        });
        break;
        
      case 'format_query':
        // Format query with parameter substitution
        const queryTemplate = inputData.query;
        const parameters = inputData.parameters || [];
        
        if (!queryTemplate) {
          throw new Error('query is required for format_query mode');
        }
        
        const formattedSql = formatSqlQuery(queryTemplate, parameters);
        
        results.push({
          json: {
            mode: 'format_query',
            originalQuery: queryTemplate,
            formattedQuery: formattedSql,
            parameterCount: parameters.length,
            processingMetadata: {
              processedAt: new Date().toISOString(),
              itemIndex: i
            }
          },
          pairedItem: i
        });
        break;
        
      case 'escape_values':
        // Escape individual values for SQL
        const valuesToEscape = inputData.values || [];
        const includeQuotes = inputData.includeQuotes !== false;
        
        const escapedValues = valuesToEscape.map((value, index) => ({
          original: value,
          escaped: escapeSqlValue(value, { includeQuotes }),
          index
        }));
        
        results.push({
          json: {
            mode: 'escape_values',
            values: escapedValues,
            totalValues: valuesToEscape.length,
            processingMetadata: {
              processedAt: new Date().toISOString(),
              itemIndex: i
            }
          },
          pairedItem: i
        });
        break;
        
      case 'escape_identifiers':
        // Escape SQL identifiers (table/column names)
        const identifiersToEscape = inputData.identifiers || [];
        const allowDots = inputData.allowDots !== false;
        
        const escapedIdentifiers = identifiersToEscape.map((identifier, index) => ({
          original: identifier,
          escaped: escapeSqlIdentifier(identifier, allowDots),
          index
        }));
        
        results.push({
          json: {
            mode: 'escape_identifiers',
            identifiers: escapedIdentifiers,
            totalIdentifiers: identifiersToEscape.length,
            processingMetadata: {
              processedAt: new Date().toISOString(),
              itemIndex: i
            }
          },
          pairedItem: i
        });
        break;
        
      case 'create_raw_sql':
        // Create raw SQL objects (use with extreme caution)
        const rawSqlString = inputData.rawSql;
        
        if (!rawSqlString) {
          throw new Error('rawSql is required for create_raw_sql mode');
        }
        
        const rawSqlObject = createRawSql(rawSqlString);
        
        results.push({
          json: {
            mode: 'create_raw_sql',
            rawSql: rawSqlString,
            rawSqlObject: rawSqlObject,
            warning: 'Raw SQL bypasses all escaping - use with extreme caution!',
            processingMetadata: {
              processedAt: new Date().toISOString(),
              itemIndex: i
            }
          },
          pairedItem: i
        });
        break;
        
      default:
        throw new Error(`Unknown mode: ${mode}. Supported modes: sanitize, generate_insert, generate_update, format_query, escape_values, escape_identifiers, create_raw_sql`);
    }
  }
  
  // Log summary
  const modeCount = {};
  results.forEach(result => {
    const mode = result.json.mode;
    modeCount[mode] = (modeCount[mode] || 0) + 1;
  });
  
  console.log('SQL Processing completed:', modeCount);
  
  return results;
  
} catch (error) {
  console.error('Error in enhanced SQL processing:', error.message);
  
  // Return error maintaining pairing
  return items.map((item, index) => ({
    json: {
      _error: {
        type: 'enhanced_sql_error',
        message: error.message,
        timestamp: new Date().toISOString(),
        inputData: Object.keys(item.json || {})
      },
      processingMetadata: {
        processedAt: new Date().toISOString(),
        itemIndex: index,
        failed: true
      }
    },
    pairedItem: index
  }));
}

// Usage Examples:
//
// 1. Sanitization mode:
// {
//   "mode": "sanitize",
//   "name": "O'Reilly",
//   "email": "test@example.com",
//   "fieldsToSanitize": "name,email"
// }
//
// 2. Generate INSERT:
// {
//   "mode": "generate_insert",
//   "tableName": "users",
//   "data": {
//     "name": "John O'Connor",
//     "email": "john@example.com",
//     "created_date": "2024-01-01"
//   }
// }
//
// 3. Generate UPDATE:
// {
//   "mode": "generate_update", 
//   "tableName": "users",
//   "data": { "email": "newemail@example.com" },
//   "whereClause": { "id": 123 }
// }
//
// 4. Format query:
// {
//   "mode": "format_query",
//   "query": "SELECT * FROM users WHERE name = ? AND age > ?",
//   "parameters": ["John", 25]
// }
//
// 5. Escape values:
// {
//   "mode": "escape_values",
//   "values": ["O'Reilly", 123, null, "test@example.com"],
//   "includeQuotes": true
// } 