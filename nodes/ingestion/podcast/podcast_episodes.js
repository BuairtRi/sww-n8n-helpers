// n8n Code Node: Podcast Feed Data Normalization
// Using lodash, cheerio, validator, sanitize-filename, pretty-bytes, parse-duration, and moment
// Placed directly after Check Podcast Feed node

const _ = require('lodash');
const cheerio = require('cheerio');
const validator = require('validator');
const sanitize = require('sanitize-filename');
const prettyBytes = require('pretty-bytes');
const parseDuration = require('parse-duration');
const moment = require('moment');

const feedItems = $input.all();
const outputItems = [];

console.log(`Processing ${feedItems.length} feed items`);

// Helper function to parse duration with fallback for HH:MM:SS format
function parseDurationToSeconds(duration) {
    if (!duration) return null;

    try {
        // Try parse-duration first (handles human-readable formats)
        const milliseconds = parseDuration(String(duration));
        if (milliseconds) {
            return Math.round(milliseconds / 1000);
        }
    } catch (error) {
        // Continue to fallback
    }

    // Fallback: Custom parser for HH:MM:SS, MM:SS, or seconds
    try {
        const durationStr = String(duration).trim();

        if (durationStr.includes(':')) {
            const parts = durationStr.split(':').map(Number);

            if (parts.length === 3) {
                // HH:MM:SS
                return parts[0] * 3600 + parts[1] * 60 + parts[2];
            } else if (parts.length === 2) {
                // MM:SS
                return parts[0] * 60 + parts[1];
            }
        }

        // Handle pure number (seconds)
        const numSeconds = parseInt(durationStr);
        if (!isNaN(numSeconds) && numSeconds > 0) {
            return numSeconds;
        }
    } catch (error) {
        // Continue
    }

    return null;
}

// Helper function to clean HTML using Cheerio
function cleanHtml(html) {
    if (!html) return null;

    const $ = cheerio.load(html);
    $('script, style, iframe, object, embed').remove();

    return $.text()
        .replace(/\s+/g, ' ')
        .trim();
}

// Helper function to format duration in friendly format
function formatFriendlyDuration(seconds) {
    if (!seconds || seconds <= 0) return null;

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts = [];
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);

    if (parts.length === 0) return null;
    return parts.join(' and ');
}

// Helper function to extract file extension from URL or MIME type
function extractFileExtension(audioUrl, mimeType) {
    // Try to extract from URL first
    if (audioUrl && validator.isURL(audioUrl)) {
        try {
            const urlPath = new URL(audioUrl).pathname;
            const urlExtension = _.last(urlPath.split('.'));
            if (urlExtension && /^[a-zA-Z0-9]{2,4}$/.test(urlExtension)) {
                return urlExtension.toLowerCase();
            }
        } catch (e) {
            // Continue to MIME type fallback
        }
    }

    // Fallback to MIME type mapping
    const mimeToExtension = {
        'audio/mpeg': 'mp3',
        'audio/mp3': 'mp3',
        'audio/mp4': 'm4a',
        'audio/m4a': 'm4a',
        'audio/aac': 'aac',
        'audio/wav': 'wav',
        'audio/wave': 'wav',
        'audio/x-wav': 'wav',
        'audio/flac': 'flac',
        'audio/ogg': 'ogg',
        'audio/opus': 'opus',
        'audio/webm': 'webm',
        'audio/wma': 'wma',
        'audio/x-ms-wma': 'wma',
        'audio/aiff': 'aiff',
        'audio/x-aiff': 'aiff',
        'audio/basic': 'au',
        'audio/3gpp': '3gp',
        'audio/amr': 'amr'
    };

    if (mimeType) {
        const extension = mimeToExtension[mimeType.toLowerCase()];
        if (extension) {
            return extension;
        }
    }

    // Default fallback
    return 'mp3';
}

// Helper function to generate safe filename
function generateFileName(title, fileExtension) {
    // Generate filename from title
    if (title) {
        const baseFilename = _.truncate(title, { length: 100, separator: ' ', omission: '' });
        return sanitize(`${baseFilename}.${fileExtension}`, { replacement: '_' });
    }

    return `episode.${fileExtension}`;
}

