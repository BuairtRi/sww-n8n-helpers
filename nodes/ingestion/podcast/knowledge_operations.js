// n8n Code Node: Generate Knowledge Operations SQL (Batch Mode)
// Creates KnowledgeSourceInstanceOperations records for newly inserted podcast episodes
// Runs after podcast episode insertion to link episodes with their processing operations

const { 
  processItemsWithPairing
} = require('sww-n8n-helpers');

// Import tsqlstring directly for SQL value escaping
let tsqlstring;
try {
  tsqlstring = require('tsqlstring');
  console.log('✅ tsqlstring loaded successfully');
} catch (error) {
  console.error('❌ tsqlstring not available:', error.message);
  // Fallback: simple manual escaping
  tsqlstring = {
    escape: (value) => {
      if (value === null || value === undefined) return 'NULL';
      if (typeof value === 'string') {
        return "'" + value.replace(/'/g, "''") + "'";
      }
      return "'" + String(value) + "'";
    }
  };
}

// Get all input items (should be the results from podcast insertion)
const insertedEpisodes = $input.all();

console.log(`Processing ${insertedEpisodes.length} inserted podcast episodes for knowledge operations`);

// Process each inserted episode with batch utility
const results = processItemsWithPairing(insertedEpisodes, (item, itemIndex) => {
  const insertResult = item.json;
  
  // Validate required data - should have KnowledgeSourceInstanceId from the insertion
  if (!insertResult?.KnowledgeSourceInstanceId) {
    throw new Error(`Missing KnowledgeSourceInstanceId from insertion result for item ${itemIndex}`);
  }

  // Build the SQL query to create KnowledgeSourceInstanceOperations
  const escapedInstanceId = tsqlstring.escape(insertResult.KnowledgeSourceInstanceId);
  
  console.log(`Debug values for item ${itemIndex}:`, {
    originalInstanceId: insertResult.KnowledgeSourceInstanceId,
    escapedInstanceId
  });

  const query = `
INSERT INTO KnowledgeSourceInstanceOperations
(KnowledgeSourceInstanceOperationId, KnowledgeSourceOperationId, KnowledgeSourceInstanceId)
SELECT NEWID(), kso.[KnowledgeSourceOperationId], ksi.KnowledgeSourceInstanceId
FROM KnowledgeSources ks
INNER JOIN KnowledgeSourceOperations kso ON kso.KnowledgeSourceId = ks.KnowledgeSourceId
INNER JOIN KnowledgeSourceInstances ksi ON ksi.KnowledgeSourceId = ks.KnowledgeSourceId
WHERE ksi.KnowledgeSourceInstanceId = ${escapedInstanceId}
`;

  return {
    query: query,
    parameters: {
      knowledgeSourceInstanceId: insertResult.KnowledgeSourceInstanceId
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      queryType: 'knowledge_source_instance_operations_creation',
      itemIndex: itemIndex,
      hasInstanceId: !!insertResult.KnowledgeSourceInstanceId
    }
  };
  
}, {
  maintainPairing: true,
  logErrors: true,
  stopOnError: false
});

console.log(`Generated ${results.length} knowledge operations SQL statements`);

// Log summary
const validQueries = results.filter(item => !item.json._error);
const errorQueries = results.filter(item => item.json._error);

console.log(`Summary: ${validQueries.length} valid queries, ${errorQueries.length} errors`);

if (validQueries.length > 0) {
  const sample = validQueries[0].json;
  console.log(`Sample KnowledgeSourceInstanceId: ${sample.parameters.knowledgeSourceInstanceId}`);
}

return results;