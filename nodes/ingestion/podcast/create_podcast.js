// n8n Code Node: Generate Podcast Episode Insertion SQL (Batch Mode)
// Creates KnowledgeSourceInstances records for new podcast episodes
// Runs after podcast episode normalization - includes integrated sanitization

const { 
  processItemsWithN8N,
  generateInsertStatement,
  createRawSql
} = require('sww-n8n-helpers');

// DEBUG: Test direct node access before using batch utility
const firstData = $input.all()[0];
const ingestion = $('Ingestion Sources').itemMatching(0);
console.log('🧪 DIRECT ACCESS TEST:');
console.log('📋 firstData:', firstData);
console.log('🏢 ingestion:', ingestion);
console.log('🔑 ingestion.json:', ingestion?.json);
console.log('🔑 ingestion keys:', ingestion?.json ? Object.keys(ingestion.json) : 'no json');

// Create n8n batch processing helpers with bound $ function
const { processItems } = processItemsWithN8N($);

// Get input items (filtered items from previous steps)
const inputData = $input.all();

console.log(`Processing ${inputData.length} filtered input items`);

// Process items with automatic context injection and node data extraction
const result = processItems(
  inputData,
  // Processor function receives: $item, $json, $itemIndex, podcastEpisodes, ingestionSources (camelCase)
  ($item, $json, $itemIndex, podcastEpisodes, ingestionSources) => {
    
    console.log(`\n🔍 DEBUGGING ITEM ${$itemIndex}:`);
    console.log('📋 podcastEpisodes type:', typeof podcastEpisodes);
    console.log('📋 podcastEpisodes value:', podcastEpisodes);
    console.log('📋 podcastEpisodes keys:', podcastEpisodes ? Object.keys(podcastEpisodes) : 'null/undefined');
    
    console.log('🏢 ingestionSources type:', typeof ingestionSources);
    console.log('🏢 ingestionSources value:', ingestionSources);
    console.log('🏢 ingestionSources keys:', ingestionSources ? Object.keys(ingestionSources) : 'null/undefined');
    
    // Test direct access to nodes
    try {
      console.log('📍 Direct $("Podcast Episodes"):', $("Podcast Episodes"));
      console.log('📍 Direct $("Podcast Episodes").item:', $("Podcast Episodes")?.item);
      console.log('📍 Direct $("Podcast Episodes").all():', $("Podcast Episodes")?.all());
    } catch (e) {
      console.log('❌ Direct Podcast Episodes access failed:', e.message);
    }
    
    try {
      console.log('📍 Direct $("Ingestion Sources"):', $("Ingestion Sources"));
      console.log('📍 Direct $("Ingestion Sources").item:', $("Ingestion Sources")?.item);
      console.log('📍 Direct $("Ingestion Sources").all():', $("Ingestion Sources")?.all());
    } catch (e) {
      console.log('❌ Direct Ingestion Sources access failed:', e.message);
    }
    
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

    // Prepare data for SQL insertion using the simplified utilities
    const episodeData = {
      KnowledgeSourceInstanceId: createRawSql('NEWID()'),
      KnowledgeSourceId: sourceId,
      Name: podcastEpisodes.title?.substring(0, 250) || null,
      SourceDate: podcastEpisodes.publicationDate,
      SourceUrl: podcastEpisodes.audioUrl?.substring(0, 2000) || null,
      SourceId: podcastEpisodes.episodeGuid?.substring(0, 500) || null,
      SourceDescription: podcastEpisodes.description || null,
      SourceSummary: podcastEpisodes.summary || null,
      SourceLink: podcastEpisodes.episodeLink?.substring(0, 4000) || null,
      Duration: podcastEpisodes.duration || null,
      FriendlyDuration: podcastEpisodes.durationFriendly?.substring(0, 50) || null,
      Length: podcastEpisodes.audioFileSize || null,
      FriendlyLength: podcastEpisodes.audioFileSizeFriendly?.substring(0, 50) || null,
      SourceFileExtension: podcastEpisodes.fileExtension?.substring(0, 10) || null,
      SourceMimeType: podcastEpisodes.audioFileType?.substring(0, 100) || null,
      SourceFileName: podcastEpisodes.fileName?.substring(0, 255) || null,
      SourceImageUrl: podcastEpisodes.episodeImage?.substring(0, 4000) || null,
      Author: podcastEpisodes.author?.substring(0, 500) || null
    };
    
    console.log(`Debug values for item ${$itemIndex}:`, {
      originalTitle: podcastEpisodes.title,
      originalGuid: podcastEpisodes.episodeGuid,
      duration: podcastEpisodes.duration,
      fileSize: podcastEpisodes.audioFileSize
    });

    // Generate SQL using the utility function
    const query = generateInsertStatement('KnowledgeSourceInstances', episodeData, {
      outputClause: 'OUTPUT INSERTED.KnowledgeSourceInstanceId'
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
  ['Podcast Episodes', 'Ingestion Sources'], // Node names to extract data from
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