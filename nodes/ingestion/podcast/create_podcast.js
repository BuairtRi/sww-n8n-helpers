// n8n Code Node: Generate Podcast Episode Insertion SQL (Batch Mode)
// Creates KnowledgeSourceInstances records for new podcast episodes
// Runs after podcast episode normalization - includes integrated sanitization

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
      if (typeof value === 'number') {
        return String(value);
      }
      return "'" + String(value) + "'";
    }
  };
}

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

    // Prepare values for SQL insertion (tsqlstring.escape handles SQL injection protection)
    const sqlValues = {
      knowledgeSourceId: tsqlstring.escape(sourceId),
      title: tsqlstring.escape(podcastEpisodes.title?.substring(0, 250) || null),
      publicationDate: tsqlstring.escape(podcastEpisodes.publicationDate),
      audioUrl: tsqlstring.escape(podcastEpisodes.audioUrl?.substring(0, 2000) || null),
      episodeGuid: tsqlstring.escape(podcastEpisodes.episodeGuid?.substring(0, 500) || null),
      description: tsqlstring.escape(podcastEpisodes.description || null),
      summary: tsqlstring.escape(podcastEpisodes.summary || null),
      episodeLink: tsqlstring.escape(podcastEpisodes.episodeLink?.substring(0, 4000) || null),
      duration: podcastEpisodes.duration || 'NULL',
      durationFriendly: tsqlstring.escape(podcastEpisodes.durationFriendly?.substring(0, 50) || null),
      audioFileSize: podcastEpisodes.audioFileSize || 'NULL',
      audioFileSizeFriendly: tsqlstring.escape(podcastEpisodes.audioFileSizeFriendly?.substring(0, 50) || null),
      fileExtension: tsqlstring.escape(podcastEpisodes.fileExtension?.substring(0, 10) || null),
      audioFileType: tsqlstring.escape(podcastEpisodes.audioFileType?.substring(0, 100) || null),
      fileName: tsqlstring.escape(podcastEpisodes.fileName?.substring(0, 255) || null),
      episodeImage: tsqlstring.escape(podcastEpisodes.episodeImage?.substring(0, 4000) || null),
      author: tsqlstring.escape(podcastEpisodes.author?.substring(0, 500) || null)
    };
    
    console.log(`Debug values for item ${$itemIndex}:`, {
      originalTitle: podcastEpisodes.title,
      sqlTitle: sqlValues.title,
      originalGuid: podcastEpisodes.episodeGuid,
      sqlGuid: sqlValues.episodeGuid,
      duration: podcastEpisodes.duration,
      fileSize: podcastEpisodes.audioFileSize
    });

    // Build the insertion SQL query
    const query = `
INSERT INTO KnowledgeSourceInstances
(KnowledgeSourceInstanceId, KnowledgeSourceId, Name, SourceDate, SourceUrl, SourceId, SourceDescription, SourceSummary, SourceLink, Duration, FriendlyDuration, Length, FriendlyLength, SourceFileExtension, SourceMimeType, SourceFileName, SourceImageUrl, Author)
OUTPUT INSERTED.KnowledgeSourceInstanceId
VALUES
(
  NEWID(), 
  ${sqlValues.knowledgeSourceId}, 
  ${sqlValues.title}, 
  ${sqlValues.publicationDate}, 
  ${sqlValues.audioUrl}, 
  ${sqlValues.episodeGuid}, 
  ${sqlValues.description}, 
  ${sqlValues.summary}, 
  ${sqlValues.episodeLink}, 
  ${sqlValues.duration}, 
  ${sqlValues.durationFriendly},
  ${sqlValues.audioFileSize},
  ${sqlValues.audioFileSizeFriendly},
  ${sqlValues.fileExtension},
  ${sqlValues.audioFileType},
  ${sqlValues.fileName},
  ${sqlValues.episodeImage},
  ${sqlValues.author}
)
`;

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
        // SQL-ready values (for reference)
        sqlReady: {
          episodeTitle: sqlValues.title,
          episodeGuid: sqlValues.episodeGuid,
          audioUrl: sqlValues.audioUrl,
          description: sqlValues.description,
          summary: sqlValues.summary
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