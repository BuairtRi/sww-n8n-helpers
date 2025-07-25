USE [RiN8N]
GO

/****** Object:  Table [dbo].[ErrorLogs]    Script Date: 7/25/2025 4:56:24 AM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[ErrorLogs](
	[ErrorLogId] [uniqueidentifier] NOT NULL,
	[WorkflowName] [nvarchar](100) NOT NULL,
	[NodeName] [nvarchar](100) NULL,
	[ErrorMessage] [nvarchar](max) NOT NULL,
	[ErrorDetails] [nvarchar](max) NULL,
	[RelatedEntityId] [nvarchar](50) NULL,
	[RelatedEntityType] [nvarchar](50) NULL,
	[OccurredDate] [datetimeoffset](7) NOT NULL,
	[IsResolved] [bit] NOT NULL,
	[WorkflowId] [int] NULL,
	[StackTrace] [nvarchar](max) NULL,
	[Mode] [nvarchar](50) NULL,
	[ExecutionId] [nvarchar](150) NULL,
 CONSTRAINT [PK_ErrorLogs] PRIMARY KEY CLUSTERED 
(
	[ErrorLogId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

ALTER TABLE [dbo].[ErrorLogs] ADD  CONSTRAINT [DF__ErrorLogs__Error__30C33EC3]  DEFAULT (newid()) FOR [ErrorLogId]
GO

ALTER TABLE [dbo].[ErrorLogs] ADD  CONSTRAINT [DF__ErrorLogs__Occur__31B762FC]  DEFAULT (sysdatetimeoffset()) FOR [OccurredDate]
GO

ALTER TABLE [dbo].[ErrorLogs] ADD  CONSTRAINT [DF__ErrorLogs__IsRes__32AB8735]  DEFAULT ((0)) FOR [IsResolved]
GO

