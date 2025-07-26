// n8n Code Node: Generate Knowledge Operations SQL (Batch Mode) - Clean Architecture
// Creates KnowledgeSourceInstanceOperations records for newly inserted podcast episodes
// Uses new data normalization + pure SQL generation architecture

const { 
  processItemsWithAccessors,
  normalizeData,
  COMMON_FIELD_CONFIGS,
  format,
  raw
} = require('sww-n8n-helpers');

// Get all input items (should be the results from podcast insertion)
const insertedEpisodes = $input.all();

console.log(`Processing ${insertedEpisodes.length} inserted podcast episodes for knowledge operations`);

// Process each inserted episode using clean architecture
const result = await processItemsWithAccessors(
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
    
    console.log(`Debug values for item ${$itemIndex}:`, {
      originalInstanceId: insertResult.KnowledgeSourceInstanceId,
      normalizedInstanceId: normalizedData.knowledgeSourceInstanceId
    });

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

// Log comprehensive processing statistics
console.log(`\n=== Knowledge Operations Processing Summary ===`);
console.log(`Total items processed: ${result.stats.total}`);
console.log(`Successful: ${result.stats.successful} (${(result.stats.successRate * 100).toFixed(1)}%)`);
console.log(`Failed: ${result.stats.failed} (${(result.stats.failureRate * 100).toFixed(1)}%)`);

if (result.stats.failed > 0) {
  console.log(`\nError breakdown by type:`);
  Object.entries(result.stats.errorBreakdown || {}).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
  
  console.log(`\nSample errors:`);
  (result.stats.sampleErrors || []).forEach((error, index) => {
    console.log(`  ${index + 1}. [Item ${error.itemIndex}] ${error.type}: ${error.message}`);
  });
}

if (result.stats.successful > 0) {
  const sample = result.results.find(item => !item.json.$error)?.json;
  if (sample) {
    console.log(`\nSample successful operation:`);
    console.log(`  KnowledgeSourceInstanceId: ${sample.parameters.knowledgeSourceInstanceId}`);
    console.log(`  Query type: ${sample.metadata.queryType}`);
  }
}

console.log(`=== End Processing Summary ===\n`);

// Return results (maintains n8n item pairing)
return result.results;