// n8n Code Node: Generate Podcast Existence Check SQL (Batch Mode)
// Uses sww-n8n-helpers utilities for safe SQL generation
// Handles multiple podcast episodes in "Run Once for All Items" mode

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

// Create batch processing helpers with bound $ function
const { processItems } = processItemsWithN8N($);

// Get all input items (podcast episodes)
const podcastEpisodes = $input.all();

console.log(`Processing ${podcastEpisodes.length} podcast episodes for existence check`);

// Process each podcast episode with modern batch utility
const result = processItems(
  podcastEpisodes,
  // Processor receives: $item, $json, $itemIndex, ingestionSources (camelCase from "Ingestion Sources")
  ($item, json, itemIndex, ingestionSources) => {
    console.log('itemIndex', itemIndex);
    console.log('ingestionSources parameter:', ingestionSources);
    console.log('ingestionSources type:', typeof ingestionSources);
    
    // Debug: Try to access the node directly
    try {
      const directAccess = $('Ingestion Sources');
      console.log('Direct $ access result:', directAccess);
      console.log('Direct $.item:', directAccess?.item);
      console.log('Direct $.item.json:', directAccess?.item?.json);
      console.log('Direct $.all():', directAccess?.all());
    } catch (e) {
      console.log('Direct access failed:', e.message);
    }
    
    // Validate required data - now using clean camelCase parameter name
    if (!ingestionSources?.knowledgeSourceId) {
      console.log('❌ ingestionSources is missing knowledgeSourceId');
      console.log('ingestionSources content:', JSON.stringify(ingestionSources, null, 2));
      throw new Error(`Missing knowledgeSourceId from Ingestion Sources node for item ${itemIndex}`);
    }

    if (!json?.episodeGuid && !json?.title) {
      throw new Error(`Missing both episodeGuid and title from Podcast Episodes for item ${itemIndex}`);
    }

    // Build the existence check query for this episode
    const escapedSourceId = tsqlstring.escape(ingestionSources.knowledgeSourceId);
    const escapedGuid = tsqlstring.escape(json.episodeGuid);
    const escapedTitle = tsqlstring.escape(json.title);
    const escapedDate = tsqlstring.escape(json.publicationDate);
  
    console.log(`Debug values for item ${itemIndex}:`, {
      originalSourceId: ingestionSources.knowledgeSourceId,
      escapedSourceId,
      originalGuid: json.episodeGuid,
      escapedGuid,
      originalTitle: json.title,
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
  ['Ingestion Sources'], // Node names to extract data from
  {
    logErrors: true,
    stopOnError: false
  }
);

console.log(`Generated ${result.results.length} podcast existence check queries`);
console.log(`Processing stats: ${result.stats.successful}/${result.stats.total} successful`);

return result.results;