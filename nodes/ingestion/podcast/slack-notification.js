// Enhanced Slack Notification for New Podcast Episodes (Batch Mode) - Clean Architecture
// Creates rich, informative Slack blocks using normalized episode data
// Uses new accessor pattern for reliable node data access

const { 
  processItemsWithAccessors,
  normalizeData,
  COMMON_FIELD_CONFIGS,
  createFallbackChain,
  validateAndExtractUrl,
  generateExcerpt
} = require('sww-n8n-helpers');

// Helper function for safe text handling with Slack escaping and normalization
function safeSlackText(text, maxLength = 150) {
  if (!text) return "N/A";
  
  // Normalize the text using our data transform utilities
  const normalizedText = normalizeData(
    { text: text }, 
    { text: { type: 'string', cleanHtml: true, trimWhitespace: true, maxLength: maxLength } }
  ).text;
  
  if (!normalizedText) return "N/A";
  
  // Basic escaping for special characters
  return normalizedText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Helper function to create key-value rich text blocks
function createKeyValueBlock(key, value, maxLength = 200) {
  if (!value || value === 'N/A' || value === 'Unknown') return null;
  
  return {
    "type": "rich_text",
    "elements": [
      {
        "type": "rich_text_section",
        "elements": [
          {
            "type": "text",
            "text": `${key}: `,
            "style": { "bold": true }
          },
          {
            "type": "text",
            "text": safeSlackText(value, maxLength)
          }
        ]
      }
    ]
  };
}

// Helper function to create action buttons with URL validation
function createActionButton(text, url, style = "primary") {
  // Use validateAndExtractUrl to ensure URL is valid
  const validUrl = validateAndExtractUrl(url);
  if (!validUrl) return null;
  
  return {
    "type": "button",
    "text": {
      "type": "plain_text",
      "text": safeSlackText(text, 75),
      "emoji": true
    },
    "style": style,
    "url": validUrl
  };
}

// Get all input items for batch processing
const inputData = $input.all();

console.log(`Processing ${inputData.length} episodes for Slack notifications`);

// Define node accessors that preserve itemMatching behavior
const nodeAccessors = {
  'Podcast Episodes': (itemIndex) => $('Podcast Episodes').itemMatching(itemIndex)?.json,
  'Ingestion Sources': (itemIndex) => $('Ingestion Sources').itemMatching(itemIndex)?.json
};

// Process items using clean architecture
const result = await processItemsWithAccessors(
  inputData,
  // Processor function receives: $item, $json, $itemIndex, podcastEpisode, ingestionSources (from accessors)
  (_$item, $json, $itemIndex, podcastEpisode, ingestionSources) => {
    
    console.log(`Processing Slack notification for item ${$itemIndex}:`, {
      hasEpisodeData: !!podcastEpisode,
      hasIngestionSources: !!ingestionSources,
      episodeTitle: podcastEpisode?.title || 'Unknown',
      podcastName: ingestionSources?.knowledgeSource?.name || 'Unknown',
      inputItemKeys: $json ? Object.keys($json) : 'no json'
    });
    
    // Define normalization schema for Slack notification data
    const slackDataSchema = {
      // Episode fields
      title: COMMON_FIELD_CONFIGS.title,
      summary: { ...COMMON_FIELD_CONFIGS.summary, cleanHtml: true },
      description: { ...COMMON_FIELD_CONFIGS.description, cleanHtml: true },
      author: COMMON_FIELD_CONFIGS.author,
      duration: COMMON_FIELD_CONFIGS.duration,
      durationFriendly: { type: 'string', maxLength: 50, trimWhitespace: true },
      publicationDate: COMMON_FIELD_CONFIGS.publicationDate,
      publicationDateFriendly: { type: 'string', maxLength: 100, trimWhitespace: true },
      episodeLink: COMMON_FIELD_CONFIGS.url,
      audioUrl: COMMON_FIELD_CONFIGS.sourceUrl,
      audioFileSize: COMMON_FIELD_CONFIGS.fileSize,
      audioFileSizeFriendly: { type: 'string', maxLength: 50, trimWhitespace: true },
      fileExtension: COMMON_FIELD_CONFIGS.fileExtension,
      // Podcast fields
      podcastName: { ...COMMON_FIELD_CONFIGS.name, maxLength: 200 },
      // Optional fields
      season: { type: 'integer', required: false },
      episodeType: { type: 'string', maxLength: 50, trimWhitespace: true, required: false },
      keywords: { type: 'string', maxLength: 500, trimWhitespace: true, required: false }
    };

    // Prepare raw data for normalization (combining episode and ingestion source data)
    const rawSlackData = {
      // Episode data (prefer from accessor, fallback to input)
      ...(podcastEpisode || $json || {}),
      // Podcast name from ingestion sources
      podcastName: ingestionSources?.knowledgeSource?.name,
    };

    // Apply business normalization
    const normalizedData = normalizeData(rawSlackData, slackDataSchema);
    
    // Use normalized data
    const episodeData = normalizedData;
    const podcastData = { Name: normalizedData.podcastName };
    
    // Check if this is an error item
    if (episodeData.$error || episodeData._error) {
      const error = episodeData.$error || episodeData._error;
      return {
        "text": `⚠️ Episode processing error: ${error.message}`,
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": `⚠️ *Episode Processing Error*\n\n*Error:* ${error.message}\n\n*Episode:* ${episodeData.title || 'Unknown'}\n*GUID:* ${episodeData.episodeGuid || 'Unknown'}\n*Item Index:* ${$itemIndex}`
            }
          }
        ]
      };
    }
  
    // Extract key episode information using fallback chains for robust data access
    const episodeTitle = createFallbackChain(episodeData, ['title', 'name'], 'Unknown Episode');
    const podcastName = createFallbackChain(podcastData, ['Name', 'title', 'name'], 'Unknown Podcast');
    const duration = createFallbackChain(episodeData, ['durationFriendly', 'duration']);
    const author = createFallbackChain(episodeData, ['author', 'itunesAuthor', 'creator']);
    const publishDate = createFallbackChain(episodeData, ['publicationDateFriendly', 'publishDate', 'pubDate']);
    const rawSummary = createFallbackChain(episodeData, ['slackSummary', 'episodeSummary', 'summary', 'description']);
    const episodeLink = validateAndExtractUrl(createFallbackChain(episodeData, ['episodeLink', 'link', 'url']));
    const audioUrl = validateAndExtractUrl(createFallbackChain(episodeData, ['audioUrl', 'enclosureUrl', 'mediaUrl']));
    const fileSize = createFallbackChain(episodeData, ['audioFileSizeFriendly', 'fileSizeFriendly', 'fileSize']);
    const fileType = createFallbackChain(episodeData, ['fileExtension', 'extension'])?.toUpperCase();
    const season = createFallbackChain(episodeData, ['itunesSeason', 'season']);
    const episodeType = createFallbackChain(episodeData, ['itunesEpisodeType', 'episodeType'], 'full');
    const keywords = createFallbackChain(episodeData, ['itunesKeywords', 'keywords', 'tags']);
    
    // Generate smart excerpt from summary/description
    const summary = rawSummary ? generateExcerpt(rawSummary, 300, { completeSentences: true }) : null;
  
    // Build blocks array starting with header
    const blocks = [
    // Header with podcast name and new episode indicator
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": `🎧 New Episode: ${safeSlackText(podcastName, 130)}`,
        "emoji": true
      }
    },
    
    // Episode title as prominent section
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": `*${safeSlackText(episodeTitle, 500)}*`
      }
    }
    ];
    
    // Add episode metadata - only include fields that have values
    const metadataBlocks = [];
    
    if (author) {
      const authorBlock = createKeyValueBlock("Host/Author", author);
      if (authorBlock) metadataBlocks.push(authorBlock);
    }
    
    if (publishDate) {
      const dateBlock = createKeyValueBlock("Published", publishDate);
      if (dateBlock) metadataBlocks.push(dateBlock);
    }
    
    if (duration) {
      const durationBlock = createKeyValueBlock("Duration", duration);
      if (durationBlock) metadataBlocks.push(durationBlock);
    }
    
    // Season and episode type info
    const episodeInfo = [];
    if (season) episodeInfo.push(`Season ${season}`);
    if (episodeType && episodeType !== 'full') episodeInfo.push(episodeType.charAt(0).toUpperCase() + episodeType.slice(1));
    
    if (episodeInfo.length > 0) {
      const episodeInfoBlock = createKeyValueBlock("Episode Info", episodeInfo.join(' • '));
      if (episodeInfoBlock) metadataBlocks.push(episodeInfoBlock);
    }
    
    // Add all metadata blocks
    blocks.push(...metadataBlocks);
    
    // Add summary if available and substantial
    if (summary && summary.trim().length > 10) {
      blocks.push({
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": safeSlackText(summary, 1000)
        }
      });
    }
    
    // Add keywords if available
    if (keywords && keywords.trim().length > 0) {
      blocks.push({
        "type": "context",
        "elements": [
          {
            "type": "mrkdwn",
            "text": `🏷️ *Keywords:* ${safeSlackText(keywords, 500)}`
          }
        ]
      });
    }
    
    // Add divider before actions
    blocks.push({ "type": "divider" });
    
    // Create action buttons
    const actionElements = [];
    
    // Primary action - Listen button (prefer episode page over direct audio)
    if (episodeLink) {
      const listenButton = createActionButton("🎧 Listen to Episode", episodeLink, "primary");
      if (listenButton) actionElements.push(listenButton);
    } else if (audioUrl) {
      const audioButton = createActionButton("🎵 Play Audio", audioUrl, "primary");
      if (audioButton) actionElements.push(audioButton);
    }
    
    // Secondary action - Direct audio link if we also have episode page
    if (episodeLink && audioUrl && episodeLink !== audioUrl) {
      const audioButton = createActionButton("📥 Direct Audio", audioUrl);
      if (audioButton) actionElements.push(audioButton);
    }
    
    // Add actions if we have any
    if (actionElements.length > 0) {
      blocks.push({
        "type": "actions",
        "elements": actionElements
      });
    }
    
    // Add context footer with file info and publication date
    const contextInfo = [];
    
    if (publishDate) {
      contextInfo.push(`📅 ${publishDate}`);
    }
    
    if (fileType && fileSize) {
      contextInfo.push(`📁 ${fileType} • ${fileSize}`);
    } else if (fileType) {
      contextInfo.push(`📁 ${fileType}`);
    } else if (fileSize) {
      contextInfo.push(`📁 ${fileSize}`);
    }
    
    if (contextInfo.length > 0) {
      blocks.push({
        "type": "context",
        "elements": [
          {
            "type": "mrkdwn",
            "text": contextInfo.join(' | ')
          }
        ]
      });
    }
    
    // Create comprehensive fallback text
    const fallbackParts = [
      `New episode: ${episodeTitle}`,
      podcastName !== 'Unknown Podcast' ? `from ${podcastName}` : '',
      duration ? `(${duration})` : '',
      publishDate ? `published ${publishDate}` : ''
    ].filter(part => part.length > 0);
    
    const fallbackText = fallbackParts.join(' ');
    
    // Return complete payload for this episode
    return {
      "text": fallbackText,
      "blocks": blocks,
      "parameters": {
        // Original values for reference
        "original": {
          episodeData: podcastEpisode || {},
          ingestionSources: ingestionSources || {}
        },
        // Normalized values actually used
        "normalized": normalizedData
      },
      "metadata": {
        "generatedAt": new Date().toISOString(),
        "notificationType": "podcast_episode",
        "itemIndex": $itemIndex,
        "episodeTitle": episodeTitle,
        "podcastName": podcastName,
        "hasAudio": !!audioUrl,
        "hasEpisodeLink": !!episodeLink,
        "architecture": "data-transform + accessors"
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
console.log(`\n=== Slack Notification Processing Summary ===`);
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
    console.log(`\nSample successful notification:`);
    console.log(`  Episode: "${sample.metadata.episodeTitle}"`);
    console.log(`  Podcast: ${sample.metadata.podcastName}`);
    console.log(`  Has Audio: ${sample.metadata.hasAudio}`);
    console.log(`  Has Episode Link: ${sample.metadata.hasEpisodeLink}`);
  }
}

console.log(`=== End Processing Summary ===\n`);

// Return results (maintains n8n item pairing)
return result.results;