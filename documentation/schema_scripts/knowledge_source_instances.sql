USE [RiN8N]
GO

/****** Object:  Table [dbo].[KnowledgeSourceInstances]    Script Date: 7/25/2025 4:54:11 AM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[KnowledgeSourceInstances](
	[KnowledgeSourceInstanceId] [uniqueidentifier] NOT NULL,
	[KnowledgeSourceId] [uniqueidentifier] NOT NULL,
	[SourceUrl] [varchar](2000) NULL,
	[SourceId] [varchar](500) NULL,
	[Active] [bit] NOT NULL,
	[SourceSummary] [nvarchar](max) NULL,
	[SourceDescription] [nvarchar](max) NULL,
	[SourceDate] [datetimeoffset](7) NULL,
	[Name] [varchar](250) NULL,
	[Subtitle] [varchar](250) NULL,
	[Author] [nvarchar](500) NULL,
	[Duration] [int] NOT NULL,
	[Length] [int] NOT NULL,
	[FriendlyDuration] [varchar](50) NULL,
	[FriendlyLength] [varchar](50) NULL,
	[SourceFileName] [varchar](255) NULL,
	[SourceFileExtension] [varchar](10) NULL,
	[SourceMimeType] [varchar](100) NULL,
	[ObjectId] [uniqueidentifier] NULL,
	[StructuredId] [uniqueidentifier] NULL,
	[CreationDate] [datetimeoffset](7) NOT NULL,
	[SourceLink] [nvarchar](4000) NULL,
	[SourceImageUrl] [nvarchar](4000) NULL,
 CONSTRAINT [PK_KnowledgeSourceInstances] PRIMARY KEY CLUSTERED 
(
	[KnowledgeSourceInstanceId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

ALTER TABLE [dbo].[KnowledgeSourceInstances] ADD  CONSTRAINT [DF_KnowledgeSourceInstances_KnowledgeSourceInstanceId]  DEFAULT (newid()) FOR [KnowledgeSourceInstanceId]
GO

ALTER TABLE [dbo].[KnowledgeSourceInstances] ADD  CONSTRAINT [DF_KnowledgeSourceInstances_Active]  DEFAULT ((1)) FOR [Active]
GO

ALTER TABLE [dbo].[KnowledgeSourceInstances] ADD  CONSTRAINT [DF_KnowledgeSourceInstances_Duration]  DEFAULT ((0)) FOR [Duration]
GO

ALTER TABLE [dbo].[KnowledgeSourceInstances] ADD  CONSTRAINT [DF_KnowledgeSourceInstances_Length]  DEFAULT ((0)) FOR [Length]
GO

ALTER TABLE [dbo].[KnowledgeSourceInstances] ADD  CONSTRAINT [DF_KnowledgeSourceInstances_CreationDate]  DEFAULT (getutcdate()) FOR [CreationDate]
GO

ALTER TABLE [dbo].[KnowledgeSourceInstances]  WITH CHECK ADD  CONSTRAINT [FK_KnowledgeSourceInstances_KnowledgeSources] FOREIGN KEY([KnowledgeSourceId])
REFERENCES [dbo].[KnowledgeSources] ([KnowledgeSourceId])
GO

ALTER TABLE [dbo].[KnowledgeSourceInstances] CHECK CONSTRAINT [FK_KnowledgeSourceInstances_KnowledgeSources]
GO

