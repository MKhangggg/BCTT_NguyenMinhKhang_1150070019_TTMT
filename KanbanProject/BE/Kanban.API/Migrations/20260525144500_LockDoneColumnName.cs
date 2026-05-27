using Kanban.API.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Kanban.API.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260525144500_LockDoneColumnName")]
    public partial class LockDoneColumnName : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF COL_LENGTH(N'BoardColumns', N'IsDone') IS NOT NULL
                BEGIN
                    UPDATE [BoardColumns]
                    SET [Name] = N'Done'
                    WHERE [IsDone] = CAST(1 AS bit);
                END;
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
