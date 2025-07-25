# RiN8N Database Schema

## Core Tables

### Topics
Primary entity for organizing content and workflows.
```sql
Topics (
    TopicId UNIQUEIDENTIFIER PRIMARY KEY,
    Topic NVARCHAR(250),
    ParentTopicId UNIQUEIDENTIFIER FK → Topics.TopicId,
    TopicType NVARCHAR(50),
    Active BIT DEFAULT 1,
    
    -- Podcast Configuration
    PodcastDuration INT DEFAULT 20,
    CastopodPodcastId NVARCHAR(100),
    CastopodFeedUrl NVARCHAR(500),
    PodcastPrompt NVARCHAR(MAX),
    PodcasterPersonaId UNIQUEIDENTIFIER,
    
    -- Storage & Communication
    GoogleDriveFolderId NVARCHAR(255),
    EmailRecipients NVARCHAR(MAX),
    SlackChannelId NVARCHAR(100),
    
    -- Digest Scheduling
    DigestPrompt NVARCHAR(MAX),
    DigestScheduleCron NVARCHAR(100),
    
    -- Research Brief Configuration
    RunResearchBrief BIT DEFAULT 0,
    ResearchBriefPrompt NVARCHAR(MAX),
    ResearchBriefInternal INT,
    LastResearchBrief DATETIMEOFFSET,
    NextResearchBrief DATETIMEOFFSET
)
```

### Knowledge Sources
Configuration for different types of content sources.
```sql
KnowledgeSourceTypes (
    KnowledgeSourceTypeId INT IDENTITY PRIMARY KEY,
    Name NVARCHAR(50)
)

KnowledgeSources (
    KnowledgeSourceId UNIQUEIDENTIFIER PRIMARY KEY,
    Name NVARCHAR(50),
    KnowledgeSourceTypeId INT FK → KnowledgeSourceTypes,
    Url NVARCHAR(2000),
    SourceId NVARCHAR(500),
    Active BIT DEFAULT 1,
    PipelineId UNIQUEIDENTIFIER,
    
    -- Detection Scheduling
    Detect BIT DEFAULT 0,
    DetectInterval INT,
    LastDetectDate DATETIMEOFFSET,
    NextDetectDate DATETIMEOFFSET
)
```

### Knowledge Source Instances
Individual pieces of content from sources.
```sql
KnowledgeSourceInstances (
    KnowledgeSourceInstanceId UNIQUEIDENTIFIER PRIMARY KEY,
    KnowledgeSourceId UNIQUEIDENTIFIER FK → KnowledgeSources,
    
    -- Source Metadata
    SourceUrl VARCHAR(2000),
    SourceId VARCHAR(500),
    SourceLink NVARCHAR(4000),
    SourceImageUrl NVARCHAR(4000),
    
    -- Content Properties
    Name VARCHAR(250),
    Subtitle VARCHAR(250),
    Author NVARCHAR(500),
    SourceDate DATETIMEOFFSET,
    SourceSummary NVARCHAR(MAX),
    SourceDescription NVARCHAR(MAX),
    
    -- File Properties
    SourceFileName VARCHAR(255),
    SourceFileExtension VARCHAR(10),
    SourceMimeType VARCHAR(100),
    
    -- Metrics
    Duration INT DEFAULT 0,
    Length INT DEFAULT 0,
    FriendlyDuration VARCHAR(50),
    FriendlyLength VARCHAR(50),
    
    -- System
    Active BIT DEFAULT 1,
    CreationDate DATETIMEOFFSET DEFAULT GETUTCDATE(),
    ObjectId UNIQUEIDENTIFIER,
    StructuredId UNIQUEIDENTIFIER
)
```

## Processing & Operations

