// n8n Code Node: Generate Podcast Episode Insertion SQL (Batch Mode)
// Creates KnowledgeSourceInstances records for new podcast episodes
// Runs after podcast episode normalization - includes integrated sanitization

const { 
  processItemsWithPairing,
  normalizeData,
  COMMON_FIELD_CONFIGS,
  generateInsert,
  raw
} = require('sww-n8n-helpers');


// Define node accessors that preserve itemMatching behavior
const nodeAccessors = {
  'Podcast Episodes': (itemIndex) => $('Podcast Episodes').itemMatching(itemIndex)?.json,
  'Ingestion Sources': (itemIndex) => $('Ingestion Sources').itemMatching(itemIndex)?.json
};

// Get input items (filtered items from previous steps)
const inputData = $input.all();


// Process items with accessor pattern for reliable node data access
const result = await processItemsWithPairing(
  inputData,
  // Processor function receives: $item, $json, $itemIndex, podcastEpisodes, ingestionSources (from accessors)
  ($item, $json, $itemIndex, podcastEpisodes, ingestionSources) => {
    // Validate required data from accessors

    // Try both possible field name variants
    const sourceId = ingestionSources?.knowledgeSourceId || ingestionSources?.KnowledgeSourceId;
    
    // Validate required data with improved error messages
    if (!sourceId) {
      throw new Error(`Missing knowledgeSourceId from Ingestion Sources for item ${$itemIndex}. Available fields: ${Object.keys(ingestionSources || {}).join(', ')}`);
    }

    if (!podcastEpisodes?.title) {
      throw new Error(`Missing title from Podcast Episodes for item ${$itemIndex}. Available fields: ${Object.keys(podcastEpisodes || {}).join(', ')}`);
    }

    if (!podcastEpisodes?.episodeGuid) {
      throw new Error(`Missing episodeGuid from Podcast Episodes for item ${$itemIndex}. This is required for episode identification.`);
    }

    // Define business normalization schema for podcast episodes
    const episodeSchema = {
      KnowledgeSourceId: COMMON_FIELD_CONFIGS.knowledgeSourceId,
      Name: { ...COMMON_FIELD_CONFIGS.title, maxLength: 250 },
      SourceDate: COMMON_FIELD_CONFIGS.publicationDate,
      SourceUrl: { ...COMMON_FIELD_CONFIGS.sourceUrl, maxLength: 2000 },
      SourceId: { ...COMMON_FIELD_CONFIGS.guid, maxLength: 500 },
      SourceDescription: { ...COMMON_FIELD_CONFIGS.description, maxLength: 4000 },
      SourceSummary: { ...COMMON_FIELD_CONFIGS.summary, maxLength: 2000 },
      SourceLink: { ...COMMON_FIELD_CONFIGS.sourceLink, maxLength: 4000 },
      Duration: COMMON_FIELD_CONFIGS.duration,
      FriendlyDuration: { type: 'string', maxLength: 50, trimWhitespace: true },
      Length: COMMON_FIELD_CONFIGS.fileSize,
      FriendlyLength: { type: 'string', maxLength: 50, trimWhitespace: true },
      SourceFileExtension: COMMON_FIELD_CONFIGS.fileExtension,
      SourceMimeType: COMMON_FIELD_CONFIGS.mimeType,
      SourceFileName: COMMON_FIELD_CONFIGS.fileName,
      SourceImageUrl: { ...COMMON_FIELD_CONFIGS.imageUrl, maxLength: 4000 },
      Author: COMMON_FIELD_CONFIGS.author
    };

    // Prepare raw data for normalization
    const rawEpisodeData = {
      KnowledgeSourceId: sourceId,
      Name: podcastEpisodes.title,
      SourceDate: podcastEpisodes.publicationDate,
      SourceUrl: podcastEpisodes.audioUrl,
      SourceId: podcastEpisodes.episodeGuid,
      SourceDescription: podcastEpisodes.description,
      SourceSummary: podcastEpisodes.summary,
      SourceLink: podcastEpisodes.episodeLink,
      Duration: podcastEpisodes.duration,
      FriendlyDuration: podcastEpisodes.durationFriendly,
      Length: podcastEpisodes.audioFileSize,
      FriendlyLength: podcastEpisodes.audioFileSizeFriendly,
      SourceFileExtension: podcastEpisodes.fileExtension,
      SourceMimeType: podcastEpisodes.audioFileType,
      SourceFileName: podcastEpisodes.fileName,
      SourceImageUrl: podcastEpisodes.episodeImage,
      Author: podcastEpisodes.author
    };

    // Apply business normalization (handles nulls, truncation, HTML cleaning, etc.)
    const episodeData = normalizeData(rawEpisodeData, episodeSchema);
    

    // Generate SQL using the new architecture - pure SQL generation with normalized data
    const query = generateInsert('KnowledgeSourceInstances', episodeData, {
      outputClause: 'OUTPUT INSERTED.KnowledgeSourceInstanceId',
      rawValues: {
        KnowledgeSourceInstanceId: raw('NEWID()')
      }
    });

    return {
      query: query,
      parameters: {
        // Original values
        original: {
          knowledgeSourceId: sourceId,
          episodeTitle: podcastEpisodes.title,
          episodeGuid: podcastEpisodes.episodeGuid,
          publicationDate: podcastEpisodes.publicationDate,
          audioUrl: podcastEpisodes.audioUrl,
          duration: podcastEpisodes.duration,
          audioFileSize: podcastEpisodes.audioFileSize
        },
        // Processed data for reference
        processed: {
          episodeTitle: episodeData.Name,
          episodeGuid: episodeData.SourceId,
          audioUrl: episodeData.SourceUrl,
          description: episodeData.SourceDescription,
          summary: episodeData.SourceSummary
        }
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        queryType: 'podcast_episode_insertion',
        itemIndex: $itemIndex,
        hasTitle: !!podcastEpisodes.title,
        hasGuid: !!podcastEpisodes.episodeGuid,
        hasAudioUrl: !!podcastEpisodes.audioUrl,
        hasDuration: podcastEpisodes.duration > 0,
        hasFileSize: podcastEpisodes.audioFileSize > 0
      }
    };
  },
  nodeAccessors, // Node accessors that preserve itemMatching
  {
    logErrors: true,
    stopOnError: false
  }
);

// Log summary statistics
if (result.stats.failed > 0) {
  console.log(`Processed ${result.stats.total} episodes: ${result.stats.successful} successful, ${result.stats.failed} failed`);
} else {
  console.log(`Successfully processed ${result.stats.successful} podcast episodes`);
}

// Return results (maintains n8n item pairing)
return result.results;