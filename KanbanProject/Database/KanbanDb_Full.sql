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
        N'Board mẫu để test kéo thả, checklist, comment và report.',
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
    INSERT INTO [BoardColumns] ([BoardId], [Name], [Position], [WipLimit], [CreatedAt], [UpdatedAt])
    VALUES (@BoardId, N'Todo', 1, 5, @Now, NULL);
END;

IF NOT EXISTS (SELECT 1 FROM [BoardColumns] WHERE [BoardId] = @BoardId AND [Name] = N'In Progress')
BEGIN
    INSERT INTO [BoardColumns] ([BoardId], [Name], [Position], [WipLimit], [CreatedAt], [UpdatedAt])
    VALUES (@BoardId, N'In Progress', 2, 3, @Now, NULL);
END;

IF NOT EXISTS (SELECT 1 FROM [BoardColumns] WHERE [BoardId] = @BoardId AND [Name] = N'Done')
BEGIN
    INSERT INTO [BoardColumns] ([BoardId], [Name], [Position], [WipLimit], [CreatedAt], [UpdatedAt])
    VALUES (@BoardId, N'Done', 3, NULL, @Now, NULL);
END;

SELECT @TodoColumnId = [Id] FROM [BoardColumns] WHERE [BoardId] = @BoardId AND [Name] = N'Todo';
SELECT @ProgressColumnId = [Id] FROM [BoardColumns] WHERE [BoardId] = @BoardId AND [Name] = N'In Progress';
SELECT @DoneColumnId = [Id] FROM [BoardColumns] WHERE [BoardId] = @BoardId AND [Name] = N'Done';

IF NOT EXISTS (SELECT 1 FROM [Cards] WHERE [BoardId] = @BoardId AND [Title] = N'Thiết kế giao diện dashboard')
BEGIN
    INSERT INTO [Cards] ([ColumnId], [BoardId], [Title], [Description], [AssigneeId], [Priority], [DueDate], [Position], [IsArchived], [CreatedById], [CreatedAt], [UpdatedAt])
    VALUES (@TodoColumnId, @BoardId, N'Thiết kế giao diện dashboard', N'Tạo layout sidebar, header và danh sách board.', @AdminId, N'High', DATEADD(DAY, 3, @Now), 1, 0, @AdminId, @Now, NULL);
END;

IF NOT EXISTS (SELECT 1 FROM [Cards] WHERE [BoardId] = @BoardId AND [Title] = N'Xây dựng API tạo card')
BEGIN
    INSERT INTO [Cards] ([ColumnId], [BoardId], [Title], [Description], [AssigneeId], [Priority], [DueDate], [Position], [IsArchived], [CreatedById], [CreatedAt], [UpdatedAt])
    VALUES (@ProgressColumnId, @BoardId, N'Xây dựng API tạo card', N'Controller và service cho card CRUD.', @AdminId, N'Medium', DATEADD(DAY, 5, @Now), 1, 0, @AdminId, @Now, NULL);
END;

IF NOT EXISTS (SELECT 1 FROM [Cards] WHERE [BoardId] = @BoardId AND [Title] = N'Khởi tạo database Code First')
BEGIN
    INSERT INTO [Cards] ([ColumnId], [BoardId], [Title], [Description], [AssigneeId], [Priority], [DueDate], [Position], [IsArchived], [CreatedById], [CreatedAt], [UpdatedAt])
    VALUES (@DoneColumnId, @BoardId, N'Khởi tạo database Code First', N'Models, DbContext và migration đầu tiên.', @AdminId, N'Low', NULL, 1, 0, @AdminId, @Now, NULL);
END;

SELECT @Card1Id = [Id] FROM [Cards] WHERE [BoardId] = @BoardId AND [Title] = N'Thiết kế giao diện dashboard';
SELECT @Card2Id = [Id] FROM [Cards] WHERE [BoardId] = @BoardId AND [Title] = N'Xây dựng API tạo card';
SELECT @Card3Id = [Id] FROM [Cards] WHERE [BoardId] = @BoardId AND [Title] = N'Khởi tạo database Code First';

IF NOT EXISTS (SELECT 1 FROM [CardLabels] WHERE [CardId] = @Card1Id AND [Name] = N'Frontend')
    INSERT INTO [CardLabels] ([CardId], [Name], [Color]) VALUES (@Card1Id, N'Frontend', N'#2563eb');

IF NOT EXISTS (SELECT 1 FROM [CardLabels] WHERE [CardId] = @Card2Id AND [Name] = N'Backend')
    INSERT INTO [CardLabels] ([CardId], [Name], [Color]) VALUES (@Card2Id, N'Backend', N'#16a34a');

IF NOT EXISTS (SELECT 1 FROM [CardLabels] WHERE [CardId] = @Card3Id AND [Name] = N'Database')
    INSERT INTO [CardLabels] ([CardId], [Name], [Color]) VALUES (@Card3Id, N'Database', N'#f97316');

IF NOT EXISTS (SELECT 1 FROM [ChecklistItems] WHERE [CardId] = @Card1Id AND [Content] = N'Tạo route dashboard')
    INSERT INTO [ChecklistItems] ([CardId], [Content], [IsCompleted], [Position], [CreatedAt]) VALUES (@Card1Id, N'Tạo route dashboard', 0, 1, @Now);

IF NOT EXISTS (SELECT 1 FROM [ChecklistItems] WHERE [CardId] = @Card1Id AND [Content] = N'Hiển thị board cards')
    INSERT INTO [ChecklistItems] ([CardId], [Content], [IsCompleted], [Position], [CreatedAt]) VALUES (@Card1Id, N'Hiển thị board cards', 0, 2, @Now);

IF NOT EXISTS (SELECT 1 FROM [ChecklistItems] WHERE [CardId] = @Card3Id AND [Content] = N'Tạo AppDbContext')
    INSERT INTO [ChecklistItems] ([CardId], [Content], [IsCompleted], [Position], [CreatedAt]) VALUES (@Card3Id, N'Tạo AppDbContext', 1, 1, @Now);

IF NOT EXISTS (SELECT 1 FROM [Comments] WHERE [CardId] = @Card2Id AND [Content] = N'API card đã sẵn sàng để test với Swagger.')
    INSERT INTO [Comments] ([CardId], [UserId], [Content], [CreatedAt], [UpdatedAt]) VALUES (@Card2Id, @AdminId, N'API card đã sẵn sàng để test với Swagger.', @Now, NULL);

IF NOT EXISTS (SELECT 1 FROM [ActivityLogs] WHERE [BoardId] = @BoardId AND [Action] = N'Seed')
    INSERT INTO [ActivityLogs] ([BoardId], [CardId], [UserId], [Action], [Description], [CreatedAt]) VALUES (@BoardId, NULL, @AdminId, N'Seed', N'Tạo dữ liệu mẫu ban đầu', @Now);

IF NOT EXISTS (SELECT 1 FROM [Notifications] WHERE [UserId] = @AdminId AND [Type] = N'Welcome')
    INSERT INTO [Notifications] ([UserId], [Title], [Message], [Type], [IsRead], [CreatedAt]) VALUES (@AdminId, N'Chào mừng', N'Dữ liệu mẫu Kanban đã được tạo.', N'Welcome', 0, @Now);
GO
