# n8n Nodes Reference Guide

A comprehensive reference of available n8n nodes for AI agents designing and building workflows.

## Table of Contents
- [Core Trigger Nodes](#core-trigger-nodes)
- [Core Action Nodes](#core-action-nodes)
- [Communication & Messaging](#communication--messaging)
- [Data & Database](#data--database)
- [AI & Machine Learning](#ai--machine-learning)
- [File Management](#file-management)
- [Data Transformation](#data-transformation)
- [HTTP & API](#http--api)
- [Popular Service Integrations](#popular-service-integrations)
- [Community Nodes (Currently Used)](#community-nodes-currently-used)

---

## Core Trigger Nodes

**Purpose**: Start workflows based on events, schedules, or external triggers.

| Node | Function |
|------|----------|
| **Manual Trigger** | Manually start workflows for testing and one-off executions |
| **Scheduler Trigger** | Execute workflows on time-based schedules (cron, intervals) |
| **Webhook** | Receive HTTP requests to trigger workflows |
| **Email Trigger (IMAP)** | Trigger on incoming emails |
| **Form Trigger** | Create web forms that trigger workflows when submitted |
| **Chat Trigger** | Start workflows from chat interactions |

---

## Core Action Nodes

**Purpose**: Perform basic operations and logic within workflows.

| Node | Function |
|------|----------|
| **Set** | Set variables and modify data structure |
| **Code** | Execute custom JavaScript or Python code |
| **IF** | Conditional branching based on data evaluation |
| **Switch** | Route data to different paths based on conditions |
| **Merge** | Combine data from multiple workflow branches |
| **Wait** | Pause workflow execution for specified time or conditions |
| **Stop and Error** | Halt workflow execution with optional error messages |
| **Sticky Note** | Add documentation and comments to workflows |

---

## Communication & Messaging

**Purpose**: Send notifications, messages, and communications.

| Node | Function |
|------|----------|
| **Send Email** | Send emails via SMTP |
| **Gmail** | Send and manage Gmail messages |
| **Slack** | Send messages, create channels, manage Slack workspace |
| **Discord** | Send messages to Discord channels |
| **Telegram** | Send messages via Telegram bot |
| **Microsoft Teams** | Send messages and manage Teams communications |
| **WhatsApp** | Send WhatsApp messages (via Business API) |
| **SMS** | Send SMS messages via various providers |
| **Pushover** | Send push notifications |
| **Matrix** | Send messages to Matrix chat rooms |

---

## Data & Database

**Purpose**: Store, retrieve, and manipulate data in various databases.

| Node | Function |
|------|----------|
| **MySQL** | Execute queries against MySQL databases |
| **PostgreSQL** | Interact with PostgreSQL databases |
| **MongoDB** | Perform operations on MongoDB collections |
| **Redis** | Cache data and perform Redis operations |
| **SQLite** | Work with SQLite databases |
| **Microsoft SQL Server** | Execute SQL Server queries |
| **InfluxDB** | Store and query time-series data |
| **CouchDB** | Document database operations |
| **GraphQL** | Execute GraphQL queries and mutations |
| **Supabase** | Interact with Supabase backend services |

---

## AI & Machine Learning

**Purpose**: Integrate AI services and machine learning capabilities.

| Node | Function |
|------|----------|
| **OpenAI** | Generate text, images, and embeddings using OpenAI models |
| **Anthropic** | Use Claude AI models for text generation and analysis |
| **Azure OpenAI** | Access OpenAI models through Azure |
| **Google Gemini** | Utilize Google's Gemini AI models |
| **Hugging Face** | Access models from Hugging Face Hub |
| **Cohere** | Text generation and classification with Cohere |
| **Mistral AI** | Use Mistral's language models |
| **AI Agent** | Create conversational AI agents |
| **Embeddings** | Generate vector embeddings for text |
| **Text Classifier** | Classify text into categories |
| **AWS Bedrock** | Access various AI models through AWS |

---

## File Management

**Purpose**: Handle file operations, storage, and processing.

| Node | Function |
|------|----------|
| **Read Binary File** | Read binary files from filesystem |
| **Write Binary File** | Save binary data to files |
| **CSV** | Read and write CSV files |
| **XML** | Parse and generate XML data |
| **HTML Extract** | Extract data from HTML content |
| **PDF** | Extract text and data from PDF files |
| **Compress** | Create ZIP archives |
| **Google Drive** | Upload, download, and manage Google Drive files |
| **Dropbox** | File operations with Dropbox |
| **AWS S3** | Store and retrieve files from Amazon S3 |
| **FTP** | File transfer via FTP/SFTP |
| **Local File Trigger** | Watch for file system changes |

---

## Data Transformation

**Purpose**: Process, transform, and manipulate data.

| Node | Function |
|------|----------|
| **Item Lists** | Split and process arrays of items |
| **Aggregate** | Summarize and group data |
| **Date & Time** | Format and manipulate dates and times |
| **Edit Fields** | Add, remove, and modify data fields |
| **Sort** | Sort data by specified criteria |
| **Limit** | Restrict number of items processed |
| **Remove Duplicates** | Filter out duplicate items |
| **Crypto** | Hash, encrypt, and decrypt data |
| **Compare Datasets** | Find differences between data sets |
| **Execute Command** | Run shell commands |

---

## HTTP & API

**Purpose**: Make HTTP requests and integrate with REST APIs.

| Node | Function |
|------|----------|
| **HTTP Request** | Make HTTP calls to any API endpoint |
| **Webhook** | Receive HTTP requests |
| **JSON** | Parse and manipulate JSON data |
| **RSS Read** | Read and parse RSS feeds |
| **GraphQL** | Execute GraphQL queries |
| **MQTT** | Publish and subscribe to MQTT topics |
| **SSE Trigger** | Receive Server-Sent Events |

---

## Popular Service Integrations

**Purpose**: Connect with popular SaaS platforms and services.

| Node | Function |
|------|----------|
| **Google Sheets** | Read, write, and manage spreadsheets |
| **Airtable** | Manage Airtable bases and records |
| **Notion** | Create and update Notion pages and databases |
| **Trello** | Manage Trello boards, lists, and cards |
| **Asana** | Project management and task tracking |
| **Jira** | Issue tracking and project management |
| **GitHub** | Repository management and automation |
| **GitLab** | GitLab repository operations |
| **Salesforce** | CRM data management |
| **HubSpot** | Marketing and sales automation |
| **Shopify** | E-commerce store management |
| **WooCommerce** | WordPress e-commerce integration |
| **Stripe** | Payment processing and management |
| **PayPal** | Payment operations |
| **Calendly** | Scheduling and calendar management |
| **Zoom** | Video conferencing automation |
| **Twitter** | Social media automation |
| **Facebook** | Social media management |
| **LinkedIn** | Professional networking automation |
| **YouTube** | Video platform integration |

---

## Community Nodes (Currently Used)

**⭐ Special Focus**: These community nodes are currently integrated in your n8n environment.

### 🎤 ElevenLabs
**Package**: `n8n-nodes-elevenlabs`  
**Purpose**: Text-to-speech conversion using ElevenLabs AI voices  
**Key Features**:
- Convert text to high-quality speech
- Multiple voice options and customization
- Support for different languages and accents
- Voice cloning capabilities
- Real-time streaming options

**Common Use Cases**: Creating audio content, voiceovers, accessibility features, podcast automation

---

### 🕷️ ScrapeNinja
**Package**: `n8n-nodes-scrapeninja`  
**Purpose**: Web scraping and data extraction  
**Key Features**:
- Extract data from websites and web pages
- Handle JavaScript-rendered content
- Bypass anti-bot measures
- Structured data extraction
- Bulk URL processing

**Common Use Cases**: Competitive intelligence, price monitoring, content aggregation, lead generation

---

### ✅ Todoist
**Package**: `n8n-nodes-todoist`  
**Purpose**: Task management and productivity automation  
**Key Features**:
- Create, update, and manage tasks
- Project and label management
- Due date and reminder handling
- Task completion tracking
- Collaboration features

**Common Use Cases**: Project automation, task scheduling, productivity workflows, team coordination

---

### 🔍 Tavily
**Package**: `n8n-nodes-tavily`  
**Purpose**: AI-powered search and research  
**Key Features**:
- Advanced web search capabilities
- AI-enhanced result filtering
- Real-time information retrieval
- Structured search results
- Context-aware searching

**Common Use Cases**: Research automation, competitive analysis, content discovery, fact-checking

---

### 🧠 Qdrant
**Package**: `n8n-nodes-qdrant`  
**Purpose**: Vector database operations for AI applications  
**Key Features**:
- Store and search vector embeddings
- Similarity search capabilities
- Vector database management
- Integration with AI/ML workflows
- Scalable vector operations

**Common Use Cases**: Semantic search, recommendation systems, AI-powered matching, knowledge bases

---

## Node Selection Guidelines for AI Agents

When designing workflows, consider:

1. **Start with Triggers**: Choose appropriate trigger nodes based on how the workflow should be initiated
2. **Data Flow**: Use transformation nodes to shape data between services
3. **Error Handling**: Implement conditional logic and error handling with IF and Stop nodes
4. **Testing**: Use Manual Trigger and Sticky Notes for development and documentation
5. **Community Nodes**: Leverage specialized community nodes (like those listed above) for specific service integrations
6. **Performance**: Consider using Wait nodes for rate limiting and Limit nodes for data volume control

---

*This reference guide covers the major categories and most commonly used nodes in n8n. The ecosystem is continuously growing with new integrations and community contributions.* 