### Knowledge Operations
Reusable LLM processing operations.
```sql
KnowledgeOperationTypes (
    KnowledgeOperationTypeId INT IDENTITY PRIMARY KEY,
    Name NVARCHAR(50)
)

KnowledgeOperations (
    KnowledgeOperationId UNIQUEIDENTIFIER PRIMARY KEY,
    KnowledgeOperationTypeId INT FK → KnowledgeOperationTypes,
    Name VARCHAR(50),
    PipelineId UNIQUEIDENTIFIER,
    RetentionInterval INT DEFAULT 129600,
    DependentOperationIds VARCHAR(1000),
    
    -- Primary LLM Configuration
    Prompt NVARCHAR(MAX),
    Model VARCHAR(50),
    ModelProvider VARCHAR(50),
    PromptTemperature DECIMAL(18,1) DEFAULT 0.7,
    MaximumTokens INT,
    EnableThinking BIT DEFAULT 0,
    
    -- Multi-Prompt Support (Prompts 2-5)
    Prompt2 NVARCHAR(MAX),
    Prompt2Model VARCHAR(50),
    Prompt2ModelProvider VARCHAR(50),
    Prompt2Temperature DECIMAL(18,1),
    Prompt2MaximumTokens INT,
    
    Prompt3 NVARCHAR(MAX),
    Prompt3Model VARCHAR(50),
    Prompt3ModelProvider VARCHAR(50),
    Prompt3Temperature DECIMAL(18,1),
    Prompt3MaximumTokens INT,
    
    Prompt4 NVARCHAR(MAX),
    Prompt4Model VARCHAR(50),
    Prompt4ModelProvider NCHAR(10),
    Prompt4Temperature DECIMAL(18,1),
    Prompt4MaximumTokens INT,
    
    Prompt5 NVARCHAR(MAX),
    Prompt5Model VARCHAR(50),
    Prompt5ModelProvider VARCHAR(50),
    Prompt5Temperature DECIMAL(18,1),
    Prompt5MaximumTokens INT,
    
    -- Processing Options
    TargetLength INT,
    Batch BIT,
    ParseSchema VARCHAR(4000)
)
```

### Source Operations Mapping
Links sources to operations with scheduling.
```sql
KnowledgeSourceOperations (
    KnowledgeSourceOperationId UNIQUEIDENTIFIER PRIMARY KEY,
    KnowledgeSourceId UNIQUEIDENTIFIER FK → KnowledgeSources,
    KnowledgeOperationId UNIQUEIDENTIFIER FK → KnowledgeOperations,
    Name NVARCHAR(50),
    
    -- Scheduling
    Interval INT,
    LastExecuted DATETIMEOFFSET,
    NextExecution DATETIMEOFFSET
)
```

## Text Storage & Relationships

### Texts
Stores all generated text content.
```sql
Texts (
    TextId UNIQUEIDENTIFIER PRIMARY KEY,
    Text NVARCHAR(MAX),
    Type NVARCHAR(50),
    Created DATETIMEOFFSET DEFAULT GETUTCDATE(),
    TopicsAnalyzed BIT DEFAULT 0,
    RetainUntil DATETIMEOFFSET,
    
    -- Generic Relationship
    RelatedObjectType NVARCHAR(100),
    RelatedEntityId NVARCHAR(50)
)
```

### Topic-Text Relationships
Links texts to topics.
```sql
TextTopics (
    TextTopicId UNIQUEIDENTIFIER PRIMARY KEY,
    TextId UNIQUEIDENTIFIER FK → Texts,
    TopicId UNIQUEIDENTIFIER FK → Topics
)
```

## Execution Tracking

### Batch Processing
Tracks batch operations for LLM providers.
```sql
Batches (
    BatchId UNIQUEIDENTIFIER PRIMARY KEY,
    ProviderBatchId NVARCHAR(50),
    Provider NVARCHAR(50),
    Endpoint NVARCHAR(50),
    
    -- Batch Metadata
    CompletionWindow NVARCHAR(50),
    TotalRequests INT,
    CompletedRequests INT,
    FailedRequests INT,
    
    -- Status & Timing
    Status NVARCHAR(50),
    CreatedAt DATETIMEOFFSET,
    CompletedAt DATETIMEOFFSET,
    ExpiresAt DATETIMEOFFSET,
    ExpiredAt DATETIMEOFFSET,
    FailedAt DATETIMEOFFSET,
    FinalizingAt DATETIMEOFFSET,
    
    -- Execution State
    Executing BIT DEFAULT 0,
    ExecutionStart DATETIMEOFFSET,
    ExecutionError NVARCHAR(4000),
    
    -- File References
    OutputFileId NVARCHAR(50),
    ErrorFileId NVARCHAR(50),
    
    -- Processing
    IngestedOn DATETIMEOFFSET,
    ErrorHandledOn DATETIMEOFFSET
)
```

### Instance Operations
Tracks individual processing operations on source instances.
```sql
KnowledgeSourceInstanceOperations (
    KnowledgeSourceInstanceOperationId UNIQUEIDENTIFIER PRIMARY KEY,
    KnowledgeSourceOperationId UNIQUEIDENTIFIER FK → KnowledgeSourceOperations,
    KnowledgeSourceInstanceId UNIQUEIDENTIFIER FK → KnowledgeSourceInstances,
    TextId UNIQUEIDENTIFIER FK → Texts,
    BatchId UNIQUEIDENTIFIER FK → Batches,
    
    -- Execution State
    Executing BIT DEFAULT 0,
    ExecutionDate DATETIMEOFFSET,
    ExecutionStart DATETIMEOFFSET,
    ErrorMessage NVARCHAR(2000)
)
```

