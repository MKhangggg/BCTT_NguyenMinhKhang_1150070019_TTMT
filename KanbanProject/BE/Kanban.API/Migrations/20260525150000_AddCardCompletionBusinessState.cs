using Kanban.API.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Kanban.API.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260525150000_AddCardCompletionBusinessState")]
    public partial class AddCardCompletionBusinessState : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF COL_LENGTH(N'Cards', N'CompletedAt') IS NULL
                BEGIN
                    ALTER TABLE [Cards] ADD [CompletedAt] datetime2 NULL;
                END;
                """);

            migrationBuilder.Sql(
                """
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
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF COL_LENGTH(N'Cards', N'CompletedAt') IS NOT NULL
                BEGIN
                    ALTER TABLE [Cards] DROP COLUMN [CompletedAt];
                END;
                """);
        }
    }
}
