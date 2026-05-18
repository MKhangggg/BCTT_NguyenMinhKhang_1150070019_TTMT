IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
CREATE TABLE [Users] (
    [Id] int NOT NULL IDENTITY,
    [FullName] nvarchar(160) NOT NULL,
    [UserName] nvarchar(80) NOT NULL,
    [Email] nvarchar(160) NOT NULL,
    [PasswordHash] nvarchar(max) NOT NULL,
    [AvatarUrl] nvarchar(max) NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    [IsActive] bit NOT NULL,
    CONSTRAINT [PK_Users] PRIMARY KEY ([Id])
);

CREATE TABLE [Boards] (
    [Id] int NOT NULL IDENTITY,
    [Name] nvarchar(160) NOT NULL,
    [Description] nvarchar(max) NULL,
    [OwnerId] int NOT NULL,
    [IsPublic] bit NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    CONSTRAINT [PK_Boards] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Boards_Users_OwnerId] FOREIGN KEY ([OwnerId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
);

CREATE TABLE [Notifications] (
    [Id] int NOT NULL IDENTITY,
    [UserId] int NOT NULL,
    [Title] nvarchar(160) NOT NULL,
    [Message] nvarchar(max) NOT NULL,
    [Type] nvarchar(60) NOT NULL,
    [IsRead] bit NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_Notifications] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Notifications_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
);

CREATE TABLE [BoardColumns] (
    [Id] int NOT NULL IDENTITY,
    [BoardId] int NOT NULL,
    [Name] nvarchar(120) NOT NULL,
    [Position] int NOT NULL,
    [WipLimit] int NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    CONSTRAINT [PK_BoardColumns] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_BoardColumns_Boards_BoardId] FOREIGN KEY ([BoardId]) REFERENCES [Boards] ([Id]) ON DELETE CASCADE
);

CREATE TABLE [BoardMembers] (
    [Id] int NOT NULL IDENTITY,
    [BoardId] int NOT NULL,
    [UserId] int NOT NULL,
    [Role] nvarchar(30) NOT NULL,
    [JoinedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_BoardMembers] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_BoardMembers_Boards_BoardId] FOREIGN KEY ([BoardId]) REFERENCES [Boards] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_BoardMembers_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
);

CREATE TABLE [Cards] (
    [Id] int NOT NULL IDENTITY,
    [ColumnId] int NOT NULL,
    [BoardId] int NOT NULL,
    [Title] nvarchar(220) NOT NULL,
    [Description] nvarchar(max) NULL,
    [AssigneeId] int NULL,
    [Priority] nvarchar(30) NOT NULL,
    [DueDate] datetime2 NULL,
    [Position] int NOT NULL,
    [IsArchived] bit NOT NULL,
    [CreatedById] int NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    CONSTRAINT [PK_Cards] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Cards_BoardColumns_ColumnId] FOREIGN KEY ([ColumnId]) REFERENCES [BoardColumns] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_Cards_Boards_BoardId] FOREIGN KEY ([BoardId]) REFERENCES [Boards] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_Cards_Users_AssigneeId] FOREIGN KEY ([AssigneeId]) REFERENCES [Users] ([Id]) ON DELETE SET NULL,
    CONSTRAINT [FK_Cards_Users_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
);

CREATE TABLE [ActivityLogs] (
    [Id] int NOT NULL IDENTITY,
    [BoardId] int NOT NULL,
    [CardId] int NULL,
    [UserId] int NOT NULL,
    [Action] nvarchar(80) NOT NULL,
    [Description] nvarchar(max) NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_ActivityLogs] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_ActivityLogs_Boards_BoardId] FOREIGN KEY ([BoardId]) REFERENCES [Boards] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_ActivityLogs_Cards_CardId] FOREIGN KEY ([CardId]) REFERENCES [Cards] ([Id]),
    CONSTRAINT [FK_ActivityLogs_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
);

CREATE TABLE [CardLabels] (
    [Id] int NOT NULL IDENTITY,
    [CardId] int NOT NULL,
    [Name] nvarchar(80) NOT NULL,
    [Color] nvarchar(20) NOT NULL,
    CONSTRAINT [PK_CardLabels] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_CardLabels_Cards_CardId] FOREIGN KEY ([CardId]) REFERENCES [Cards] ([Id]) ON DELETE CASCADE
);

CREATE TABLE [ChecklistItems] (
    [Id] int NOT NULL IDENTITY,
    [CardId] int NOT NULL,
    [Content] nvarchar(300) NOT NULL,
    [IsCompleted] bit NOT NULL,
    [Position] int NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_ChecklistItems] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_ChecklistItems_Cards_CardId] FOREIGN KEY ([CardId]) REFERENCES [Cards] ([Id]) ON DELETE CASCADE
);

CREATE TABLE [Comments] (
    [Id] int NOT NULL IDENTITY,
    [CardId] int NOT NULL,
    [UserId] int NOT NULL,
    [Content] nvarchar(2000) NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    CONSTRAINT [PK_Comments] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Comments_Cards_CardId] FOREIGN KEY ([CardId]) REFERENCES [Cards] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_Comments_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
);

CREATE INDEX [IX_ActivityLogs_BoardId] ON [ActivityLogs] ([BoardId]);

CREATE INDEX [IX_ActivityLogs_CardId] ON [ActivityLogs] ([CardId]);

CREATE INDEX [IX_ActivityLogs_UserId] ON [ActivityLogs] ([UserId]);

CREATE INDEX [IX_BoardColumns_BoardId] ON [BoardColumns] ([BoardId]);

CREATE UNIQUE INDEX [IX_BoardMembers_BoardId_UserId] ON [BoardMembers] ([BoardId], [UserId]);

CREATE INDEX [IX_BoardMembers_UserId] ON [BoardMembers] ([UserId]);

CREATE INDEX [IX_Boards_OwnerId] ON [Boards] ([OwnerId]);

CREATE INDEX [IX_CardLabels_CardId] ON [CardLabels] ([CardId]);

CREATE INDEX [IX_Cards_AssigneeId] ON [Cards] ([AssigneeId]);

CREATE INDEX [IX_Cards_BoardId] ON [Cards] ([BoardId]);

CREATE INDEX [IX_Cards_ColumnId] ON [Cards] ([ColumnId]);

CREATE INDEX [IX_Cards_CreatedById] ON [Cards] ([CreatedById]);

CREATE INDEX [IX_ChecklistItems_CardId] ON [ChecklistItems] ([CardId]);

CREATE INDEX [IX_Comments_CardId] ON [Comments] ([CardId]);

CREATE INDEX [IX_Comments_UserId] ON [Comments] ([UserId]);

CREATE INDEX [IX_Notifications_UserId] ON [Notifications] ([UserId]);

CREATE UNIQUE INDEX [IX_Users_Email] ON [Users] ([Email]);

CREATE UNIQUE INDEX [IX_Users_UserName] ON [Users] ([UserName]);

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260514072428_InitialCreate', N'10.0.8');

COMMIT;
GO

