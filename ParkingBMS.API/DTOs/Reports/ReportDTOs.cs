using System.Collections.Generic;
using ParkingBMS.API.Enums;

namespace ParkingBMS.API.DTOs.Reports
{
    public class DashboardSummaryDTO
    {
        public decimal TodayRevenue { get; set; }
        public int TodaySessions { get; set; }
        public decimal CurrentOccupancyPercent { get; set; }
        public int TotalFreeSlots { get; set; }
        public int TotalOccupiedSlots { get; set; }
        public int TotalReservedSlots { get; set; }
        public List<RevenueByVehicleTypeDTO> RevenueByVehicleType { get; set; } = new List<RevenueByVehicleTypeDTO>();
        public List<SlotsByFloorDTO> SlotsByFloor { get; set; } = new List<SlotsByFloorDTO>();
    }

    public class RevenueByVehicleTypeDTO
    {
        public VehicleType VehicleType { get; set; }
        public decimal Revenue { get; set; }
    }

    public class SlotsByFloorDTO
    {
        public int FloorId { get; set; }
        public string FloorName { get; set; } = null!;
        public VehicleType VehicleType { get; set; }
        public int Free { get; set; }
        public int Occupied { get; set; }
        public int Reserved { get; set; }
        public int Maintenance { get; set; }
        public int Locked { get; set; }
        public int Total { get; set; }
        public decimal UtilizationPercent { get; set; }
    }

    public class RevenueReportDTO
    {
        public string Period { get; set; } = null!;
        public decimal TotalRevenue { get; set; }
        public int TotalSessions { get; set; }
        public decimal AvgFee { get; set; }
    }

    public class HourlyTrafficDTO
    {
        public int Hour { get; set; }
        public int CheckInCount { get; set; }
        public int CheckOutCount { get; set; }
    }

    public class SlotUtilizationDTO
    {
        public int FloorId { get; set; }
        public string FloorName { get; set; } = null!;
        public VehicleType VehicleType { get; set; }
        public decimal AvgUtilizationPercent { get; set; }
        public decimal PeakUtilizationPercent { get; set; }
        public int PeakHour { get; set; }
    }

    public class ExceptionsSummaryDTO
    {
        public int Total { get; set; }
        public int LostTicket { get; set; }
        public int WrongPlate { get; set; }
        public int Overstay { get; set; }
        public int WrongZone { get; set; }
        public int Other { get; set; }
    }
}
