// n8n Code Node: Generate Podcast Existence Check SQL (Batch Mode) - Updated Version
// Now using the new accessor pattern to preserve itemMatching behavior
// Handles multiple podcast episodes in "Run Once for All Items" mode

const { processItemsWithAccessors, sanitizeForSQL } = require('sww-n8n-helpers');

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

    // Build the existence check query for this episode using sanitizeForSQL utility
    const escapedSourceId = sanitizeForSQL(ingestionSources.knowledgeSourceId);
    const escapedGuid = sanitizeForSQL(json.episodeGuid);
    const escapedTitle = sanitizeForSQL(json.title);
    const escapedDate = sanitizeForSQL(json.publicationDate);

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