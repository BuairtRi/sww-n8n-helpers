// n8n Code Node: Generate Podcast Existence Check SQL (Batch Mode)
// Uses sww-n8n-helpers utilities for safe SQL generation
// Handles multiple podcast episodes in "Run Once for All Items" mode

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

// Get all input items (podcast episodes)
const podcastEpisodes = $input.all();
const ingestionSources = $('Ingestion Sources').all();

console.log(`Processing ${podcastEpisodes.length} podcast episodes for existence check`);

// Create a lookup map for ingestion sources by index
const sourceMap = new Map();
ingestionSources.forEach((source, index) => {
  sourceMap.set(index, source.json);
});

// Process each podcast episode with batch utility
const results = processItemsWithPairing(podcastEpisodes, (item, itemIndex) => {
  const podcastEpisode = item.json;
  const ingestionSource = sourceMap.get(itemIndex) || ingestionSources[0]?.json; // Fallback to first source if mapping fails
  
  // Validate required data
  if (!ingestionSource?.knowledgeSourceId) {
    throw new Error(`Missing knowledgeSourceId from Ingestion Sources node for item ${itemIndex}`);
  }

  if (!podcastEpisode?.episodeGuid && !podcastEpisode?.title) {
    throw new Error(`Missing both episodeGuid and title from Podcast Episodes for item ${itemIndex}`);
  }

  // Build the existence check query for this episode
  const escapedSourceId = tsqlstring.escape(ingestionSource.knowledgeSourceId);
  const escapedGuid = tsqlstring.escape(podcastEpisode.episodeGuid);
  const escapedTitle = tsqlstring.escape(podcastEpisode.title);
  const escapedDate = tsqlstring.escape(podcastEpisode.publicationDate);
  
  console.log(`Debug values for item ${itemIndex}:`, {
    originalSourceId: ingestionSource.knowledgeSourceId,
    escapedSourceId,
    originalGuid: podcastEpisode.episodeGuid,
    escapedGuid,
    originalTitle: podcastEpisode.title,
    escapedTitle
  });

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
      knowledgeSourceId: ingestionSource.knowledgeSourceId,
      episodeGuid: podcastEpisode.episodeGuid,
      episodeTitle: podcastEpisode.title,
      publicationDate: podcastEpisode.publicationDate
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      checkType: 'podcast_episode_existence',
      primaryCheck: podcastEpisode.episodeGuid ? 'guid' : 'title_date',
      hasGuid: !!podcastEpisode.episodeGuid,
      hasTitle: !!podcastEpisode.title,
      hasDate: !!podcastEpisode.publicationDate,
      itemIndex: itemIndex
    }
  };
}, {
  maintainPairing: true,
  logErrors: true,
  stopOnError: false
});

console.log(`Generated ${results.length} podcast existence check queries`);

return results;