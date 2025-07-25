INSERT INTO KnowledgeSourceInstances
(KnowledgeSourceInstanceId, KnowledgeSourceId, Name, SourceDate, SourceUrl, SourceId, SourceDescription, SourceSummary, SourceLink, Duration, FriendlyDuration, Length, FriendlyLength, SourceFileExtension, SourceMimeType, SourceFileName,  SourceImageUrl)
OUTPUT INSERTED.KnowledgeSourceInstanceId
VALUES
(
  NEWID(), 
  TRY_CONVERT(uniqueidentifier, '{{ $('Ingestion Sources').item.json.knowledgeSourceId }}'), 
  '{{ $('Sanitize').item.json.titleSanitized }}', 
  '{{ $('Podcast Episodes').item.json.publicationDate }}', 
  '{{ $('Sanitize').item.json.audioUrlSanitized }}', 
  '{{ $('Sanitize').item.json.episodeGuidSanitized }}', 
  '{{ $('Sanitize').item.json.descriptionSanitized }}', 
  '{{ $('Sanitize').item.json.summarySanitized }}', 
  '{{ $('Sanitize').item.json.episodeLinkSanitized }}', 
  {{ $('Podcast Episodes').item.json.duration }}, 
  '{{ $('Sanitize').item.json.durationFriendlySanitized }}',
  {{ $('Podcast Episodes').item.json.audioFileSize }},
  '{{ $('Sanitize').item.json.audioFileSizeFriendlySanitized }}',
  '{{ $('Sanitize').item.json.fileExtensionSanitized }}',
  '{{ $('Sanitize').item.json.audioFileTypeSanitized }}',
  '{{ $('Sanitize').item.json.fileNameSanitized }}',
  '{{ $('Sanitize').item.json.episodeImageSanitized }}'
)