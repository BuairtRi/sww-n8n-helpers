// n8n Code Node: Generate Podcast Episode Insertion SQL (Batch Mode)
// Creates KnowledgeSourceInstances records for new podcast episodes
// Runs after podcast episode normalization - includes integrated sanitization

const { 
  processItemsWithN8N,
  sanitizeForSQL
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

// Create n8n batch processing helpers
const { processItems } = processItemsWithN8N($);

// Get input items (filtered items from previous steps)
const inputItems = $input.all();

console.log(`Processing ${inputItems.length} filtered input items`);

// Process items with automatic context injection and node data extraction
const result = await processItems(
  inputItems,
  // Processor function receives: $item, $json, $itemIndex, podcastEpisode, ingestionSource
  ($item, $json, $itemIndex, podcastEpisode, ingestionSource) => {
    
    console.log(`Item ${itemIndex} - Context injection data:`, {
      episodeTitle: podcastEpisode?.title,
      episodeGuid: podcastEpisode?.episodeGuid,
      sourceId: ingestionSource?.knowledgeSourceId || ingestionSource?.KnowledgeSourceId,
      hasEpisode: !!podcastEpisode,
      hasSource: !!ingestionSource,
      inputItemKeys: $json ? Object.keys($json) : 'no json'
    });

    // Try both possible field name variants
    const sourceId = ingestionSource?.knowledgeSourceId || ingestionSource?.KnowledgeSourceId;
    
    // Validate required data
    if (!sourceId) {
      throw new Error(`Missing knowledgeSourceId from Ingestion Sources for item ${$itemIndex}. Source data: ${JSON.stringify(ingestionSource)}`);
    }

    if (!podcastEpisode?.title) {
      throw new Error(`Missing title from Podcast Episodes for item ${$itemIndex}. Episode data: ${JSON.stringify(podcastEpisode ? Object.keys(podcastEpisode) : 'null')}`);
    }

    // Sanitize and escape all values for SQL insertion
    // First sanitize the content using sww-n8n-helpers, then escape for SQL
    const sanitizedValues = {
      knowledgeSourceId: sourceId, // GUID - no sanitization needed
      title: sanitizeForSQL(podcastEpisode.title, { maxLength: 250 }),
      publicationDate: podcastEpisode.publicationDate, // ISO date - no sanitization needed
      audioUrl: sanitizeForSQL(podcastEpisode.audioUrl, { maxLength: 2000 }),
      episodeGuid: sanitizeForSQL(podcastEpisode.episodeGuid, { maxLength: 500 }),
      description: sanitizeForSQL(podcastEpisode.description, { maxLength: null }),
      summary: sanitizeForSQL(podcastEpisode.summary, { maxLength: null }),
      episodeLink: sanitizeForSQL(podcastEpisode.episodeLink, { maxLength: 4000 }),
      duration: podcastEpisode.duration, // Numeric - no sanitization needed
      durationFriendly: sanitizeForSQL(podcastEpisode.durationFriendly, { maxLength: 50 }),
      audioFileSize: podcastEpisode.audioFileSize, // Numeric - no sanitization needed
      audioFileSizeFriendly: sanitizeForSQL(podcastEpisode.audioFileSizeFriendly, { maxLength: 50 }),
      fileExtension: sanitizeForSQL(podcastEpisode.fileExtension, { maxLength: 10 }),
      audioFileType: sanitizeForSQL(podcastEpisode.audioFileType, { maxLength: 100 }),
      fileName: sanitizeForSQL(podcastEpisode.fileName, { maxLength: 255 }),
      episodeImage: sanitizeForSQL(podcastEpisode.episodeImage, { maxLength: 4000 }),
      author: sanitizeForSQL(podcastEpisode.author, { maxLength: 500 })
    };

    // Now escape the sanitized values for SQL insertion
    const escapedValues = {
      knowledgeSourceId: tsqlstring.escape(sanitizedValues.knowledgeSourceId),
      title: tsqlstring.escape(sanitizedValues.title),
      publicationDate: tsqlstring.escape(sanitizedValues.publicationDate),
      audioUrl: tsqlstring.escape(sanitizedValues.audioUrl),
      episodeGuid: tsqlstring.escape(sanitizedValues.episodeGuid),
      description: tsqlstring.escape(sanitizedValues.description),
      summary: tsqlstring.escape(sanitizedValues.summary),
      episodeLink: tsqlstring.escape(sanitizedValues.episodeLink),
      duration: sanitizedValues.duration || 'NULL',
      durationFriendly: tsqlstring.escape(sanitizedValues.durationFriendly),
      audioFileSize: sanitizedValues.audioFileSize || 'NULL',
      audioFileSizeFriendly: tsqlstring.escape(sanitizedValues.audioFileSizeFriendly),
      fileExtension: tsqlstring.escape(sanitizedValues.fileExtension),
      audioFileType: tsqlstring.escape(sanitizedValues.audioFileType),
      fileName: tsqlstring.escape(sanitizedValues.fileName),
      episodeImage: tsqlstring.escape(sanitizedValues.episodeImage),
      author: tsqlstring.escape(sanitizedValues.author)
    };
    
    console.log(`Debug values for item ${$itemIndex}:`, {
      originalTitle: podcastEpisode.title,
      sanitizedTitle: sanitizedValues.title,
      escapedTitle: escapedValues.title,
      originalGuid: podcastEpisode.episodeGuid,
      sanitizedGuid: sanitizedValues.episodeGuid,
      escapedGuid: escapedValues.episodeGuid,
      duration: podcastEpisode.duration,
      fileSize: podcastEpisode.audioFileSize
    });

    // Build the insertion SQL query
    const query = `
INSERT INTO KnowledgeSourceInstances
(KnowledgeSourceInstanceId, KnowledgeSourceId, Name, SourceDate, SourceUrl, SourceId, SourceDescription, SourceSummary, SourceLink, Duration, FriendlyDuration, Length, FriendlyLength, SourceFileExtension, SourceMimeType, SourceFileName, SourceImageUrl, Author)
OUTPUT INSERTED.KnowledgeSourceInstanceId
VALUES
(
  NEWID(), 
  ${escapedValues.knowledgeSourceId}, 
  ${escapedValues.title}, 
  ${escapedValues.publicationDate}, 
  ${escapedValues.audioUrl}, 
  ${escapedValues.episodeGuid}, 
  ${escapedValues.description}, 
  ${escapedValues.summary}, 
  ${escapedValues.episodeLink}, 
  ${escapedValues.duration}, 
  ${escapedValues.durationFriendly},
  ${escapedValues.audioFileSize},
  ${escapedValues.audioFileSizeFriendly},
  ${escapedValues.fileExtension},
  ${escapedValues.audioFileType},
  ${escapedValues.fileName},
  ${escapedValues.episodeImage},
  ${escapedValues.author}
)
`;

    return {
      query: query,
      parameters: {
        // Original values
        original: {
          knowledgeSourceId: sourceId,
          episodeTitle: podcastEpisode.title,
          episodeGuid: podcastEpisode.episodeGuid,
          publicationDate: podcastEpisode.publicationDate,
          audioUrl: podcastEpisode.audioUrl,
          duration: podcastEpisode.duration,
          audioFileSize: podcastEpisode.audioFileSize
        },
        // Sanitized values (for reference)
        sanitized: {
          episodeTitle: sanitizedValues.title,
          episodeGuid: sanitizedValues.episodeGuid,
          audioUrl: sanitizedValues.audioUrl,
          description: sanitizedValues.description,
          summary: sanitizedValues.summary
        }
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        queryType: 'podcast_episode_insertion',
        itemIndex: $itemIndex,
        hasTitle: !!podcastEpisode.title,
        hasGuid: !!podcastEpisode.episodeGuid,
        hasAudioUrl: !!podcastEpisode.audioUrl,
        hasDuration: podcastEpisode.duration > 0,
        hasFileSize: podcastEpisode.audioFileSize > 0
      }
    };
  },
  ['Podcast Episodes', 'Ingestion Sources'], // Node names to extract data from
  {
    logErrors: true,
    stopOnError: false
  }
);

// Log summary using the enhanced result structure
console.log(`Processing completed:`, {
  total: result.stats.total,
  successful: result.stats.successful,
  failed: result.stats.failed,
  successRate: `${(result.stats.successRate * 100).toFixed(1)}%`
});

if (result.stats.failed > 0) {
  console.log(`Errors encountered:`, result.stats.errorBreakdown);
  console.log(`Sample errors:`, result.stats.sampleErrors);
}

if (result.stats.successful > 0) {
  const sample = result.results.find(item => !item.json.$error)?.json;
  if (sample) {
    console.log(`Sample episode: "${sample.parameters.original.episodeTitle}" - GUID: ${sample.parameters.original.episodeGuid}`);
  }
}

return result.results;