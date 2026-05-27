USE [master];
GO

IF DB_ID(N'KanbanDb') IS NULL
BEGIN
    CREATE DATABASE [KanbanDb];
END;
GO

USE [KanbanDb];
GO

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

IF NOT EXISTS (SELECT * FROM [__EFMigrationsHistory] WHERE [MigrationId] = N'20260514072428_InitialCreate')
BEGIN
    CREATE TABLE [Users] (
        [Id] int NOT NULL IDENTITY,
        [FullName] nvarchar(160) NOT NULL,
        [UserName] nvarchar(80) NOT NULL,
        [Email] nvarchar(160) NOT NULL,
        [PasswordHash] nvarchar(max) NOT NULL,
        [AvatarUrl] nvarchar(max) NULL,
        [Department] nvarchar(120) NULL,
        [IsSystemAdmin] bit NOT NULL,
        [JobTitle] nvarchar(120) NULL,
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
        [IsDone] bit NOT NULL DEFAULT CAST(0 AS bit),
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
        [CompletedAt] datetime2 NULL,
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
END;

COMMIT;
GO

IF COL_LENGTH(N'Users', N'Department') IS NULL
BEGIN
    ALTER TABLE [Users] ADD [Department] nvarchar(120) NULL;
END;
GO

IF COL_LENGTH(N'Users', N'IsSystemAdmin') IS NULL
BEGIN
    ALTER TABLE [Users] ADD [IsSystemAdmin] bit NOT NULL CONSTRAINT [DF_Users_IsSystemAdmin] DEFAULT CAST(0 AS bit);
END;
GO

IF COL_LENGTH(N'Users', N'JobTitle') IS NULL
BEGIN
    ALTER TABLE [Users] ADD [JobTitle] nvarchar(120) NULL;
END;
GO

IF NOT EXISTS (SELECT 1 FROM [__EFMigrationsHistory] WHERE [MigrationId] = N'20260514084132_AddSystemAdminUserManagement')
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260514084132_AddSystemAdminUserManagement', N'10.0.8');
END;
GO

IF OBJECT_ID(N'[BoardChatMessages]') IS NULL
BEGIN
    CREATE TABLE [BoardChatMessages] (
        [Id] int NOT NULL IDENTITY,
        [BoardId] int NOT NULL,
        [UserId] int NOT NULL,
        [Content] nvarchar(2000) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [EditedAt] datetime2 NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_BoardChatMessages] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_BoardChatMessages_Boards_BoardId] FOREIGN KEY ([BoardId]) REFERENCES [Boards] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_BoardChatMessages_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_BoardChatMessages_BoardId' AND object_id = OBJECT_ID(N'[BoardChatMessages]'))
    CREATE INDEX [IX_BoardChatMessages_BoardId] ON [BoardChatMessages] ([BoardId]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_BoardChatMessages_UserId' AND object_id = OBJECT_ID(N'[BoardChatMessages]'))
    CREATE INDEX [IX_BoardChatMessages_UserId] ON [BoardChatMessages] ([UserId]);
GO

IF NOT EXISTS (SELECT 1 FROM [__EFMigrationsHistory] WHERE [MigrationId] = N'20260523111852_AddBoardChatRealtime')
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260523111852_AddBoardChatRealtime', N'9.0.8');
END;
GO

IF OBJECT_ID(N'[DirectMessages]') IS NULL
BEGIN
    CREATE TABLE [DirectMessages] (
        [Id] int NOT NULL IDENTITY,
        [SenderId] int NOT NULL,
        [RecipientId] int NOT NULL,
        [Content] nvarchar(2000) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [ReadAt] datetime2 NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_DirectMessages] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_DirectMessages_Users_RecipientId] FOREIGN KEY ([RecipientId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_DirectMessages_Users_SenderId] FOREIGN KEY ([SenderId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_DirectMessages_RecipientId' AND object_id = OBJECT_ID(N'[DirectMessages]'))
    CREATE INDEX [IX_DirectMessages_RecipientId] ON [DirectMessages] ([RecipientId]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_DirectMessages_SenderId' AND object_id = OBJECT_ID(N'[DirectMessages]'))
    CREATE INDEX [IX_DirectMessages_SenderId] ON [DirectMessages] ([SenderId]);
GO

IF NOT EXISTS (SELECT 1 FROM [__EFMigrationsHistory] WHERE [MigrationId] = N'20260523122302_AddDirectUserChat')
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260523122302_AddDirectUserChat', N'9.0.8');
END;
GO

IF COL_LENGTH(N'BoardColumns', N'IsDone') IS NULL
BEGIN
    ALTER TABLE [BoardColumns] ADD [IsDone] bit NOT NULL CONSTRAINT [DF_BoardColumns_IsDone] DEFAULT CAST(0 AS bit);
END;
GO


IF NOT EXISTS (SELECT 1 FROM [__EFMigrationsHistory] WHERE [MigrationId] = N'20260525130000_AddColumnCompletionFlag')
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260525130000_AddColumnCompletionFlag', N'9.0.8');
END;
GO

IF NOT EXISTS (SELECT 1 FROM [__EFMigrationsHistory] WHERE [MigrationId] = N'20260525143000_EnforceDefaultDoneColumn')
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'UX_BoardColumns_OneDoneColumn' AND object_id = OBJECT_ID(N'[BoardColumns]'))
    BEGIN
        DROP INDEX [UX_BoardColumns_OneDoneColumn] ON [BoardColumns];
    END;

    DECLARE @DoneCandidates TABLE ([Id] int NOT NULL, [Rank] int NOT NULL);
    INSERT INTO @DoneCandidates ([Id], [Rank])
    SELECT
        [Id],
        ROW_NUMBER() OVER (
            PARTITION BY [BoardId]
            ORDER BY
                CASE WHEN [IsDone] = CAST(1 AS bit) THEN 0 ELSE 1 END,
                [Position],
                [Id]
        ) AS [Rank]
    FROM [BoardColumns]
    WHERE [IsDone] = CAST(1 AS bit)
       OR LOWER([Name]) LIKE N'%done%'
       OR LOWER([Name]) LIKE N'%complete%'
       OR LOWER([Name]) LIKE N'%finished%'
       OR LOWER([Name]) LIKE N'%xong%'
       OR LOWER([Name]) COLLATE Latin1_General_100_CI_AI LIKE N'%hoan thanh%';

    UPDATE [BoardColumns] SET [IsDone] = CAST(0 AS bit);

    UPDATE c
    SET [IsDone] = CAST(1 AS bit)
    FROM [BoardColumns] c
    INNER JOIN @DoneCandidates candidate ON candidate.[Id] = c.[Id]
    WHERE candidate.[Rank] = 1;

    INSERT INTO [BoardColumns] ([BoardId], [Name], [Position], [WipLimit], [IsDone], [CreatedAt], [UpdatedAt])
    SELECT
        b.[Id],
        N'Done',
        COALESCE(MAX(c.[Position]), 0) + 1,
        NULL,
        CAST(1 AS bit),
        SYSUTCDATETIME(),
        NULL
    FROM [Boards] b
    LEFT JOIN [BoardColumns] c ON c.[BoardId] = b.[Id]
    GROUP BY b.[Id]
    HAVING SUM(CASE WHEN c.[IsDone] = CAST(1 AS bit) THEN 1 ELSE 0 END) = 0;

    CREATE UNIQUE INDEX [UX_BoardColumns_OneDoneColumn]
    ON [BoardColumns] ([BoardId])
    WHERE [IsDone] = CAST(1 AS bit);

    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260525143000_EnforceDefaultDoneColumn', N'9.0.8');
END;
GO

IF NOT EXISTS (SELECT 1 FROM [__EFMigrationsHistory] WHERE [MigrationId] = N'20260525144500_LockDoneColumnName')
BEGIN
    IF COL_LENGTH(N'BoardColumns', N'IsDone') IS NOT NULL
    BEGIN
        UPDATE [BoardColumns]
        SET [Name] = N'Done'
        WHERE [IsDone] = CAST(1 AS bit);
    END;

    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260525144500_LockDoneColumnName', N'9.0.8');
END;
GO

IF NOT EXISTS (SELECT 1 FROM [__EFMigrationsHistory] WHERE [MigrationId] = N'20260525150000_AddCardCompletionBusinessState')
BEGIN
    IF COL_LENGTH(N'Cards', N'CompletedAt') IS NULL
    BEGIN
        ALTER TABLE [Cards] ADD [CompletedAt] datetime2 NULL;
    END;

    IF COL_LENGTH(N'Cards', N'CompletedAt') IS NOT NULL
        AND COL_LENGTH(N'BoardColumns', N'IsDone') IS NOT NULL
    BEGIN
        EXEC(N'
            UPDATE c
            SET [CompletedAt] = COALESCE(c.[UpdatedAt], c.[CreatedAt], SYSUTCDATETIME())
            FROM [Cards] c
            INNER JOIN [BoardColumns] bc ON bc.[Id] = c.[ColumnId]
            WHERE bc.[IsDone] = CAST(1 AS bit)
                AND c.[CompletedAt] IS NULL;
        ');

        EXEC(N'
            UPDATE c
            SET [CompletedAt] = NULL
            FROM [Cards] c
            INNER JOIN [BoardColumns] bc ON bc.[Id] = c.[ColumnId]
            WHERE bc.[IsDone] = CAST(0 AS bit)
                AND c.[CompletedAt] IS NOT NULL;
        ');
    END;

    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260525150000_AddCardCompletionBusinessState', N'9.0.8');
END;
GO

DECLARE @Now datetime2 = SYSUTCDATETIME();
DECLARE @AdminId int;
DECLARE @BoardId int;
DECLARE @TodoColumnId int;
DECLARE @ProgressColumnId int;
DECLARE @DoneColumnId int;
DECLARE @Card1Id int;
DECLARE @Card2Id int;
DECLARE @Card3Id int;

IF NOT EXISTS (SELECT 1 FROM [Users] WHERE [Email] = N'admin@kanban.com')
BEGIN
    INSERT INTO [Users] ([FullName], [UserName], [Email], [PasswordHash], [AvatarUrl], [Department], [IsSystemAdmin], [JobTitle], [CreatedAt], [UpdatedAt], [IsActive])
    VALUES (
        N'Kanban Admin',
        N'admin',
        N'admin@kanban.com',
        N'$2a$11$RAyfCDHbV5F52sc5JbaVSOEuDOBHzw3wYlXQ5G3x1Uer8NygXnPHm',
        NULL,
        N'Operations',
        1,
        N'System Administrator',
        @Now,
        NULL,
        1
    );
END;

UPDATE [Users]
SET
    [IsSystemAdmin] = 1,
    [IsActive] = 1,
    [Department] = COALESCE([Department], N'Operations'),
    [JobTitle] = COALESCE([JobTitle], N'System Administrator')
WHERE [Email] = N'admin@kanban.com';

SELECT @AdminId = [Id] FROM [Users] WHERE [Email] = N'admin@kanban.com';

IF NOT EXISTS (SELECT 1 FROM [Boards] WHERE [Name] = N'Website Kanban Project' AND [OwnerId] = @AdminId)
BEGIN
    INSERT INTO [Boards] ([Name], [Description], [OwnerId], [IsPublic], [CreatedAt], [UpdatedAt])
    VALUES (
        N'Website Kanban Project',
        N'Board máº«u Ä‘á»ƒ test kĂ©o tháº£, checklist, comment vĂ  report.',
        @AdminId,
        0,
        @Now,
        NULL
    );
END;

SELECT @BoardId = [Id] FROM [Boards] WHERE [Name] = N'Website Kanban Project' AND [OwnerId] = @AdminId;

IF NOT EXISTS (SELECT 1 FROM [BoardMembers] WHERE [BoardId] = @BoardId AND [UserId] = @AdminId)
BEGIN
    INSERT INTO [BoardMembers] ([BoardId], [UserId], [Role], [JoinedAt])
    VALUES (@BoardId, @AdminId, N'Owner', @Now);
END;

IF NOT EXISTS (SELECT 1 FROM [BoardColumns] WHERE [BoardId] = @BoardId AND [Name] = N'Todo')
BEGIN
    INSERT INTO [BoardColumns] ([BoardId], [Name], [Position], [WipLimit], [IsDone], [CreatedAt], [UpdatedAt])
    VALUES (@BoardId, N'Todo', 1, 5, 0, @Now, NULL);
END;

IF NOT EXISTS (SELECT 1 FROM [BoardColumns] WHERE [BoardId] = @BoardId AND [Name] = N'In Progress')
BEGIN
    INSERT INTO [BoardColumns] ([BoardId], [Name], [Position], [WipLimit], [IsDone], [CreatedAt], [UpdatedAt])
    VALUES (@BoardId, N'In Progress', 2, 3, 0, @Now, NULL);
END;

IF NOT EXISTS (SELECT 1 FROM [BoardColumns] WHERE [BoardId] = @BoardId AND [Name] = N'Done')
BEGIN
    INSERT INTO [BoardColumns] ([BoardId], [Name], [Position], [WipLimit], [IsDone], [CreatedAt], [UpdatedAt])
    VALUES (@BoardId, N'Done', 3, NULL, 1, @Now, NULL);
END;

SELECT @TodoColumnId = [Id] FROM [BoardColumns] WHERE [BoardId] = @BoardId AND [Name] = N'Todo';
SELECT @ProgressColumnId = [Id] FROM [BoardColumns] WHERE [BoardId] = @BoardId AND [Name] = N'In Progress';
SELECT @DoneColumnId = [Id] FROM [BoardColumns] WHERE [BoardId] = @BoardId AND [Name] = N'Done';

IF NOT EXISTS (SELECT 1 FROM [Cards] WHERE [BoardId] = @BoardId AND [Title] = N'Thiáº¿t káº¿ giao diá»‡n dashboard')
BEGIN
    INSERT INTO [Cards] ([ColumnId], [BoardId], [Title], [Description], [AssigneeId], [Priority], [DueDate], [Position], [IsArchived], [CreatedById], [CreatedAt], [UpdatedAt])
    VALUES (@TodoColumnId, @BoardId, N'Thiáº¿t káº¿ giao diá»‡n dashboard', N'Táº¡o layout sidebar, header vĂ  danh sĂ¡ch board.', @AdminId, N'High', DATEADD(DAY, 3, @Now), 1, 0, @AdminId, @Now, NULL);
END;

IF NOT EXISTS (SELECT 1 FROM [Cards] WHERE [BoardId] = @BoardId AND [Title] = N'XĂ¢y dá»±ng API táº¡o card')
BEGIN
    INSERT INTO [Cards] ([ColumnId], [BoardId], [Title], [Description], [AssigneeId], [Priority], [DueDate], [Position], [IsArchived], [CreatedById], [CreatedAt], [UpdatedAt])
    VALUES (@ProgressColumnId, @BoardId, N'XĂ¢y dá»±ng API táº¡o card', N'Controller vĂ  service cho card CRUD.', @AdminId, N'Medium', DATEADD(DAY, 5, @Now), 1, 0, @AdminId, @Now, NULL);
END;

IF NOT EXISTS (SELECT 1 FROM [Cards] WHERE [BoardId] = @BoardId AND [Title] = N'Khá»Ÿi táº¡o database Code First')
BEGIN
    INSERT INTO [Cards] ([ColumnId], [BoardId], [Title], [Description], [AssigneeId], [Priority], [DueDate], [Position], [IsArchived], [CreatedById], [CreatedAt], [UpdatedAt])
    VALUES (@DoneColumnId, @BoardId, N'Khá»Ÿi táº¡o database Code First', N'Models, DbContext vĂ  migration Ä‘áº§u tiĂªn.', @AdminId, N'Low', NULL, 1, 0, @AdminId, @Now, NULL);
END;

SELECT @Card1Id = [Id] FROM [Cards] WHERE [BoardId] = @BoardId AND [Title] = N'Thiáº¿t káº¿ giao diá»‡n dashboard';
SELECT @Card2Id = [Id] FROM [Cards] WHERE [BoardId] = @BoardId AND [Title] = N'XĂ¢y dá»±ng API táº¡o card';
SELECT @Card3Id = [Id] FROM [Cards] WHERE [BoardId] = @BoardId AND [Title] = N'Khá»Ÿi táº¡o database Code First';

UPDATE [Cards]
SET [CompletedAt] = COALESCE([CompletedAt], @Now)
WHERE [Id] = @Card3Id AND [ColumnId] = @DoneColumnId;

IF NOT EXISTS (SELECT 1 FROM [CardLabels] WHERE [CardId] = @Card1Id AND [Name] = N'Frontend')
    INSERT INTO [CardLabels] ([CardId], [Name], [Color]) VALUES (@Card1Id, N'Frontend', N'#2563eb');

IF NOT EXISTS (SELECT 1 FROM [CardLabels] WHERE [CardId] = @Card2Id AND [Name] = N'Backend')
    INSERT INTO [CardLabels] ([CardId], [Name], [Color]) VALUES (@Card2Id, N'Backend', N'#16a34a');

IF NOT EXISTS (SELECT 1 FROM [CardLabels] WHERE [CardId] = @Card3Id AND [Name] = N'Database')
    INSERT INTO [CardLabels] ([CardId], [Name], [Color]) VALUES (@Card3Id, N'Database', N'#f97316');

IF NOT EXISTS (SELECT 1 FROM [ChecklistItems] WHERE [CardId] = @Card1Id AND [Content] = N'Táº¡o route dashboard')
    INSERT INTO [ChecklistItems] ([CardId], [Content], [IsCompleted], [Position], [CreatedAt]) VALUES (@Card1Id, N'Táº¡o route dashboard', 0, 1, @Now);

IF NOT EXISTS (SELECT 1 FROM [ChecklistItems] WHERE [CardId] = @Card1Id AND [Content] = N'Hiá»ƒn thá»‹ board cards')
    INSERT INTO [ChecklistItems] ([CardId], [Content], [IsCompleted], [Position], [CreatedAt]) VALUES (@Card1Id, N'Hiá»ƒn thá»‹ board cards', 0, 2, @Now);

IF NOT EXISTS (SELECT 1 FROM [ChecklistItems] WHERE [CardId] = @Card3Id AND [Content] = N'Táº¡o AppDbContext')
    INSERT INTO [ChecklistItems] ([CardId], [Content], [IsCompleted], [Position], [CreatedAt]) VALUES (@Card3Id, N'Táº¡o AppDbContext', 1, 1, @Now);

IF NOT EXISTS (SELECT 1 FROM [Comments] WHERE [CardId] = @Card2Id AND [Content] = N'API card Ä‘Ă£ sáºµn sĂ ng Ä‘á»ƒ test vá»›i Swagger.')
    INSERT INTO [Comments] ([CardId], [UserId], [Content], [CreatedAt], [UpdatedAt]) VALUES (@Card2Id, @AdminId, N'API card Ä‘Ă£ sáºµn sĂ ng Ä‘á»ƒ test vá»›i Swagger.', @Now, NULL);

IF NOT EXISTS (SELECT 1 FROM [ActivityLogs] WHERE [BoardId] = @BoardId AND [Action] = N'Seed')
    INSERT INTO [ActivityLogs] ([BoardId], [CardId], [UserId], [Action], [Description], [CreatedAt]) VALUES (@BoardId, NULL, @AdminId, N'Seed', N'Táº¡o dá»¯ liá»‡u máº«u ban Ä‘áº§u', @Now);

IF NOT EXISTS (SELECT 1 FROM [Notifications] WHERE [UserId] = @AdminId AND [Type] = N'Welcome')
    INSERT INTO [Notifications] ([UserId], [Title], [Message], [Type], [IsRead], [CreatedAt]) VALUES (@AdminId, N'ChĂ o má»«ng', N'Dá»¯ liá»‡u máº«u Kanban Ä‘Ă£ Ä‘Æ°á»£c táº¡o.', N'Welcome', 0, @Now);
GO
