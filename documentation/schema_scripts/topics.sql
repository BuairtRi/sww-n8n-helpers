USE [RiN8N]
GO

/****** Object:  Table [dbo].[Topics]    Script Date: 7/25/2025 4:57:03 AM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[Topics](
	[TopicId] [uniqueidentifier] NOT NULL,
	[Topic] [nvarchar](250) NULL,
	[PodcastDuration] [int] NOT NULL,
	[CastopodPodcastId] [nvarchar](100) NULL,
	[CastopodFeedUrl] [nvarchar](500) NULL,
	[DigestPrompt] [nvarchar](max) NULL,
	[PodcastPrompt] [nvarchar](max) NULL,
	[Active] [bit] NOT NULL,
	[ParentTopicId] [uniqueidentifier] NULL,
	[TopicType] [nvarchar](50) NULL,
	[GoogleDriveFolderId] [nvarchar](255) NULL,
	[DigestScheduleCron] [nvarchar](100) NULL,
	[EmailRecipients] [nvarchar](max) NULL,
	[SlackChannelId] [nvarchar](100) NULL,
	[RunResearchBrief] [bit] NOT NULL,
	[PodcasterPersonaId] [uniqueidentifier] NULL,
	[ResearchBriefInternal] [int] NULL,
	[LastResearchBrief] [datetimeoffset](7) NULL,
	[NextResearchBrief] [datetimeoffset](7) NULL,
	[ResearchBriefPrompt] [nvarchar](max) NULL,
 CONSTRAINT [PK_Topics] PRIMARY KEY CLUSTERED 
(
	[TopicId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

ALTER TABLE [dbo].[Topics] ADD  CONSTRAINT [DF_Topics_TopicId]  DEFAULT (newid()) FOR [TopicId]
GO

ALTER TABLE [dbo].[Topics] ADD  DEFAULT ((20)) FOR [PodcastDuration]
GO

ALTER TABLE [dbo].[Topics] ADD  DEFAULT ((1)) FOR [Active]
GO

ALTER TABLE [dbo].[Topics] ADD  DEFAULT ((0)) FOR [RunResearchBrief]
GO

ALTER TABLE [dbo].[Topics]  WITH CHECK ADD  CONSTRAINT [FK_Topics_ParentTopic] FOREIGN KEY([ParentTopicId])
REFERENCES [dbo].[Topics] ([TopicId])
GO

ALTER TABLE [dbo].[Topics] CHECK CONSTRAINT [FK_Topics_ParentTopic]
GO

