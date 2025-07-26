// n8n Code Node: Generate Knowledge Operations SQL (Batch Mode)
// Creates KnowledgeSourceInstanceOperations records for newly inserted podcast episodes
// Runs after podcast episode insertion to link episodes with their processing operations

const { 
  processItemsWithN8N
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

// Create n8n batch processing helpers with bound $ function
const { processItems } = processItemsWithN8N($);

// Get all input items (should be the results from podcast insertion)
const insertedEpisodes = $input.all();

console.log(`Processing ${insertedEpisodes.length} inserted podcast episodes for knowledge operations`);

// Process each inserted episode with automatic context injection
const result = await processItems(
  insertedEpisodes,
  // Processor function receives: $item, $json, $itemIndex
  ($item, $json, $itemIndex) => {
    const insertResult = $json;
    
    // Validate required data - should have KnowledgeSourceInstanceId from the insertion
    if (!insertResult?.KnowledgeSourceInstanceId) {
      throw new Error(`Missing KnowledgeSourceInstanceId from insertion result for item ${$itemIndex}`);
    }

    // Build the SQL query to create KnowledgeSourceInstanceOperations
    const escapedInstanceId = tsqlstring.escape(insertResult.KnowledgeSourceInstanceId);
    
    console.log(`Debug values for item ${$itemIndex}:`, {
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
        itemIndex: $itemIndex,
        hasInstanceId: !!insertResult.KnowledgeSourceInstanceId
      }
    };
  },
  [], // No additional nodes needed
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