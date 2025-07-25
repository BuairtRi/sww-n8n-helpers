USE [RiN8N]
GO

/****** Object:  Table [dbo].[KnowledgeSources]    Script Date: 7/25/2025 4:53:35 AM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[KnowledgeSources](
	[KnowledgeSourceId] [uniqueidentifier] NOT NULL,
	[Name] [nvarchar](50) NOT NULL,
	[KnowledgeSourceTypeId] [int] NOT NULL,
	[Url] [nvarchar](2000) NULL,
	[Active] [bit] NOT NULL,
	[SourceId] [nvarchar](500) NULL,
	[DetectInterval] [int] NULL,
	[LastDetectDate] [datetimeoffset](7) NULL,
	[NextDetectDate] [datetimeoffset](7) NULL,
	[Detect] [bit] NOT NULL,
	[PipelineId] [uniqueidentifier] NULL,
 CONSTRAINT [PK_KnowledgeSources] PRIMARY KEY CLUSTERED 
(
	[KnowledgeSourceId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

ALTER TABLE [dbo].[KnowledgeSources] ADD  CONSTRAINT [DF_KnowledgeSources_KnowledgeSourceId]  DEFAULT (newid()) FOR [KnowledgeSourceId]
GO

ALTER TABLE [dbo].[KnowledgeSources] ADD  CONSTRAINT [DF_KnowledgeSources_Active]  DEFAULT ((1)) FOR [Active]
GO

ALTER TABLE [dbo].[KnowledgeSources] ADD  CONSTRAINT [DF_KnowledgeSources_Detect]  DEFAULT ((0)) FOR [Detect]
GO

ALTER TABLE [dbo].[KnowledgeSources]  WITH CHECK ADD  CONSTRAINT [FK_KnowledgeSources_KnowledgeSourceTypes] FOREIGN KEY([KnowledgeSourceTypeId])
REFERENCES [dbo].[KnowledgeSourceTypes] ([KnowledgeSourceTypeId])
GO

ALTER TABLE [dbo].[KnowledgeSources] CHECK CONSTRAINT [FK_KnowledgeSources_KnowledgeSourceTypes]
GO

