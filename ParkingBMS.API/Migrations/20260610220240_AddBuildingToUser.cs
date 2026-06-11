using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ParkingBMS.API.Migrations
{
    /// <inheritdoc />
    public partial class AddBuildingToUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "BuildingId",
                table: "AppUsers",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_AppUsers_BuildingId",
                table: "AppUsers",
                column: "BuildingId");

            migrationBuilder.AddForeignKey(
                name: "FK_AppUsers_ParkingBuildings_BuildingId",
                table: "AppUsers",
                column: "BuildingId",
                principalTable: "ParkingBuildings",
                principalColumn: "BuildingId",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AppUsers_ParkingBuildings_BuildingId",
                table: "AppUsers");

            migrationBuilder.DropIndex(
                name: "IX_AppUsers_BuildingId",
                table: "AppUsers");

            migrationBuilder.DropColumn(
                name: "BuildingId",
                table: "AppUsers");
        }
    }
}
