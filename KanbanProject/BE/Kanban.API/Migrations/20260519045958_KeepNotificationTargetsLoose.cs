using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Kanban.API.Migrations
{
    /// <inheritdoc />
    public partial class KeepNotificationTargetsLoose : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Notifications_Boards_BoardId",
                table: "Notifications");

            migrationBuilder.DropForeignKey(
                name: "FK_Notifications_Cards_CardId",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_BoardId",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_CardId",
                table: "Notifications");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Notifications_BoardId",
                table: "Notifications",
                column: "BoardId");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_CardId",
                table: "Notifications",
                column: "CardId");

            migrationBuilder.AddForeignKey(
                name: "FK_Notifications_Boards_BoardId",
                table: "Notifications",
                column: "BoardId",
                principalTable: "Boards",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Notifications_Cards_CardId",
                table: "Notifications",
                column: "CardId",
                principalTable: "Cards",
                principalColumn: "Id");
        }
    }
}
