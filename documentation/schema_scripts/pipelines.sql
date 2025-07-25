USE [RiN8N]
GO

/****** Object:  Table [dbo].[Pipelines]    Script Date: 7/25/2025 4:56:41 AM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[Pipelines](
	[PipelineId] [uniqueidentifier] NOT NULL,
	[Name] [varchar](50) NULL,
	[KnowledgeSourceTypeId] [int] NOT NULL,
 CONSTRAINT [PK_Pipelines] PRIMARY KEY CLUSTERED 
(
	[PipelineId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

ALTER TABLE [dbo].[Pipelines] ADD  CONSTRAINT [DF_Pipelines_PipelineId]  DEFAULT (newid()) FOR [PipelineId]
GO

