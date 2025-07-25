SELECT CASE 
  WHEN EXISTS (
    SELECT KnowledgeSourceInstanceId 
    FROM KnowledgeSourceInstances 
    WHERE KnowledgeSourceId = '{{ $('Ingestion Sources').item.json.knowledgeSourceId }}' 
      AND SourceId = '{{ $('Podcast Episodes').item.json.episodeGuid }}'
  )
  THEN 1
  WHEN EXISTS (
    SELECT KnowledgeSourceInstanceId 
    FROM KnowledgeSourceInstances 
    WHERE Name = '{{ $('Sanitize').item.json.titleSanitized }}' 
      AND SourceDate = '{{ $('Podcast Episodes').item.json.publicationDate}}'
      AND KnowledgeSourceId = '{{ $('Ingestion Sources').item.json.knowledgeSourceId }}' 
  )
  THEN 1
  ELSE 0
END as episode_exists