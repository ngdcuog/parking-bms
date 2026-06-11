using System;
using ParkingBMS.API.Enums;

namespace ParkingBMS.API.DTOs.Tariffs
{
    public class CreateTariffRequest
    {
        public VehicleType VehicleType { get; set; }
        public decimal PricePerHour { get; set; }
        public decimal PeakHourRate { get; set; } = 1.0m;
        public TimeSpan? PeakStartTime { get; set; }
        public TimeSpan? PeakEndTime { get; set; }
        public decimal? DailyMaxFee { get; set; }
        public decimal LostTicketFee { get; set; } = 50000m;
        public short? OvertimeHourThreshold { get; set; }
        public decimal? OvertimeFeeRate { get; set; }
        public DateTime EffectiveFrom { get; set; }
    }

    public class UpdateTariffRequest
    {
        public bool IsActive { get; set; }
    }

    public class TariffDTO
    {
        public int TariffId { get; set; }
        public VehicleType VehicleType { get; set; }
        public decimal PricePerHour { get; set; }
        public decimal PeakHourRate { get; set; }
        public TimeSpan? PeakStartTime { get; set; }
        public TimeSpan? PeakEndTime { get; set; }
        public decimal? DailyMaxFee { get; set; }
        public decimal LostTicketFee { get; set; }
        public short? OvertimeHourThreshold { get; set; }
        public decimal? OvertimeFeeRate { get; set; }
        public DateTime EffectiveFrom { get; set; }
        public bool IsActive { get; set; }
    }
}
