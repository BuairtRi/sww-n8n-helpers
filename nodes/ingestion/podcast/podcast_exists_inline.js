// n8n Code Node: Generate Podcast Existence Check SQL (Batch Mode) - Clean Architecture
// Uses new data normalization + pure SQL generation architecture
// Handles multiple podcast episodes in "Run Once for All Items" mode

const { 
  processItemsWithAccessors, 
  normalizeData,
  COMMON_FIELD_CONFIGS,
  format
} = require('sww-n8n-helpers');

// Get all input items (podcast episodes)
const podcastEpisodes = $input.all();

console.log(`Processing ${podcastEpisodes.length} podcast episodes for existence check (accessor version)`);

// Define node accessors that preserve itemMatching behavior
const nodeAccessors = {
  'Ingestion Sources': (itemIndex) => $('Ingestion Sources').itemMatching(itemIndex)?.json
};

// Process each podcast episode using accessor pattern
const result = await processItemsWithAccessors(
  podcastEpisodes,
  // Processor receives: $item, $json, $itemIndex, ingestionSources (from accessor)
  (_$item, json, itemIndex, ingestionSources) => {
    // Validate required data
    if (!ingestionSources?.knowledgeSourceId) {
      throw new Error(`Missing knowledgeSourceId from Ingestion Sources node for item ${itemIndex}`);
    }

    if (!json?.episodeGuid && !json?.title) {
      throw new Error(`Missing both episodeGuid and title from Podcast Episodes for item ${itemIndex}`);
    }

    // Define normalization schema for the query parameters
    const querySchema = {
      knowledgeSourceId: COMMON_FIELD_CONFIGS.knowledgeSourceId,
      episodeGuid: { ...COMMON_FIELD_CONFIGS.guid, required: false },
      episodeTitle: { ...COMMON_FIELD_CONFIGS.title, required: false },
      publicationDate: { ...COMMON_FIELD_CONFIGS.publicationDate, required: false }
    };

    // Prepare raw data for normalization
    const rawQueryData = {
      knowledgeSourceId: ingestionSources.knowledgeSourceId,
      episodeGuid: json.episodeGuid,
      episodeTitle: json.title,
      publicationDate: json.publicationDate
    };

    // Apply business normalization
    const normalizedData = normalizeData(rawQueryData, querySchema);

    // Build safe SQL query using SqlString.format with placeholders
    const query = format(`
SELECT CASE 
  WHEN EXISTS (
    SELECT KnowledgeSourceInstanceId 
    FROM KnowledgeSourceInstances 
    WHERE KnowledgeSourceId = ?
      AND SourceId = ?
  )
  THEN 1
  WHEN EXISTS (
    SELECT KnowledgeSourceInstanceId 
    FROM KnowledgeSourceInstances 
    WHERE Name = ?
      AND SourceDate = ?
      AND KnowledgeSourceId = ?
  )
  THEN 1
  ELSE 0
END as episode_exists
`, [
      normalizedData.knowledgeSourceId,
      normalizedData.episodeGuid,
      normalizedData.episodeTitle,
      normalizedData.publicationDate,
      normalizedData.knowledgeSourceId
    ]);

    return {
      query: query,
      parameters: {
        // Original values for reference
        original: {
          knowledgeSourceId: ingestionSources.knowledgeSourceId,
          episodeGuid: json.episodeGuid,
          episodeTitle: json.title,
          publicationDate: json.publicationDate
        },
        // Normalized values actually used in query
        normalized: normalizedData
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        checkType: 'podcast_episode_existence',
        primaryCheck: normalizedData.episodeGuid ? 'guid' : 'title_date',
        hasGuid: !!normalizedData.episodeGuid,
        hasTitle: !!normalizedData.episodeTitle,
        hasDate: !!normalizedData.publicationDate,
        itemIndex: itemIndex,
        architecture: 'data-transform + sql'
      }
    };
  },
  nodeAccessors,
  {
    logErrors: true,
    stopOnError: false
  }
);

console.log(`Generated ${result.results.length} podcast existence check queries`);
console.log(`Processing stats: ${result.stats.successful}/${result.stats.total} successful`);

if (result.errors.length > 0) {
  console.log('Errors encountered:', result.errors);
}

return result.results;