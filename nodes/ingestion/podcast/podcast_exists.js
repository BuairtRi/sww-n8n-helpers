// n8n Code Node: Generate Podcast Existence Check SQL (Batch Mode)
// Uses sww-n8n-helpers utilities for safe SQL generation
// Handles multiple podcast episodes in "Run Once for All Items" mode

const { 
  processItemsWithAccessors,
  escapeSqlValue
} = require('sww-n8n-helpers');

// Get all input items (podcast episodes)
const podcastEpisodes = $input.all();

console.log(`Processing ${podcastEpisodes.length} podcast episodes for existence check`);

// Define node accessors that preserve itemMatching behavior
const nodeAccessors = {
  'Ingestion Sources': (itemIndex) => $('Ingestion Sources').itemMatching(itemIndex)?.json
};

// Process each podcast episode using accessor pattern
const result = await processItemsWithAccessors(
  podcastEpisodes,
  // Processor receives: $item, $json, $itemIndex, ingestionSources (from accessor)
  (_$item, json, itemIndex, ingestionSources) => {
    // Validate required data - now using clean camelCase parameter name
    if (!ingestionSources?.knowledgeSourceId) {
      throw new Error(`Missing knowledgeSourceId from Ingestion Sources node for item ${itemIndex}`);
    }

    if (!json?.episodeGuid && !json?.title) {
      throw new Error(`Missing both episodeGuid and title from Podcast Episodes for item ${itemIndex}`);
    }

    // Build the existence check query for this episode using escapeSqlValue utility
    const escapedSourceId = escapeSqlValue(ingestionSources.knowledgeSourceId);
    const escapedGuid = escapeSqlValue(json.episodeGuid);
    const escapedTitle = escapeSqlValue(json.title);
    const escapedDate = escapeSqlValue(json.publicationDate);

    const query = `
SELECT CASE 
  WHEN EXISTS (
    SELECT KnowledgeSourceInstanceId 
    FROM KnowledgeSourceInstances 
    WHERE KnowledgeSourceId = ${escapedSourceId}
      AND SourceId = ${escapedGuid}
  )
  THEN 1
  WHEN EXISTS (
    SELECT KnowledgeSourceInstanceId 
    FROM KnowledgeSourceInstances 
    WHERE Name = ${escapedTitle}
      AND SourceDate = ${escapedDate}
      AND KnowledgeSourceId = ${escapedSourceId}
  )
  THEN 1
  ELSE 0
END as episode_exists
`;

  return {
    query: query,
    parameters: {
      knowledgeSourceId: ingestionSources.knowledgeSourceId,
      episodeGuid: json.episodeGuid,
      episodeTitle: json.title,
      publicationDate: json.publicationDate
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      checkType: 'podcast_episode_existence',
      primaryCheck: json.episodeGuid ? 'guid' : 'title_date',
      hasGuid: !!json.episodeGuid,
      hasTitle: !!json.title,
      hasDate: !!json.publicationDate,
      itemIndex: itemIndex
    }
  };
  },
  nodeAccessors, // Node accessors that preserve itemMatching
  {
    logErrors: true,
    stopOnError: false
  }
);

console.log(`Generated ${result.results.length} podcast existence check queries`);
console.log(`Processing stats: ${result.stats.successful}/${result.stats.total} successful`);

return result.results;