// n8n Code Node: Generate Podcast Episode Insertion SQL (Batch Mode)
// Creates KnowledgeSourceInstances records for new podcast episodes
// Runs after podcast episode normalization - includes integrated sanitization

const { 
  processItemsWithAccessors,
  normalizeData,
  COMMON_FIELD_CONFIGS,
  generateInsert,
  raw
} = require('sww-n8n-helpers');

// DEBUG: Test direct node access before using batch utility
const firstData = $input.all()[0];
const ingestion = $('Ingestion Sources').itemMatching(0);
console.log('🧪 DIRECT ACCESS TEST:');
console.log('📋 firstData:', firstData);
console.log('🏢 ingestion:', ingestion);
console.log('🔑 ingestion.json:', ingestion?.json);
console.log('🔑 ingestion keys:', ingestion?.json ? Object.keys(ingestion.json) : 'no json');

// Define node accessors that preserve itemMatching behavior
const nodeAccessors = {
  'Podcast Episodes': (itemIndex) => $('Podcast Episodes').itemMatching(itemIndex)?.json,
  'Ingestion Sources': (itemIndex) => $('Ingestion Sources').itemMatching(itemIndex)?.json
};

// Get input items (filtered items from previous steps)
const inputData = $input.all();

console.log(`Processing ${inputData.length} filtered input items`);

// Process items with accessor pattern for reliable node data access
const result = await processItemsWithAccessors(
  inputData,
  // Processor function receives: $item, $json, $itemIndex, podcastEpisodes, ingestionSources (from accessors)
  ($item, $json, $itemIndex, podcastEpisodes, ingestionSources) => {
    
    console.log(`\n🔍 DEBUGGING ITEM ${$itemIndex}:`);
    console.log('📋 podcastEpisodes type:', typeof podcastEpisodes);
    console.log('📋 podcastEpisodes value:', podcastEpisodes);
    console.log('📋 podcastEpisodes keys:', podcastEpisodes ? Object.keys(podcastEpisodes) : 'null/undefined');
    
    console.log('🏢 ingestionSources type:', typeof ingestionSources);
    console.log('🏢 ingestionSources value:', ingestionSources);
    console.log('🏢 ingestionSources keys:', ingestionSources ? Object.keys(ingestionSources) : 'null/undefined');
    
    // Node data is now provided via accessors - no need for direct $ access testing
    
    console.log(`Item ${$itemIndex} - Context injection data:`, {
      episodeTitle: podcastEpisodes?.title,
      episodeGuid: podcastEpisodes?.episodeGuid,
      sourceId: ingestionSources?.knowledgeSourceId || ingestionSources?.KnowledgeSourceId,
      hasEpisode: !!podcastEpisodes,
      hasSource: !!ingestionSources,
      inputItemKeys: $json ? Object.keys($json) : 'no json'
    });

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
    
    console.log(`Debug values for item ${$itemIndex}:`, {
      originalTitle: podcastEpisodes.title,
      originalGuid: podcastEpisodes.episodeGuid,
      duration: podcastEpisodes.duration,
      fileSize: podcastEpisodes.audioFileSize
    });

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

// Log comprehensive processing statistics
console.log(`\n=== Podcast Episode Processing Summary ===`);
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
    console.log(`\nSample successful episode: "${sample.parameters.original.episodeTitle}"`);
    console.log(`  GUID: ${sample.parameters.original.episodeGuid}`);
    console.log(`  Publication Date: ${sample.parameters.original.publicationDate}`);
    console.log(`  Duration: ${sample.parameters.original.duration}s`);
  }
}

console.log(`=== End Processing Summary ===\n`);

// Return results (maintains n8n item pairing)
return result.results;