// Process each feed item
for (let itemIndex = 0; itemIndex < feedItems.length; itemIndex++) {
    const item = feedItems[itemIndex];
    const episode = item.json;

    try {
        // Extract audio URL and validate
        const audioUrl = _.get(episode, 'enclosure.url') || episode.link;
        const isValidAudioUrl = audioUrl && validator.isURL(String(audioUrl));

        const normalizedEpisode = {
            // Core episode information
            episodeGuid: episode.guid || episode.id || null,
            title: _.truncate(String(episode.title || ''), { length: 250, separator: ' ' }),
            publicationDate: episode.isoDate || episode.pubDate || null,
            audioUrl: isValidAudioUrl ? String(audioUrl) : null,

            // Content fields using cheerio for HTML cleaning
            description: _.truncate(
                cleanHtml(
                    String(_.get(episode, 'content') ||
                        _.get(episode, 'content:encoded') ||
                        _.get(episode, 'contentSnippet') ||
                        _.get(episode, 'itunes.summary') || '')
                ) || '',
                { length: 4000, separator: ' ' }
            ),

            summary: _.truncate(
                cleanHtml(
                    String(_.get(episode, 'contentSnippet') ||
                        _.get(episode, 'itunes.subtitle') ||
                        _.get(episode, 'itunes.summary') || '')
                ) || '',
                { length: 2000, separator: ' ' }
            ),

            // Author information with lodash fallback chain
            author: String(_.get(episode, 'itunes.author') ||
                _.get(episode, 'dc:creator') ||
                episode.author ||
                episode.creator ||
                'Unknown'),

            // Duration handling
            duration: parseDurationToSeconds(_.get(episode, 'itunes.duration')),
            durationFriendly: null, // Set after parsing

            // File information with validation and formatting
            audioFileSize: _.toNumber(_.get(episode, 'enclosure.length')) || null,
            audioFileSizeFriendly: null, // Set after parsing
            audioFileType: _.get(episode, 'enclosure.type') || 'audio/mpeg',
            fileExtension: null, // Set after processing
            fileName: null, // Set after processing

            // Episode metadata with URL validation
            episodeLink: (episode.link && validator.isURL(String(episode.link))) ? String(episode.link) : null,
            episodeImage: _.find([
                _.get(episode, 'itunes.image'),
                _.get(episode, 'itunes.image.href'),
                _.get(episode, 'image.url')
            ], url => url && validator.isURL(String(url))) || null,

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
                itemIndex: itemIndex,
                hasDescription: !_.isEmpty(cleanHtml(_.get(episode, 'content') || _.get(episode, 'content:encoded'))),
                hasDuration: !_.isNull(parseDurationToSeconds(_.get(episode, 'itunes.duration'))),
                hasValidAudioUrl: isValidAudioUrl,
                hasValidEpisodeLink: episode.link && validator.isURL(String(episode.link)),
                hasValidImage: !_.isNull(_.find([
                    _.get(episode, 'itunes.image'),
                    _.get(episode, 'itunes.image.href'),
                    _.get(episode, 'image.url')
                ], url => url && validator.isURL(String(url))))
            }
        };

        // Validate required fields
        if (_.isEmpty(normalizedEpisode.title) || !normalizedEpisode.audioUrl) {
            normalizedEpisode._error = {
                type: 'validation_error',
                message: 'Missing required fields',
                missingFields: {
                    title: _.isEmpty(normalizedEpisode.title),
                    audioUrl: !normalizedEpisode.audioUrl
                }
            };
        }

        // Process publication date using moment
        if (normalizedEpisode.publicationDate) {
            const momentDate = moment(normalizedEpisode.publicationDate);
            if (momentDate.isValid()) {
                normalizedEpisode.publicationDate = momentDate.toISOString();
                normalizedEpisode.publicationDateFriendly = momentDate.format('MMMM D, YYYY');
            } else {
                const now = moment();
                normalizedEpisode.publicationDate = now.toISOString();
                normalizedEpisode.publicationDateFriendly = now.format('MMMM D, YYYY');
            }
        } else {
            const now = moment();
            normalizedEpisode.publicationDate = now.toISOString();
            normalizedEpisode.publicationDateFriendly = now.format('MMMM D, YYYY');
        }

        // Set friendly duration
        if (normalizedEpisode.duration) {
            normalizedEpisode.durationFriendly = formatFriendlyDuration(normalizedEpisode.duration);
        }

        // Set friendly file size using pretty-bytes
        if (normalizedEpisode.audioFileSize) {
            normalizedEpisode.audioFileSizeFriendly = prettyBytes(normalizedEpisode.audioFileSize);
        }

        // Set file extension
        normalizedEpisode.fileExtension = extractFileExtension(
            normalizedEpisode.audioUrl,
            normalizedEpisode.audioFileType
        );

        // Generate safe filename using the extracted extension
        normalizedEpisode.fileName = generateFileName(
            normalizedEpisode.title,
            normalizedEpisode.fileExtension
        );

        outputItems.push({
            json: normalizedEpisode,
            pairedItem: itemIndex
        });

    } catch (error) {
        // Error handling - maintain pairing
        outputItems.push({
            json: {
                _error: {
                    type: 'processing_error',
                    message: error.message,
                    originalData: {
                        title: episode?.title,
                        guid: episode?.guid
                    }
                },
                episodeGuid: episode?.guid || null,
                title: episode?.title || 'Unknown',
                publicationDate: episode?.isoDate || episode?.pubDate || moment().toISOString()
            },
            pairedItem: itemIndex
        });
    }
}

console.log(`Successfully processed ${outputItems.length} items`);

// Log summary
const validItems = _.filter(outputItems, item => !item.json._error);
const errorItems = _.filter(outputItems, item => item.json._error);

console.log(`Summary: ${validItems.length} valid items, ${errorItems.length} errors`);

if (!_.isEmpty(validItems)) {
    const sample = validItems[0].json;
    console.log(`Sample: "${sample.title}" (${sample.durationFriendly || 'no duration'}) - ${sample.publicationDateFriendly}`);
}

return outputItems;