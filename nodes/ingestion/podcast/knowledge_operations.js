// n8n Code Node: Generate Knowledge Operations SQL (Batch Mode) - Clean Architecture
// Creates KnowledgeSourceInstanceOperations records for newly inserted podcast episodes
// Uses new data normalization + pure SQL generation architecture

const { 
  processItemsWithPairing,
  normalizeData,
  COMMON_FIELD_CONFIGS,
  format,
  raw
} = require('sww-n8n-helpers');

// Get all input items (should be the results from podcast insertion)
const insertedEpisodes = $input.all();


// Process each inserted episode using clean architecture
const result = await processItemsWithPairing(
  insertedEpisodes,
  // Processor function receives: $item, $json, $itemIndex (no additional node data needed)
  (_$item, $json, $itemIndex) => {
    const insertResult = $json;
    
    // Validate required data - should have KnowledgeSourceInstanceId from the insertion
    if (!insertResult?.KnowledgeSourceInstanceId) {
      throw new Error(`Missing KnowledgeSourceInstanceId from insertion result for item ${$itemIndex}`);
    }

    // Define normalization schema for the operation parameters
    const operationSchema = {
      knowledgeSourceInstanceId: COMMON_FIELD_CONFIGS.knowledgeSourceId // GUID
    };

    // Prepare raw data for normalization
    const rawOperationData = {
      knowledgeSourceInstanceId: insertResult.KnowledgeSourceInstanceId
    };

    // Apply business normalization
    const normalizedData = normalizeData(rawOperationData, operationSchema);
    

    // Build safe SQL query using SqlString.format with placeholders
    const query = format(`
INSERT INTO KnowledgeSourceInstanceOperations
(KnowledgeSourceInstanceOperationId, KnowledgeSourceOperationId, KnowledgeSourceInstanceId)
SELECT NEWID(), kso.[KnowledgeSourceOperationId], ksi.KnowledgeSourceInstanceId
FROM KnowledgeSources ks
INNER JOIN KnowledgeSourceOperations kso ON kso.KnowledgeSourceId = ks.KnowledgeSourceId
INNER JOIN KnowledgeSourceInstances ksi ON ksi.KnowledgeSourceId = ks.KnowledgeSourceId
WHERE ksi.KnowledgeSourceInstanceId = ?
`, [normalizedData.knowledgeSourceInstanceId]);

    return {
      query: query,
      parameters: {
        // Original values for reference
        original: {
          knowledgeSourceInstanceId: insertResult.KnowledgeSourceInstanceId
        },
        // Normalized values actually used in query
        normalized: normalizedData
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        queryType: 'knowledge_source_instance_operations_creation',
        itemIndex: $itemIndex,
        hasInstanceId: !!normalizedData.knowledgeSourceInstanceId,
        architecture: 'data-transform + sql'
      }
    };
  },
  {}, // No additional node accessors needed
  {
    logErrors: true,
    stopOnError: false
  }
);

// Log summary statistics  
if (result.stats.failed > 0) {
  console.log(`Generated ${result.stats.total} operations: ${result.stats.successful} successful, ${result.stats.failed} failed`);
}

// Return results (maintains n8n item pairing)
return result.results;