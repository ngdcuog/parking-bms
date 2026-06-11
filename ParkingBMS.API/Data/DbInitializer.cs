using System;
using System.Collections.Generic;
using System.Linq;
using ParkingBMS.API.Enums;
using ParkingBMS.API.Helpers;
using ParkingBMS.API.Models;

namespace ParkingBMS.API.Data
{
    public static class DbInitializer
    {
        public static void Initialize(AppDbContext context)
        {
            // 1. Seed Accounts
            if (!context.AppUsers.Any())
            {
                var users = new List<AppUser>
                {
                    new AppUser
                    {
                        Username = "admin",
                        PasswordHash = PasswordHelper.HashPassword("Admin@123"),
                        FullName = "System Admin",
                        Role = UserRole.Admin,
                        IsActive = true
                    },
                    new AppUser
                    {
                        Username = "manager1",
                        PasswordHash = PasswordHelper.HashPassword("Manager@123"),
                        FullName = "Nguyễn Văn A",
                        Role = UserRole.Manager,
                        IsActive = true
                    },
                    new AppUser
                    {
                        Username = "staff1",
                        PasswordHash = PasswordHelper.HashPassword("Staff@123"),
                        FullName = "Trần Thị B",
                        Role = UserRole.Staff,
                        IsActive = true
                    },
                    new AppUser
                    {
                        Username = "staff2",
                        PasswordHash = PasswordHelper.HashPassword("Staff@123"),
                        FullName = "Phạm Văn C",
                        Role = UserRole.Staff,
                        IsActive = true
                    },
                    new AppUser
                    {
                        Username = "user1",
                        PasswordHash = PasswordHelper.HashPassword("User@123"),
                        FullName = "Lê Văn D",
                        Email = "user1@test.com",
                        Role = UserRole.ParkingUser,
                        IsActive = true
                    }
                };

                context.AppUsers.AddRange(users);
                context.SaveChanges();
            }

            // 2. Seed Building
            if (!context.ParkingBuildings.Any())
            {
                var building = new ParkingBuilding
                {
                    BuildingName = "Parking Tower A",
                    Address = "123 Nguyễn Văn Linh, Quận 7, TP.HCM",
                    OpenTime = new TimeSpan(6, 0, 0), // 06:00
                    CloseTime = new TimeSpan(22, 0, 0), // 22:00
                    ContactPhone = "02873005588",
                    IsActive = true
                };

                context.ParkingBuildings.Add(building);
                context.SaveChanges();

                // Assign this building to seeded staff users (for demo)
                var staffUsers = context.AppUsers.Where(u => u.Role == UserRole.Staff).ToList();
                foreach (var s in staffUsers)
                {
                    s.BuildingId = building.BuildingId;
                }
                context.SaveChanges();

                // 3. Seed Floors & Slots
                var buildingId = building.BuildingId;

                var floors = new List<ParkingFloor>
                {
                    new ParkingFloor { BuildingId = buildingId, FloorName = "Tầng B1", FloorNumber = -1, VehicleType = VehicleType.Motorbike, TotalSlots = 30, IsActive = true },
                    new ParkingFloor { BuildingId = buildingId, FloorName = "Tầng B2", FloorNumber = -2, VehicleType = VehicleType.Motorbike, TotalSlots = 30, IsActive = true },
                    new ParkingFloor { BuildingId = buildingId, FloorName = "Tầng 1", FloorNumber = 1, VehicleType = VehicleType.Car, TotalSlots = 20, IsActive = true },
                    new ParkingFloor { BuildingId = buildingId, FloorName = "Tầng 2", FloorNumber = 2, VehicleType = VehicleType.Car, TotalSlots = 20, IsActive = true },
                    new ParkingFloor { BuildingId = buildingId, FloorName = "Tầng 3", FloorNumber = 3, VehicleType = VehicleType.Truck, TotalSlots = 10, IsActive = true }
                };

                context.ParkingFloors.AddRange(floors);
                context.SaveChanges();

                // Seed slots for Floor B1 (A01 - A30)
                var floorB1 = floors.First(f => f.FloorName == "Tầng B1");
                for (int i = 1; i <= 30; i++)
                {
                    context.ParkingSlots.Add(new ParkingSlot
                    {
                        FloorId = floorB1.FloorId,
                        SlotCode = $"A{i:D2}",
                        VehicleType = VehicleType.Motorbike,
                        Status = SlotStatus.Free,
                        IsActive = true
                    });
                }

                // Seed slots for Floor B2 (B01 - B30)
                var floorB2 = floors.First(f => f.FloorName == "Tầng B2");
                for (int i = 1; i <= 30; i++)
                {
                    context.ParkingSlots.Add(new ParkingSlot
                    {
                        FloorId = floorB2.FloorId,
                        SlotCode = $"B{i:D2}",
                        VehicleType = VehicleType.Motorbike,
                        Status = SlotStatus.Free,
                        IsActive = true
                    });
                }

                // Seed slots for Floor 1 (C01 - C20)
                var floor1 = floors.First(f => f.FloorName == "Tầng 1");
                for (int i = 1; i <= 20; i++)
                {
                    context.ParkingSlots.Add(new ParkingSlot
                    {
                        FloorId = floor1.FloorId,
                        SlotCode = $"C{i:D2}",
                        VehicleType = VehicleType.Car,
                        Status = SlotStatus.Free,
                        IsActive = true
                    });
                }

                // Seed slots for Floor 2 (D01 - D20)
                var floor2 = floors.First(f => f.FloorName == "Tầng 2");
                for (int i = 1; i <= 20; i++)
                {
                    context.ParkingSlots.Add(new ParkingSlot
                    {
                        FloorId = floor2.FloorId,
                        SlotCode = $"D{i:D2}",
                        VehicleType = VehicleType.Car,
                        Status = SlotStatus.Free,
                        IsActive = true
                    });
                }

                // Seed slots for Floor 3 (E01 - E10)
                var floor3 = floors.First(f => f.FloorName == "Tầng 3");
                for (int i = 1; i <= 10; i++)
                {
                    context.ParkingSlots.Add(new ParkingSlot
                    {
                        FloorId = floor3.FloorId,
                        SlotCode = $"E{i:D2}",
                        VehicleType = VehicleType.Truck,
                        Status = SlotStatus.Free,
                        IsActive = true
                    });
                }

                context.SaveChanges();
            }

            // 4. Seed TariffConfig
            if (!context.TariffConfigs.Any())
            {
                var tariffs = new List<TariffConfig>
                {
                    new TariffConfig
                    {
                        VehicleType = VehicleType.Motorbike,
                        PricePerHour = 4000m, // Day flat rate: 4,000 VNĐ
                        PeakHourRate = 1.5m, // Night rate: 4,000 * 1.5 = 6,000 VNĐ
                        PeakStartTime = new TimeSpan(18, 0, 0), // 18:00
                        PeakEndTime = new TimeSpan(6, 0, 0), // 06:00
                        DailyMaxFee = 50000m, // Overnight fee: 50,000 VNĐ
                        LostTicketFee = 20000m,
                        OvertimeHourThreshold = 24,
                        OvertimeFeeRate = 1.5m,
                        EffectiveFrom = DateTime.UtcNow.AddDays(-30),
                        IsActive = true
                    },
                    new TariffConfig
                    {
                        VehicleType = VehicleType.Car,
                        PricePerHour = 30000m, // Day flat rate: 30,000 VNĐ
                        PeakHourRate = 1.67m, // Night rate: 30,000 * 1.67 = 50,100 -> rounded to 50,000 VNĐ
                        PeakStartTime = new TimeSpan(18, 0, 0), // 18:00
                        PeakEndTime = new TimeSpan(6, 0, 0), // 06:00
                        DailyMaxFee = 200000m, // Overnight fee: 200,000 VNĐ
                        LostTicketFee = 50000m,
                        OvertimeHourThreshold = 24,
                        OvertimeFeeRate = 1.5m,
                        EffectiveFrom = DateTime.UtcNow.AddDays(-30),
                        IsActive = true
                    },
                    new TariffConfig
                    {
                        VehicleType = VehicleType.Truck,
                        PricePerHour = 50000m, // Day flat rate: 50,000 VNĐ
                        PeakHourRate = 1.6m, // Night rate: 50,000 * 1.6 = 80,000 VNĐ
                        PeakStartTime = new TimeSpan(18, 0, 0), // 18:00
                        PeakEndTime = new TimeSpan(6, 0, 0), // 06:00
                        DailyMaxFee = 300000m, // Overnight fee: 300,000 VNĐ
                        LostTicketFee = 100000m,
                        OvertimeHourThreshold = 24,
                        OvertimeFeeRate = 1.5m,
                        EffectiveFrom = DateTime.UtcNow.AddDays(-30),
                        IsActive = true
                    }
                };

                context.TariffConfigs.AddRange(tariffs);
                context.SaveChanges();
            }
        }
    }
}
