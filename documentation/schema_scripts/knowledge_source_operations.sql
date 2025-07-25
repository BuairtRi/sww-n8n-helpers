USE [RiN8N]
GO

/****** Object:  Table [dbo].[KnowledgeSourceOperations]    Script Date: 7/25/2025 4:54:01 AM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[KnowledgeSourceOperations](
	[KnowledgeSourceOperationId] [uniqueidentifier] NOT NULL,
	[KnowledgeSourceId] [uniqueidentifier] NOT NULL,
	[KnowledgeOperationId] [uniqueidentifier] NOT NULL,
	[Name] [nvarchar](50) NOT NULL,
	[Interval] [int] NULL,
	[LastExecuted] [datetimeoffset](7) NULL,
	[NextExecution] [datetimeoffset](7) NULL,
 CONSTRAINT [PK_KnowledgeSourceOperations] PRIMARY KEY CLUSTERED 
(
	[KnowledgeSourceOperationId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

ALTER TABLE [dbo].[KnowledgeSourceOperations] ADD  CONSTRAINT [DF_KnowledgeSourceOperations_KnowledgeSourceOperationId]  DEFAULT (newid()) FOR [KnowledgeSourceOperationId]
GO

ALTER TABLE [dbo].[KnowledgeSourceOperations]  WITH CHECK ADD  CONSTRAINT [FK_KnowledgeSourceOperations_KnowledgeOperations] FOREIGN KEY([KnowledgeOperationId])
REFERENCES [dbo].[KnowledgeOperations] ([KnowledgeOperationId])
GO

ALTER TABLE [dbo].[KnowledgeSourceOperations] CHECK CONSTRAINT [FK_KnowledgeSourceOperations_KnowledgeOperations]
GO

ALTER TABLE [dbo].[KnowledgeSourceOperations]  WITH CHECK ADD  CONSTRAINT [FK_KnowledgeSourceOperations_KnowledgeSources] FOREIGN KEY([KnowledgeSourceId])
REFERENCES [dbo].[KnowledgeSources] ([KnowledgeSourceId])
ON UPDATE CASCADE
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[KnowledgeSourceOperations] CHECK CONSTRAINT [FK_KnowledgeSourceOperations_KnowledgeSources]
GO

