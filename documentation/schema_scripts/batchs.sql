USE [RiN8N]
GO

/****** Object:  Table [dbo].[Batches]    Script Date: 7/25/2025 4:55:54 AM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[Batches](
	[BatchId] [uniqueidentifier] NOT NULL,
	[ProviderBatchId] [nvarchar](50) NOT NULL,
	[Provider] [nvarchar](50) NULL,
	[CompletionWindow] [nvarchar](50) NULL,
	[CreatedAt] [datetimeoffset](7) NULL,
	[Endpoint] [nvarchar](50) NULL,
	[CompletedAt] [datetimeoffset](7) NULL,
	[ExpiresAt] [datetimeoffset](7) NULL,
	[ExpiredAt] [datetimeoffset](7) NULL,
	[OutputFileId] [nvarchar](50) NULL,
	[TotalRequests] [int] NULL,
	[CompletedRequests] [int] NULL,
	[FailedRequests] [int] NULL,
	[FailedAt] [datetimeoffset](7) NULL,
	[FinalizingAt] [datetimeoffset](7) NULL,
	[Status] [nvarchar](50) NULL,
	[Executing] [bit] NOT NULL,
	[ExecutionStart] [datetimeoffset](7) NULL,
	[ExecutionError] [nvarchar](4000) NULL,
	[IngestedOn] [datetimeoffset](7) NULL,
	[ErrorHandledOn] [datetimeoffset](7) NULL,
	[ErrorFileId] [nvarchar](50) NULL,
 CONSTRAINT [PK_Batches] PRIMARY KEY CLUSTERED 
(
	[BatchId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

ALTER TABLE [dbo].[Batches] ADD  CONSTRAINT [DF_Batches_BatchId]  DEFAULT (newid()) FOR [BatchId]
GO

ALTER TABLE [dbo].[Batches] ADD  CONSTRAINT [DF_Batches_Executing]  DEFAULT ((0)) FOR [Executing]
GO

