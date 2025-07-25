USE [RiN8N]
GO

/****** Object:  Table [dbo].[TextTopics]    Script Date: 7/25/2025 4:57:15 AM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[TextTopics](
	[TextTopicId] [uniqueidentifier] NOT NULL,
	[TextId] [uniqueidentifier] NOT NULL,
	[TopicId] [uniqueidentifier] NOT NULL,
 CONSTRAINT [PK_TextTopics] PRIMARY KEY CLUSTERED 
(
	[TextTopicId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

ALTER TABLE [dbo].[TextTopics] ADD  CONSTRAINT [DF_TextTopics_TextTopicId]  DEFAULT (newid()) FOR [TextTopicId]
GO

