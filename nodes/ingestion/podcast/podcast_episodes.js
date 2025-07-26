// n8n Code Node: Podcast Feed Data Normalization
// Enhanced with sww-n8n-helpers utilities while maintaining exact business logic
// Placed directly after Check Podcast Feed node

const { 
  processItemsWithN8N,
  parseDurationToSeconds,
  formatFriendlyDuration,
  generateSafeFileName,
  extractFileExtension,
  validateAndExtractUrl,
  cleanHtml,
  truncateWithSeparator,
  createFallbackChain,
  validateAndFormatDate
} = require('sww-n8n-helpers');

// Still need some npm packages for specific functionality not covered by utilities
const _ = require('lodash');
const prettyBytes = require('pretty-bytes');
const moment = require('moment');

// Create batch processing helpers with bound $ function
const { processItems } = processItemsWithN8N($);

const feedItems = $input.all();

console.log(`Processing ${feedItems.length} feed items`);

// Process each feed item using the modern batch processing utility
const batchResult = processItems(feedItems, ($item, $json, $itemIndex) => {
  const episode = $json;
  
  // Extract and validate audio URL using utility
  const rawAudioUrl = _.get(episode, 'enclosure.url') || episode.link;
  const audioUrl = validateAndExtractUrl(rawAudioUrl);
  const isValidAudioUrl = !!audioUrl;
  
  // Build normalized episode using fallback chains and utilities
  const normalizedEpisode = {
    // Core episode information
    episodeGuid: episode.guid || episode.id || null,
    title: truncateWithSeparator(String(episode.title || ''), 250, { separator: ' ' }),
    publicationDate: episode.isoDate || episode.pubDate || null,
    audioUrl: audioUrl,
    
    // Content fields using text processing utilities
    description: truncateWithSeparator(
      cleanHtml(
        createFallbackChain(episode, [
          'content',
          'content:encoded', 
          'contentSnippet',
          'itunes.summary'
        ], '')
      ) || '',
      4000,
      { separator: ' ' }
    ),
    
    summary: truncateWithSeparator(
      cleanHtml(
        createFallbackChain(episode, [
          'contentSnippet',
          'itunes.subtitle',
          'itunes.summary'
        ], '')
      ) || '',
      2000,
      { separator: ' ' }
    ),
    
    // Author information using fallback chain utility
    author: String(createFallbackChain(episode, [
      'itunes.author',
      'dc:creator',
      'author',
      'creator'
    ], 'Unknown')),
    
    // Duration handling using utility functions
    duration: parseDurationToSeconds(_.get(episode, 'itunes.duration')),
    durationFriendly: null, // Set after parsing
    
    // File information with validation and formatting
    audioFileSize: _.toNumber(_.get(episode, 'enclosure.length')) || null,
    audioFileSizeFriendly: null, // Set after parsing
    audioFileType: _.get(episode, 'enclosure.type') || 'audio/mpeg',
    fileExtension: null, // Set after processing
    fileName: null, // Set after processing
    
    // Episode metadata with URL validation using utility
    episodeLink: validateAndExtractUrl(episode.link),
    episodeImage: createFallbackChain(episode, [
      'itunes.image',
      'itunes.image.href', 
      'image.url'
    ], null, (url) => validateAndExtractUrl(url)), // Custom validator function
    
    // iTunes specific with proper boolean conversion
    itunesSubtitle: _.get(episode, 'itunes.subtitle'),
    itunesExplicit: _.get(episode, 'itunes.explicit') === 'true',
    
    // Categories with safe array handling
    categories: _.isArray(episode.categories) ? 
               episode.categories.join(', ') : 
               (episode.categories ? String(episode.categories) : null),
    
    // Processing metadata
    processingMetadata: {
      normalizedAt: moment().toISOString(),
      itemIndex: $itemIndex,
      hasDescription: !_.isEmpty(cleanHtml(createFallbackChain(episode, ['content', 'content:encoded'], ''))),
      hasDuration: !_.isNull(parseDurationToSeconds(_.get(episode, 'itunes.duration'))),
      hasValidAudioUrl: isValidAudioUrl,
      hasValidEpisodeLink: !!validateAndExtractUrl(episode.link),
      hasValidImage: !!createFallbackChain(episode, [
        'itunes.image',
        'itunes.image.href',
        'image.url'
      ], null, (url) => validateAndExtractUrl(url))
    }
  };
  
  // Validate required fields - throw error for batch processor to handle
  if (_.isEmpty(normalizedEpisode.title) || !normalizedEpisode.audioUrl) {
    throw new Error(`Missing required fields: ${
      [
        _.isEmpty(normalizedEpisode.title) ? 'title' : null,
        !normalizedEpisode.audioUrl ? 'audioUrl' : null
      ].filter(Boolean).join(', ')
    }`);
  }
  
  // Process publication date using validation utility with moment fallback
  const validatedDate = validateAndFormatDate(normalizedEpisode.publicationDate);
  if (validatedDate) {
    normalizedEpisode.publicationDate = validatedDate;
    normalizedEpisode.publicationDateFriendly = moment(validatedDate).format('MMMM D, YYYY');
  } else {
    const now = moment();
    normalizedEpisode.publicationDate = now.toISOString();
    normalizedEpisode.publicationDateFriendly = now.format('MMMM D, YYYY');
  }
  
  // Set friendly duration using utility
  if (normalizedEpisode.duration) {
    normalizedEpisode.durationFriendly = formatFriendlyDuration(normalizedEpisode.duration);
  }
  
  // Set friendly file size using pretty-bytes (keeping original logic)
  if (normalizedEpisode.audioFileSize) {
    normalizedEpisode.audioFileSizeFriendly = prettyBytes(normalizedEpisode.audioFileSize);
  }
  
  // Set file extension using utility
  normalizedEpisode.fileExtension = extractFileExtension(
    normalizedEpisode.audioUrl,
    normalizedEpisode.audioFileType,
    'mp3' // default extension
  );
  
  // Generate safe filename using utility
  normalizedEpisode.fileName = generateSafeFileName(
    normalizedEpisode.title,
    normalizedEpisode.fileExtension,
    { maxLength: 100, replacement: '_', fallbackName: 'episode' }
  );
  
  return normalizedEpisode;
  
}, [], {
  logErrors: true,
  stopOnError: false
});

console.log(`Successfully processed ${batchResult.results.length} items`);

// Log processing statistics
console.log(`Summary: ${batchResult.stats.successful} valid items, ${batchResult.stats.failed} errors`);
if (batchResult.stats.successRate < 1) {
  console.log(`Success rate: ${(batchResult.stats.successRate * 100).toFixed(1)}%`);
}

// Log sample result (maintaining original logic)
const validItems = _.filter(batchResult.results, item => !item.json.$error);
if (!_.isEmpty(validItems)) {
  const sample = validItems[0].json;
  console.log(`Sample: "${sample.title}" (${sample.durationFriendly || 'no duration'}) - ${sample.publicationDateFriendly}`);
}

return batchResult.results;