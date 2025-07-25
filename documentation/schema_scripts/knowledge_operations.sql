USE [RiN8N]
GO

/****** Object:  Table [dbo].[KnowledgeOperations]    Script Date: 7/25/2025 4:55:05 AM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[KnowledgeOperations](
	[KnowledgeOperationId] [uniqueidentifier] NOT NULL,
	[KnowledgeOperationTypeId] [int] NOT NULL,
	[Name] [varchar](50) NOT NULL,
	[PipelineId] [uniqueidentifier] NULL,
	[RetentionInterval] [int] NULL,
	[TargetLength] [int] NULL,
	[Batch] [bit] NULL,
	[DependentOperationIds] [varchar](1000) NULL,
	[ParseSchema] [varchar](4000) NULL,
	[Prompt] [nvarchar](max) NULL,
	[Model] [varchar](50) NULL,
	[ModelProvider] [varchar](50) NULL,
	[PromptTemperature] [decimal](18, 1) NULL,
	[MaximumTokens] [int] NULL,
	[EnableThinking] [bit] NULL,
	[Prompt2] [nvarchar](max) NULL,
	[Prompt2Model] [varchar](50) NULL,
	[Prompt2ModelProvider] [varchar](50) NULL,
	[Prompt2Temperature] [decimal](18, 1) NULL,
	[Prompt2MaximumTokens] [int] NULL,
	[Prompt3] [nvarchar](max) NULL,
	[Prompt3Model] [varchar](50) NULL,
	[Prompt3ModelProvider] [varchar](50) NULL,
	[Prompt3Temperature] [decimal](18, 1) NULL,
	[Prompt3MaximumTokens] [int] NULL,
	[Prompt4] [nvarchar](max) NULL,
	[Prompt4Model] [varchar](50) NULL,
	[Prompt4ModelProvider] [nchar](10) NULL,
	[Prompt4Temperature] [decimal](18, 1) NULL,
	[Prompt4MaximumTokens] [int] NULL,
	[Prompt5] [nvarchar](max) NULL,
	[Prompt5Model] [varchar](50) NULL,
	[Prompt5ModelProvider] [varchar](50) NULL,
	[Prompt5Temperature] [decimal](18, 1) NULL,
	[Prompt5MaximumTokens] [int] NULL,
 CONSTRAINT [PK_KnowledgeOperations] PRIMARY KEY CLUSTERED 
(
	[KnowledgeOperationId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

ALTER TABLE [dbo].[KnowledgeOperations] ADD  CONSTRAINT [DF_KnowledgeOperations_KnowledgeOperationId]  DEFAULT (newid()) FOR [KnowledgeOperationId]
GO

ALTER TABLE [dbo].[KnowledgeOperations] ADD  CONSTRAINT [DF_KnowledgeOperations_RetentionInterval]  DEFAULT ((129600)) FOR [RetentionInterval]
GO

ALTER TABLE [dbo].[KnowledgeOperations] ADD  CONSTRAINT [DF_KnowledgeOperations_PromptTemperature]  DEFAULT ((0.7)) FOR [PromptTemperature]
GO

ALTER TABLE [dbo].[KnowledgeOperations] ADD  CONSTRAINT [DF_KnowledgeOperations_EnableThinking]  DEFAULT ((0)) FOR [EnableThinking]
GO

ALTER TABLE [dbo].[KnowledgeOperations]  WITH CHECK ADD  CONSTRAINT [FK_KnowledgeOperations_KnowledgeOperationTypes] FOREIGN KEY([KnowledgeOperationTypeId])
REFERENCES [dbo].[KnowledgeOperationTypes] ([KnowledgeOperationTypeId])
GO

ALTER TABLE [dbo].[KnowledgeOperations] CHECK CONSTRAINT [FK_KnowledgeOperations_KnowledgeOperationTypes]
GO

