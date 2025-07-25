USE [RiN8N]
GO

/****** Object:  Table [dbo].[KnowledgeSourceInstanceOperations]    Script Date: 7/25/2025 4:54:29 AM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[KnowledgeSourceInstanceOperations](
	[KnowledgeSourceInstanceOperationId] [uniqueidentifier] NOT NULL,
	[KnowledgeSourceOperationId] [uniqueidentifier] NOT NULL,
	[Executing] [bit] NOT NULL,
	[TextId] [uniqueidentifier] NULL,
	[ExecutionDate] [datetimeoffset](7) NULL,
	[ErrorMessage] [nvarchar](2000) NULL,
	[KnowledgeSourceInstanceId] [uniqueidentifier] NOT NULL,
	[BatchId] [uniqueidentifier] NULL,
	[ExecutionStart] [datetimeoffset](7) NULL,
 CONSTRAINT [PK_KnowledgeSourceInstanceOperations] PRIMARY KEY CLUSTERED 
(
	[KnowledgeSourceInstanceOperationId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

ALTER TABLE [dbo].[KnowledgeSourceInstanceOperations] ADD  CONSTRAINT [DF_KnowledgeSourceInstanceOperations_Executing]  DEFAULT ((0)) FOR [Executing]
GO

ALTER TABLE [dbo].[KnowledgeSourceInstanceOperations]  WITH CHECK ADD  CONSTRAINT [FK_KnowledgeSourceInstanceOperations_Batches] FOREIGN KEY([BatchId])
REFERENCES [dbo].[Batches] ([BatchId])
GO

ALTER TABLE [dbo].[KnowledgeSourceInstanceOperations] CHECK CONSTRAINT [FK_KnowledgeSourceInstanceOperations_Batches]
GO

ALTER TABLE [dbo].[KnowledgeSourceInstanceOperations]  WITH CHECK ADD  CONSTRAINT [FK_KnowledgeSourceInstanceOperations_KnowledgeSourceInstances] FOREIGN KEY([KnowledgeSourceInstanceId])
REFERENCES [dbo].[KnowledgeSourceInstances] ([KnowledgeSourceInstanceId])
ON UPDATE CASCADE
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[KnowledgeSourceInstanceOperations] CHECK CONSTRAINT [FK_KnowledgeSourceInstanceOperations_KnowledgeSourceInstances]
GO

ALTER TABLE [dbo].[KnowledgeSourceInstanceOperations]  WITH CHECK ADD  CONSTRAINT [FK_KnowledgeSourceInstanceOperations_KnowledgeSourceOperations] FOREIGN KEY([KnowledgeSourceOperationId])
REFERENCES [dbo].[KnowledgeSourceOperations] ([KnowledgeSourceOperationId])
GO

ALTER TABLE [dbo].[KnowledgeSourceInstanceOperations] CHECK CONSTRAINT [FK_KnowledgeSourceInstanceOperations_KnowledgeSourceOperations]
GO

ALTER TABLE [dbo].[KnowledgeSourceInstanceOperations]  WITH CHECK ADD  CONSTRAINT [FK_KnowledgeSourceInstanceOperations_Texts] FOREIGN KEY([TextId])
REFERENCES [dbo].[Texts] ([TextId])
GO

ALTER TABLE [dbo].[KnowledgeSourceInstanceOperations] CHECK CONSTRAINT [FK_KnowledgeSourceInstanceOperations_Texts]
GO

