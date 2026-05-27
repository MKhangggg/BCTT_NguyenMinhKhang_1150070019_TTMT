using Kanban.API.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Kanban.API.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260525143000_EnforceDefaultDoneColumn")]
    public partial class EnforceDefaultDoneColumn : Migration
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
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'UX_BoardColumns_OneDoneColumn' AND object_id = OBJECT_ID(N'[BoardColumns]'))
                BEGIN
                    DROP INDEX [UX_BoardColumns_OneDoneColumn] ON [BoardColumns];
                END;
                """);
        }
    }
}
