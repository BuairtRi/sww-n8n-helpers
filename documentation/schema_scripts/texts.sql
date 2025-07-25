USE [RiN8N]
GO

/****** Object:  Table [dbo].[Texts]    Script Date: 7/25/2025 4:55:21 AM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[Texts](
	[TextId] [uniqueidentifier] NOT NULL,
	[Text] [nvarchar](max) NOT NULL,
	[Created] [datetimeoffset](7) NOT NULL,
	[Type] [nvarchar](50) NOT NULL,
	[TopicsAnalyzed] [bit] NOT NULL,
	[RelatedObjectType] [nvarchar](100) NULL,
	[RelatedEntityId] [nvarchar](50) NULL,
	[RetainUntil] [datetimeoffset](7) NULL,
 CONSTRAINT [PK_Texts] PRIMARY KEY CLUSTERED 
(
	[TextId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

