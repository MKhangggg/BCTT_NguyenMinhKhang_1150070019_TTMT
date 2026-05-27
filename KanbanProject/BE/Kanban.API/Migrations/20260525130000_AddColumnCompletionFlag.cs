using Kanban.API.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Kanban.API.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260525130000_AddColumnCompletionFlag")]
    public partial class AddColumnCompletionFlag : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF COL_LENGTH(N'BoardColumns', N'IsDone') IS NULL
                BEGIN
                    ALTER TABLE [BoardColumns] ADD [IsDone] bit NOT NULL CONSTRAINT [DF_BoardColumns_IsDone] DEFAULT CAST(0 AS bit);
                END;
                """);

            migrationBuilder.Sql(
                """
                UPDATE [BoardColumns] SET [IsDone] = CAST(0 AS bit);

                ;WITH DoneCandidates AS (
                    SELECT
                        [Id],
                        ROW_NUMBER() OVER (PARTITION BY [BoardId] ORDER BY [Position], [Id]) AS [Rank]
                    FROM [BoardColumns]
                    WHERE LOWER([Name]) LIKE N'%done%'
                       OR LOWER([Name]) LIKE N'%complete%'
                       OR LOWER([Name]) LIKE N'%finished%'
                       OR LOWER([Name]) LIKE N'%xong%'
                       OR LOWER([Name]) LIKE N'%hoan thanh%'
                       OR LOWER([Name]) LIKE N'%hoàn thành%'
                )
                UPDATE c
                SET [IsDone] = CAST(1 AS bit)
                FROM [BoardColumns] c
                INNER JOIN DoneCandidates candidate ON candidate.[Id] = c.[Id]
                WHERE candidate.[Rank] = 1;

                INSERT INTO [BoardColumns] ([BoardId], [Name], [Position], [WipLimit], [IsDone], [CreatedAt], [UpdatedAt])
                SELECT
                    b.[Id],
                    N'Hoàn thành',
                    COALESCE(MAX(c.[Position]), 0) + 1,
                    NULL,
                    CAST(1 AS bit),
                    SYSUTCDATETIME(),
                    NULL
                FROM [Boards] b
                LEFT JOIN [BoardColumns] c ON c.[BoardId] = b.[Id]
                GROUP BY b.[Id]
                HAVING SUM(CASE WHEN c.[IsDone] = CAST(1 AS bit) THEN 1 ELSE 0 END) = 0;
                """);

            migrationBuilder.Sql(
                """
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'UX_BoardColumns_OneDoneColumn' AND object_id = OBJECT_ID(N'[BoardColumns]'))
                BEGIN
                    CREATE UNIQUE INDEX [UX_BoardColumns_OneDoneColumn]
                    ON [BoardColumns] ([BoardId])
                    WHERE [IsDone] = CAST(1 AS bit);
                END;
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF COL_LENGTH(N'BoardColumns', N'IsDone') IS NOT NULL
                BEGIN
                    IF EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'UX_BoardColumns_OneDoneColumn' AND object_id = OBJECT_ID(N'[BoardColumns]'))
                    BEGIN
                        DROP INDEX [UX_BoardColumns_OneDoneColumn] ON [BoardColumns];
                    END;

                    DECLARE @constraintName sysname;
                    SELECT @constraintName = dc.[name]
                    FROM sys.default_constraints dc
                    INNER JOIN sys.columns c ON c.default_object_id = dc.object_id
                    INNER JOIN sys.tables t ON t.object_id = c.object_id
                    WHERE t.[name] = N'BoardColumns' AND c.[name] = N'IsDone';

                    IF @constraintName IS NOT NULL
                    BEGIN
                        EXEC(N'ALTER TABLE [BoardColumns] DROP CONSTRAINT ' + QUOTENAME(@constraintName));
                    END;

                    ALTER TABLE [BoardColumns] DROP COLUMN [IsDone];
                END;
                """);
        }
    }
}