### Error Logging
Tracks workflow and processing errors.
```sql
ErrorLogs (
    ErrorLogId UNIQUEIDENTIFIER PRIMARY KEY,
    WorkflowName NVARCHAR(100),
    NodeName NVARCHAR(100),
    ErrorMessage NVARCHAR(MAX),
    ErrorDetails NVARCHAR(MAX),
    RelatedEntityId NVARCHAR(50),
    RelatedEntityType NVARCHAR(50),
    OccurredDate DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    IsResolved BIT DEFAULT 0,
    WorkflowId INT,
    StackTrace NVARCHAR(MAX),
    Mode NVARCHAR(50),
    ExecutionId NVARCHAR(150)
)
```

### Processing Pipelines
Defines reusable processing workflows for different source types.
```sql
Pipelines (
    PipelineId UNIQUEIDENTIFIER PRIMARY KEY,
    Name VARCHAR(50),
    KnowledgeSourceTypeId INT FK → KnowledgeSourceTypes
)
```

## Key Relationships

- **Topics** can have hierarchical relationships (parent/child)
- **Knowledge Sources** define content streams (RSS feeds, etc.)
- **Knowledge Source Instances** are individual items from sources
- **Knowledge Operations** are reusable LLM processing steps
- **Texts** store all generated content with flexible relationships
- **Batches** track bulk LLM operations for cost efficiency
- **Text-Topic relationships** enable content categorization and discovery
- **Pipelines** define processing workflows for different source types
- **Error Logs** track system failures and debugging information

## Knowledge Source Types

1. **RSS Feeds** - News, blogs, content feeds
2. **Podcast Feeds** - Audio content requiring transcription
3. **Email** - Gmail messages with specific labels
4. **Meeting Transcripts** - Video/audio transcripts from meetings
5. **Research Briefs** - Topic-specific research reports

## Operation Types

1. **Ingest** - Copy data from source to system
2. **Transcription** - Convert audio/video to text (OtterAI integration)
3. **Summarization** - Create summaries using LLMs
4. **Research** - Generate research content (Perplexity integration)
5. **Quality Check** - Compare outputs for quality validation
6. **Verification** - Independent research to verify claims
7. **Digest** - Aggregate summaries into meta-summaries
8. **Podcast Script** - Generate podcast scripts from content
9. **Topic Analysis** - Categorize content into topics

## Common Workflow Patterns

### 1. Podcast Processing Pipeline
```
RSS/Podcast Feed → Ingest → Transcription → Summarization → Topic Analysis → Digest
```

### 2. Email Monitoring Pipeline
```
Gmail Label → Ingest → Summarization → Quality Check → Topic Analysis → Digest
```

### 3. Research Brief Pipeline
```
Topic → Research → Verification → Quality Check → Podcast Script → Audio Generation
```

### 4. Weekly Digest Pipeline
```
All Topic Texts → Digest → Quality Check → Email/Slack Notification
```

## Key SQL Queries for n8n Workflows

### Get Sources Ready for Detection
```sql
SELECT * FROM KnowledgeSources 
WHERE Active = 1 AND Detect = 1 
AND NextDetectDate <= GETUTCDATE()
```

### Get Pending Operations
```sql
SELECT kso.*, ks.Name as SourceName, ko.Name as OperationName
FROM KnowledgeSourceOperations kso
JOIN KnowledgeSources ks ON kso.KnowledgeSourceId = ks.KnowledgeSourceId
JOIN KnowledgeOperations ko ON kso.KnowledgeOperationId = ko.KnowledgeOperationId
WHERE kso.NextExecution <= GETUTCDATE()
```

### Find Content for Topic Digest
```sql
SELECT t.Text, t.Type, ksi.Name, ksi.Author, ksi.SourceDate
FROM TextTopics tt
JOIN Texts t ON tt.TextId = t.TextId
JOIN KnowledgeSourceInstanceOperations ksio ON t.TextId = ksio.TextId
JOIN KnowledgeSourceInstances ksi ON ksio.KnowledgeSourceInstanceId = ksi.KnowledgeSourceInstanceId
WHERE tt.TopicId = @TopicId 
AND t.Created >= @StartDate
ORDER BY ksi.SourceDate DESC
```