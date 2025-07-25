INSERT INTO KnowledgeSourceInstanceOperations
(KnowledgeSourceInstanceOperationId, KnowledgeSourceOperationId, KnowledgeSourceInstanceId)
SELECT NEWID(), kso.[KnowledgeSourceOperationId], ksi.KnowledgeSourceInstanceId
FROM KnowledgeSources ks
INNER JOIN KnowledgeSourceOperations kso ON kso.KnowledgeSourceId = ks.KnowledgeSourceId
INNER JOIN KnowledgeSourceInstances ksi ON ksi.KnowledgeSourceId = ks.KnowledgeSourceId
WHERE ksi.KnowledgeSourceInstanceId = '{{ $('Create Podcast Record').item.json.KnowledgeSourceInstanceId }}'