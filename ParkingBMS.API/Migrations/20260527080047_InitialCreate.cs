using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ParkingBMS.API.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AppUsers",
                columns: table => new
                {
                    UserId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Username = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Phone = table.Column<string>(type: "nvarchar(15)", maxLength: 15, nullable: true),
                    Role = table.Column<byte>(type: "tinyint", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastLoginAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RefreshTokenHash = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    RefreshTokenExpiry = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RefreshTokenRevoked = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppUsers", x => x.UserId);
                });

            migrationBuilder.CreateTable(
                name: "ParkingBuildings",
                columns: table => new
                {
                    BuildingId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    BuildingName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Address = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    OpenTime = table.Column<TimeSpan>(type: "time", nullable: false),
                    CloseTime = table.Column<TimeSpan>(type: "time", nullable: false),
                    ContactPhone = table.Column<string>(type: "nvarchar(15)", maxLength: 15, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ParkingBuildings", x => x.BuildingId);
                });

            migrationBuilder.CreateTable(
                name: "TariffConfigs",
                columns: table => new
                {
                    TariffId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    VehicleType = table.Column<byte>(type: "tinyint", nullable: false),
                    PricePerHour = table.Column<decimal>(type: "decimal(10,0)", nullable: false),
                    PeakHourRate = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    PeakStartTime = table.Column<TimeSpan>(type: "time", nullable: true),
                    PeakEndTime = table.Column<TimeSpan>(type: "time", nullable: true),
                    DailyMaxFee = table.Column<decimal>(type: "decimal(10,0)", nullable: true),
                    LostTicketFee = table.Column<decimal>(type: "decimal(10,0)", nullable: false),
                    OvertimeHourThreshold = table.Column<short>(type: "smallint", nullable: true),
                    OvertimeFeeRate = table.Column<decimal>(type: "decimal(5,2)", nullable: true),
                    EffectiveFrom = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TariffConfigs", x => x.TariffId);
                });

            migrationBuilder.CreateTable(
                name: "ParkingFloors",
                columns: table => new
                {
                    FloorId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    BuildingId = table.Column<int>(type: "int", nullable: false),
                    FloorName = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    FloorNumber = table.Column<short>(type: "smallint", nullable: false),
                    VehicleType = table.Column<byte>(type: "tinyint", nullable: false),
                    TotalSlots = table.Column<short>(type: "smallint", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ParkingFloors", x => x.FloorId);
                    table.ForeignKey(
                        name: "FK_ParkingFloors_ParkingBuildings_BuildingId",
                        column: x => x.BuildingId,
                        principalTable: "ParkingBuildings",
                        principalColumn: "BuildingId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ParkingSlots",
                columns: table => new
                {
                    SlotId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FloorId = table.Column<int>(type: "int", nullable: false),
                    SlotCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    VehicleType = table.Column<byte>(type: "tinyint", nullable: false),
                    Status = table.Column<byte>(type: "tinyint", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ParkingSlots", x => x.SlotId);
                    table.ForeignKey(
                        name: "FK_ParkingSlots_ParkingFloors_FloorId",
                        column: x => x.FloorId,
                        principalTable: "ParkingFloors",
                        principalColumn: "FloorId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Bookings",
                columns: table => new
                {
                    BookingId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    SlotId = table.Column<int>(type: "int", nullable: false),
                    VehicleType = table.Column<byte>(type: "tinyint", nullable: false),
                    LicensePlate = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    PlannedCheckIn = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PlannedCheckOut = table.Column<DateTime>(type: "datetime2", nullable: false),
                    QRCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Status = table.Column<byte>(type: "tinyint", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpiredAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Bookings", x => x.BookingId);
                    table.ForeignKey(
                        name: "FK_Bookings_AppUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AppUsers",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Bookings_ParkingSlots_SlotId",
                        column: x => x.SlotId,
                        principalTable: "ParkingSlots",
                        principalColumn: "SlotId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ParkingSessions",
                columns: table => new
                {
                    SessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SlotId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: true),
                    BookingId = table.Column<int>(type: "int", nullable: true),
                    LicensePlate = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    VehicleType = table.Column<byte>(type: "tinyint", nullable: false),
                    CheckInTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CheckOutTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Fee = table.Column<decimal>(type: "decimal(12,0)", nullable: true),
                    QRCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    SessionType = table.Column<byte>(type: "tinyint", nullable: false),
                    Status = table.Column<byte>(type: "tinyint", nullable: false),
                    CheckInByStaffId = table.Column<int>(type: "int", nullable: false),
                    CheckOutByStaffId = table.Column<int>(type: "int", nullable: true),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ParkingSessions", x => x.SessionId);
                    table.ForeignKey(
                        name: "FK_ParkingSessions_AppUsers_CheckInByStaffId",
                        column: x => x.CheckInByStaffId,
                        principalTable: "AppUsers",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ParkingSessions_AppUsers_CheckOutByStaffId",
                        column: x => x.CheckOutByStaffId,
                        principalTable: "AppUsers",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ParkingSessions_AppUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AppUsers",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ParkingSessions_Bookings_BookingId",
                        column: x => x.BookingId,
                        principalTable: "Bookings",
                        principalColumn: "BookingId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ParkingSessions_ParkingSlots_SlotId",
                        column: x => x.SlotId,
                        principalTable: "ParkingSlots",
                        principalColumn: "SlotId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ExceptionLogs",
                columns: table => new
                {
                    LogId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    HandledByUserId = table.Column<int>(type: "int", nullable: false),
                    ExceptionType = table.Column<byte>(type: "tinyint", nullable: false),
                    OriginalValue = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    NewValue = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    AdditionalFee = table.Column<decimal>(type: "decimal(10,0)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExceptionLogs", x => x.LogId);
                    table.ForeignKey(
                        name: "FK_ExceptionLogs_AppUsers_HandledByUserId",
                        column: x => x.HandledByUserId,
                        principalTable: "AppUsers",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ExceptionLogs_ParkingSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "ParkingSessions",
                        principalColumn: "SessionId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Payments",
                columns: table => new
                {
                    PaymentId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(12,0)", nullable: false),
                    BaseFee = table.Column<decimal>(type: "decimal(12,0)", nullable: false),
                    PenaltyFee = table.Column<decimal>(type: "decimal(12,0)", nullable: false),
                    PaymentMethod = table.Column<byte>(type: "tinyint", nullable: false),
                    PaidAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReceivedByStaffId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Payments", x => x.PaymentId);
                    table.ForeignKey(
                        name: "FK_Payments_AppUsers_ReceivedByStaffId",
                        column: x => x.ReceivedByStaffId,
                        principalTable: "AppUsers",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Payments_ParkingSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "ParkingSessions",
                        principalColumn: "SessionId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AppUsers_Email",
                table: "AppUsers",
                column: "Email",
                unique: true,
                filter: "[Email] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_AppUsers_Username",
                table: "AppUsers",
                column: "Username",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_SlotId_PlannedCheckIn_PlannedCheckOut",
                table: "Bookings",
                columns: new[] { "SlotId", "PlannedCheckIn", "PlannedCheckOut" });

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_UserId_Status",
                table: "Bookings",
                columns: new[] { "UserId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ExceptionLogs_HandledByUserId",
                table: "ExceptionLogs",
                column: "HandledByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ExceptionLogs_SessionId",
                table: "ExceptionLogs",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_ParkingFloors_BuildingId",
                table: "ParkingFloors",
                column: "BuildingId");

            migrationBuilder.CreateIndex(
                name: "IX_ParkingSessions_BookingId",
                table: "ParkingSessions",
                column: "BookingId");

            migrationBuilder.CreateIndex(
                name: "IX_ParkingSessions_CheckInByStaffId",
                table: "ParkingSessions",
                column: "CheckInByStaffId");

            migrationBuilder.CreateIndex(
                name: "IX_ParkingSessions_CheckInTime",
                table: "ParkingSessions",
                column: "CheckInTime");

            migrationBuilder.CreateIndex(
                name: "IX_ParkingSessions_CheckOutByStaffId",
                table: "ParkingSessions",
                column: "CheckOutByStaffId");

            migrationBuilder.CreateIndex(
                name: "IX_ParkingSessions_LicensePlate_Status",
                table: "ParkingSessions",
                columns: new[] { "LicensePlate", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ParkingSessions_SlotId",
                table: "ParkingSessions",
                column: "SlotId");

            migrationBuilder.CreateIndex(
                name: "IX_ParkingSessions_Status_SlotId",
                table: "ParkingSessions",
                columns: new[] { "Status", "SlotId" });

            migrationBuilder.CreateIndex(
                name: "IX_ParkingSessions_UserId",
                table: "ParkingSessions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ParkingSlots_FloorId_SlotCode",
                table: "ParkingSlots",
                columns: new[] { "FloorId", "SlotCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ParkingSlots_Status_VehicleType",
                table: "ParkingSlots",
                columns: new[] { "Status", "VehicleType" });

            migrationBuilder.CreateIndex(
                name: "IX_Payments_ReceivedByStaffId",
                table: "Payments",
                column: "ReceivedByStaffId");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_SessionId",
                table: "Payments",
                column: "SessionId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ExceptionLogs");

            migrationBuilder.DropTable(
                name: "Payments");

            migrationBuilder.DropTable(
                name: "TariffConfigs");

            migrationBuilder.DropTable(
                name: "ParkingSessions");

            migrationBuilder.DropTable(
                name: "Bookings");

            migrationBuilder.DropTable(
                name: "AppUsers");

            migrationBuilder.DropTable(
                name: "ParkingSlots");

            migrationBuilder.DropTable(
                name: "ParkingFloors");

            migrationBuilder.DropTable(
                name: "ParkingBuildings");
        }
    }
}
