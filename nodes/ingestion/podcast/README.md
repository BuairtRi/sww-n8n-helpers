# Podcast Ingestion Workflow

## Overview
This workflow handles the automated ingestion of podcast episodes from RSS feeds into the RiN8N knowledge management system. It retrieves podcast feeds, normalizes episode data, checks for duplicates, stores new episodes, and creates associated processing operations.

## Workflow Structure

### 1. Source Discovery
**Node:** Ingestion Sources (SQL Query)
- Retrieves active podcast knowledge sources from the database
- Filters for sources with `KnowledgeSourceTypeId` corresponding to podcast feeds
- Includes sources where `Detect = 1` and `NextDetectDate <= GETUTCDATE()`

### 2. Feed Retrieval  
**Node:** Check Podcast Feed (RSS Read)
- Fetches RSS/XML feed data from podcast URLs
- Parses podcast episode metadata from the feed
- Handles various podcast feed formats (RSS 2.0, iTunes extensions, etc.)

### 3. Data Normalization
**Node:** Code Node (`podcast_episodes.js`)
- **File:** `nodes/ingestion/podcast/podcast_episodes.js`
- **Purpose:** Comprehensive podcast episode data normalization
- **External Packages Used:**
  - `lodash` - Data manipulation and safe property access
  - `cheerio` - HTML parsing and cleaning for episode descriptions
  - `validator` - URL and data validation
  - `sanitize-filename` - Safe filename generation
  - `pretty-bytes` - Human-readable file size formatting
  - `parse-duration` - Duration parsing with fallback handling
  - `moment` - Date parsing and formatting

**Key Normalizations:**
- Episode title truncation (250 chars)
- HTML cleaning for descriptions (4000 chars) and summaries (2000 chars)
- Duration parsing (supports HH:MM:SS, MM:SS, and human-readable formats)
- Audio file metadata extraction (URL, size, type, extension)
- Safe filename generation
- Publication date normalization to ISO format
- Error handling with paired item maintenance

### 4. Age Filtering
**Node:** Filter Node
- Filters out episodes older than a configurable threshold
- Prevents processing of historical episodes during initial feed ingestion
- Maintains workflow efficiency by focusing on recent content

### 5. Duplicate Detection
**Node:** SQL Query (Existence Check)
- Queries `KnowledgeSourceInstances` table to check if episode already exists
- Uses `SourceId` (episode GUID) and `KnowledgeSourceId` for matching
- Prevents duplicate episode ingestion

### 6. Data Sanitization
**Node:** Sanitize (Code Node)
- Uses `tsqlstring` package for SQL injection prevention
- Sanitizes all text fields before database insertion
- Ensures safe SQL execution

### 7. Episode Storage
**Node:** Create Podcast Record (SQL Execute)
- **File:** `nodes/ingestion/podcast/create_podcast.sql`
- Inserts new `KnowledgeSourceInstance` record
- Returns the generated `KnowledgeSourceInstanceId` for downstream processing

**Stored Fields:**
- Core metadata (title, publication date, URLs, IDs)
- Content fields (description, summary, author)
- File properties (size, type, extension, filename)
- Duration and friendly formatting
- Image URLs

### 8. Operation Association
**Node:** Create KSIOs (SQL Execute)  
- **File:** `nodes/ingestion/podcast/create_ksios.sql`
- Creates `KnowledgeSourceInstanceOperation` records
- Links the new episode to all configured operations for its knowledge source
- Enables downstream processing (transcription, summarization, etc.)

### 9. Notification
**Node:** Slack Notification
- Sends notification about successful episode ingestion
- Includes episode details and processing status
- Enables monitoring of ingestion pipeline health

## File Structure

```
nodes/ingestion/podcast/
├── README.md                 # This documentation
├── podcast_episodes.js       # Main normalization code node
├── create_podcast.sql        # Episode insertion SQL
└── create_ksios.sql         # Operation association SQL
```

## Key Features

### Robust Data Processing
- Handles multiple podcast feed formats and iTunes extensions
- Comprehensive error handling with item pairing maintenance
- Fallback parsing for duration formats (HH:MM:SS, MM:SS, human-readable)
- HTML cleaning and text truncation for database storage

### Security & Data Integrity
- SQL injection prevention through `tsqlstring` sanitization
- URL validation before storage
- Safe filename generation for cross-platform compatibility
- Proper error isolation to prevent workflow failures

### Processing Metadata
- Tracks normalization timestamps and processing flags
- Maintains validation status for downstream operations
- Provides debugging information for troubleshooting

### Scalability Considerations
- Age filtering prevents historical data overload
- Duplicate detection prevents redundant processing
- Paired item maintenance ensures data consistency
- Efficient SQL operations with appropriate indexing

## Database Integration

### Tables Involved
- **KnowledgeSources** - Podcast feed configurations
- **KnowledgeSourceInstances** - Individual episode records  
- **KnowledgeSourceOperations** - Configured processing operations
- **KnowledgeSourceInstanceOperations** - Episode-operation associations

### Data Flow
1. Read active podcast sources from `KnowledgeSources`
2. Insert normalized episodes into `KnowledgeSourceInstances`
3. Create processing associations in `KnowledgeSourceInstanceOperations`
4. Trigger downstream operations (transcription, summarization, etc.)

## Error Handling

### Processing Errors
- Individual episode failures don't stop batch processing
- Error details stored with original episode metadata
- Maintains paired items for proper n8n workflow execution

### Validation Errors
- Missing required fields (title, audio URL) flagged as validation errors
- Invalid data handled gracefully with fallback values
- Comprehensive error logging for debugging

## Configuration

### Feed Detection
- Configurable detection intervals per knowledge source
- Automatic scheduling through `NextDetectDate` field
- Support for immediate and scheduled ingestion

### Content Filtering
- Age-based filtering to manage historical content
- Duplicate prevention through GUID-based checking
- Optional content validation and quality checks

## Monitoring & Observability

### Logging
- Processing summaries with valid/error item counts
- Sample episode information for verification
- Package loading confirmation for debugging

### Notifications
- Slack integration for ingestion status updates
- Episode metadata included in notifications
- Processing pipeline health monitoring

## Usage Notes

### Dependencies
- Requires external npm packages to be installed in n8n container
- Task runners must be disabled for external package access
- SQL Server/T-SQL compatibility required for database operations

### Performance
- Designed for batch processing of multiple episodes
- Efficient memory usage through streaming operations
- Optimized SQL queries with proper indexing

### Maintenance
- Regular monitoring of feed availability and format changes
- Periodic cleanup of old episodes based on retention policies
- Error log review for improving normalization logic

---

*This workflow implements a production-ready podcast ingestion pipeline that handles real-world podcast feed variations while maintaining data integrity and processing efficiency.*